const log4js = require('log4js');
const _ = require('lodash');
const logger = log4js.getLogger('Controllers');
const moment = require('moment');
const LeadModel = require('../../../models/LeadModel');
const CampaignModel = require('../../../models/CampaignModel');
const LeadHistoryModel = require('../../../models/LeadHistoryModel');
const LeadPriceScheduleModel = require('../../../models/LeadPriceScheduleModel');
const LeadService = require('./LeadService');
const Validator = require('../../../utils/Validator');
const HTTP_CODE = require('../../../config/http-code');
const LEAD_VALIDATE_SCHEMA = require('./validator-schemas');
const AJV = require('../../../services/AJV');
const {extractPaginationCondition} = require('../../../utils/RequestUtil');
const {post, get, del, put} = require('../../../utils/Request');
const CDP_APIS = require('../../../config/cdp-url-api.constant');
const NotifyController = require('../NotifyController');
const NotifyTypes = require('../../../config/notify-type');
const SocketEvents = require('../../../config/socket-event');
const Socket = require('../../../utils/Socket');
const NotificationService = require('../../../services/NotificationService');

const createLead = async (req, res, next) => {
  logger.info('LeadController::createLead::called');

  try {
    let {
      name, email, phone, referenceDomain, utmSource, utmCampaign, utmMedium, area, price, campaignId,
      bedrooms, bathrooms, street, note, direction
    } = req.body;
    if (!name) {
      return next(new Error('Tên bắt buộc'));
    }

    if (!phone) {
      return next(new Error('Số điện thoại là bắt buộc'));
    }

    if (!Validator.isValidPhoneNumber(phone) || isNaN(phone)) {
      return next(new Error('Số điện thoại không đúng, 10-13 kí tự'));
    }

    if (!referenceDomain) {
      return next(new Error('Không xác định được domain'));
    }

    if (!campaignId) {
      return next(new Error('Không xác định được chiến dịch'));
    }

    let campaign = await CampaignModel.findOne({_id: campaignId});
    if (!campaign) {
      return next(new Error('Không xác định được chiến dịch'));
    }

    const isValidDomain = await LeadService.isValidDomainToCampaign(campaignId, referenceDomain);
    if (!isValidDomain) {
      return next(new Error('Domain không hợp lệ'));
    }

    let isCreatingNewLead = false;
    let lead = await LeadModel.findOne({
      phone,
      campaign: campaignId,
      status: {
        $ne: global.STATUS.LEAD_FINISHED // chỉ khi nào lead đó hoàn toàn thuộc về 1 user (qua thời gian có thể trả
        // lead) thì mới tạo lead mới
      }
    });

    if (!lead) {
      lead = new LeadModel();
      lead.phone = phone;
      lead.campaign = campaignId;
      lead.price = null;
      lead.createdAt = new Date();
      lead.updatedAt = new Date();
      isCreatingNewLead = true;

      if (campaign.isPrivate) {
        lead.user = campaign.user;
      }
    }

    const newLeadHistory = {
      name: name || '',
      email: email || '',
      referenceDomain: referenceDomain,
      utmSource: utmSource || '',
      utmCampaign: utmCampaign || '',
      utmMedium: utmMedium || '',
      area: area || null,
      price: price || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      street: street || '',
      note: note || '',
      direction: direction || null,
      lead: lead._id
    };

    await LeadService.createNewLeadHistory(newLeadHistory);
    await lead.save();
    logger.info('LeadController::createLead::success');

    if (isCreatingNewLead) {
      if (campaign.isPrivate) {
        lead.status = global.STATUS.LEAD_FINISHED;
        await lead.save();
        await NotificationService.notifyNewLeadOfPrivateCampaign(campaign.user);
      } else {
        LeadService.createScheduleDownLeadPrice(lead._id, campaign);
        await NotificationService.notifyNewLeadByCampaign(campaignId);
      }

      logger.info('LeadController::notifyLead::success');
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {}
    });
  } catch (e) {
    logger.error('LeadController::createLead::error', e);
    return next(e);
  }
};

/**
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
const getListLead = async (req, res, next) => {
  logger.info('LeadController::getListLead::called');
  try {
    // TODO: cần confirm lại cách hiển thị lead cho user
    const queryObj = {
      deleteFlag: 0
    };
    const errors = AJV(LEAD_VALIDATE_SCHEMA.LIST, req.query);
    if (errors.length > 0) {
      return next(new Error(errors.join('\n')));
    }

    let {status} = req.query;
    if (!status) {
      queryObj.status = global.STATUS.LEAD_NEW;
    } else {
      status = parseInt(status, 0);
      queryObj.status = status;
      if (status !== global.STATUS.LEAD_NEW) {
        queryObj.user = req.user.id;
      }
    }

    const paginationCond = extractPaginationCondition(req);
    const stages = LeadService.generateStageGetLeads(queryObj, paginationCond);
    logger.info('LeadController::getList stage: ', JSON.stringify(stages));
    const result = await LeadModel.aggregate(stages);
    const totalItems = result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0;
    let entries = result[0].entries.map(item => {
      if (queryObj.status === global.STATUS.LEAD_NEW) {
        item.phone = `${item.phone.slice(0, 3)}*******`;
      }

      if (item.priceSchedule.length !== 0) {
        item.leadPrice = item.priceSchedule[0].price;
        item.timeToDownPrice = item.priceSchedule[0].downPriceAt;
        item.isFinishDownPrice = item.priceSchedule[0].isFinished;
      } else {
        item.leadPrice = item.campaignInfo.leadMaxPrice;
        item.timeToDownPrice = moment().add(item.campaignInfo.downTime, 'minutes');
        item.isFinishDownPrice = false;
      }

      item.location = LeadService.getLeadLocation(item.campaignInfo);
      item.type = LeadService.getTypeOfLead(item.campaignInfo);
      item.createdAt = item.createdAt || new Date(2019, 1, 1);

      if (queryObj.status === global.STATUS.LEAD_FINISHED) {
        item.isPrivate = item.campaignInfo.isPrivate;
        item.boughtAt = item.createdAt;

        if (item.isPrivate) {
          delete item.leadPrice;
          delete item.timeToDownPrice;
          delete item.isFinishDownPrice;
          delete item.price;
        }
      }

      delete item.histories;
      delete item.deleteFlag;
      delete item.user;
      delete item.status;
      delete item.campaign;
      delete item.__v;
      delete item.note;
      delete item.priceSchedule;
      delete item.campaignInfo;

      return item;
    });

    // lead: {typeStr, location (project name, district, city), price, createdAt, timeToDownPrice }
    if (queryObj.status === global.STATUS.LEAD_RETURNING) {
      entries = await LeadService.findReasonOfReturningLeads(req.user.id, entries);
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {
        meta: {
          currentItemsCount: entries.length,
          totalItems,
          limit: paginationCond.limit,
          page: paginationCond.page
        },
        entries: entries
      }
    });
  } catch (e) {
    logger.error('LeadController::getListLead::error', e);
    return next(e);
  }
};

const buyLead = async (req, res, next) => {
  logger.info('LeadController::buyLead::called');
  /* Step - This code trust demo how implement transaction in mongoose
  * 1. Check balance info (call to CDP apis)
  * 2. Commit buy lead
  * 3. Charge balance by buying lead (call to CDP apis)
  * */
  let session = null;
  try {
    // get user balance
    const userInfo = (await get(CDP_APIS.USER.INFO, req.user.token)).data.entries[0];
    const balance = userInfo.balance;
    // start session
    session = await LeadModel.createCollection()
      .then(() => LeadModel.startSession());

    session.startTransaction();
    // step 1 get lead
    const lead = await LeadModel.findOne({_id: req.body.leadId}).session(session);
    lead.$session();
    if (!lead) throw new Error('Không tìm thấy thông tin');

    const campaign = await CampaignModel.findOne({_id: lead.campaign});
    if (!campaign) {
      throw new Error('Không tìm thấy thông tin');
    }

    if (campaign.isPrivate) {
      throw new Error('Thao tác không hợp lệ');
    }

    if (!_.isNil(lead.user)) throw new Error('Thông tin này đã được mua');

    // step 2 get current price and check with balance
    const currentPrice = await LeadService.getCurrentLeadPrice(lead._id);
    const totalBalance = balance.main1 + balance.main2 + balance.promo + balance.credit;
    if (totalBalance < currentPrice) throw new Error("Số dư tài khoản không đủ");

    // step 3 buy lead, change balance of user + update lead
    await LeadService.chargeBalanceByBuyingLead(lead._id, currentPrice, req.user.token);
    lead.user = req.user.id;
    lead.price = currentPrice;
    lead.boughtAt = new Date();
    lead.status = global.STATUS.LEAD_SOLD;
    await lead.save();
    await LeadService.finishScheduleDownPrice(lead._id, session);
    session.commitTransaction();

    logger.info(`LeadController::buyLead::success. ${req.user.id} buy lead ${lead._id} at ${lead.boughtAt}`);
    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Mua thành công lead',
      data: {}
    });
  } catch (e) {
    session.abortTransaction();
    logger.error('LeadController::buyLead::error', e);
    return next(e);
  }
};

const refundLead = async (req, res, next) => {
  logger.info('LeadController::refundLead::called');
  let session = null;
  try {
    // start session
    session = await LeadModel.createCollection().then(() => LeadModel.startSession());
    session.startTransaction();

    const userInfo = (await get(CDP_APIS.USER.INFO, req.user.token)).data.entries[0];
    const lead = await LeadModel.findOne({_id: req.body.leadId}).session(session);
    lead.$session();

    if (!lead) throw new Error('Không tìm thấy lead');
    if (_.isNil(lead.boughtAt)) throw new Error('Lead chưa được mua');
    if (!_.isEqual(lead.user, userInfo.id)) throw new Error('Lead không thuộc sở hữu của bạn');

    const campaign = await CampaignModel.findOne({_id: lead.campaign});
    if (!campaign) {
      logger.error(`LeadController::refundLead::error. Campaign not found. lead id ${lead._id}, campaign id ${lead.campaign}`);
      throw new Error('Thao tác không hợp lệ');
    }

    if (campaign.isPrivate) {
      logger.error(`LeadController::refundLead::error. Campaign is private so cannot return lead of this campaign. lead id ${lead._id}, campaign id ${lead.campaign}`);
      throw new Error('Thao tác không hợp lệ');
    }

    if (_.isEqual(lead.status, global.STATUS.LEAD_SOLD)) {
      // Update lead status
      lead.status = global.STATUS.LEAD_RETURNING;
      lead.updatedAt = new Date();
      await lead.save();

      // create notiry
      const leadHistory = await LeadHistoryModel.find({lead: lead._id}).sort({createdAt: 1}).session(session);
      if (leadHistory.length === 0) {
        logger.warn('LeadController::refundLead::lead history not found. lead id', lead._id);
      }

      const newestHistory = leadHistory[0] || {};
      const notifyParams = {
        fromUserId: userInfo.id,
        toUserId: null,
        title: `<${userInfo.email}> muốn trả lead <${lead.phone}>`,
        content: req.body.reason,
        type: NotifyTypes.USER_WANT_TO_RETURN_LEAD,
        params: {
          lead: {
            id: lead._id,
            phone: lead.phone,
            email: newestHistory.email || '',
            name: newestHistory.name || ''
          }
        }
      };
      await NotifyController.createNotifySession(notifyParams, session);

      session.commitTransaction();

      // send socket
      notifyParams.toUserIds = [notifyParams.toUserId];
      delete notifyParams.toUserId;
      Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
      logger.info('SaleController::add::success. Create post sale successfully');

      return res.json({
        status: HTTP_CODE.SUCCESS,
        message: 'Đã nhận yêu cầu trả lead',
        data: {}
      });
    }

    throw new Error('Lead này không trả được');
  } catch (e) {
    session.abortTransaction();
    logger.error('LeadController::refundLead::error', e);
    return next(e);
  }
};

const getDetailLead = async (req, res, next) => {
  logger.info('LeadController::getDetailLead::called');
  try {
    let id = req.params.id;
    if (!id || id.length === 0) {
      return next(new Error('Id lead không hợp lệ'));
    }

    let lead = await LeadModel.findOne({_id: id}).lean();
    if (!lead) {
      return next(new Error('Không tìm thấy lead'));
    }

    const campaignOfLead = await CampaignModel.findOne({_id: lead.campaign}).lean();
    const leadPriceSchedule = await LeadPriceScheduleModel.findOne({lead: id}).lean();
    const leadHistory = await LeadHistoryModel.find({lead: id}).sort({createdAt: 1});
    if (leadHistory.length === 0) {
      logger.warn('LeadController::refundLead::lead history not found. lead id', id);
    }
    const newestLeadHistory = leadHistory[0] || {};

    let result = {
      _id: lead._id,
      createdAt: newestLeadHistory.createdAt || null,
      bedrooms: newestLeadHistory.bedrooms || null,
      bathrooms: newestLeadHistory.bathrooms || null,
      name: newestLeadHistory.name,
      area: newestLeadHistory.area,
      price: newestLeadHistory.price,
      street: newestLeadHistory.street,
      direction: newestLeadHistory.direction,
      location: LeadService.getLeadLocation(campaignOfLead),
      leadPrice: leadPriceSchedule.price,
      status: lead.status,
      timeToDownPrice: leadPriceSchedule.downPriceAt,
      type: LeadService.getTypeOfLead(campaignOfLead),
    };

    if ([global.STATUS.LEAD_SOLD, global.STATUS.LEAD_FINISHED, global.STATUS.LEAD_RETURNING].includes(lead.status)) {
      if (lead.user !== req.user.id) {
        return next(new Error('Bạn không được quyền coi lead này'));
      }

      result.phone = lead.phone;
      result.email = lead.email;
      result.address = newestLeadHistory.address || '';
      result.boughtAt = lead.boughtAt;
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: result,
    });
  } catch (error) {
    logger.error('LeadController::getDetailLead::error', error);
    return next(error);
  }
};

module.exports = {
  createLead,
  getListLead,
  buyLead,
  refundLead,
  getDetailLead
};
