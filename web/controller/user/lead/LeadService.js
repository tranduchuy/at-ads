const CampaignModel = require('../../../models/CampaignModel');
const LeadHistoryModel = require('../../../models/LeadHistoryModel');
const LeadPriceScheduleModel = require('../../../models/LeadPriceScheduleModel');
const NotifyModel = require('../../../models/Notify');
const mongoose = require('mongoose');
const moment = require('moment');
const {get, post} = require('../../../utils/Request');/*
const CDP_APIS = require('../../../config/cdp-url-api.constant');*/
const TitleService = require('../../../services/TitleService');
const NotifyTypeContant = require('../../../config/notify-type');

const isValidDomainToCampaign = async (campaignId, domain) => {
  try {
    const campaign = await CampaignModel.findOne({_id: campaignId});
    if (!campaign) {
      return false;
    }

    // TODO: should improve this logic
    const validDomains = campaign.domains;

    return validDomains.indexOf(domain) !== -1;
  } catch (e) {
    logger.error('LeadService::isValidDomainToCampaign::error', e);
    return false;
  }
};

const createNewLeadHistory = async ({name, email, referenceDomain, utmSource, utmCampaign, utmMedium, area, price, leadId, bedrooms, bathrooms, street, note, direction}) => {
  const newHistory = new LeadHistoryModel();
  newHistory.name = name;
  newHistory.email = email;
  newHistory.referenceDomain = referenceDomain;
  newHistory.utmSource = utmSource;
  newHistory.utmCampaign = utmCampaign;
  newHistory.utmMedium = utmMedium;
  newHistory.area = area;
  newHistory.price = price;
  newHistory.bedrooms = bedrooms;
  newHistory.bathrooms = bathrooms;
  newHistory.street = street;
  newHistory.note = note;
  newHistory.direction = direction;
  newHistory.lead = new mongoose.Types.ObjectId(leadId);
  await newHistory.save();

  return newHistory
};

/**
 *
 * @param queryObj
 * @param paginationCond
 * @return array
 */
const generateStageGetLeads = (queryObj, paginationCond) => {
  const stages = [];

  const $match = {
    status: queryObj.status
  };

  if (queryObj.user) {
    $match['user'] = queryObj.user;
  }

  if (queryObj.deleteFlag) {
    $match['deleteFlag'] = queryObj.deleteFlag;
  }

  stages.push({$match});

  // map campaign
  stages.push({
    '$lookup': {
      'from': 'Campaign',
      'localField': 'campaign',
      'foreignField': '_id',
      'as': 'campaignInfo'
    }
  });

  stages.push({
    $unwind: {
      path: '$campaignInfo'
    }
  });

  // TODO: database chưa có trường hợp này. cần test lại bằng admin tạo campaign có project
  // map project inside campaign
  // stages.push({
  //   "$lookup": {
  //     "from": "Project",
  //     "localField": "",
  //     "foreignField": "lead",
  //     "as": "priceSchedule"
  //   }
  // });

  // map price schedule
  stages.push({
    "$lookup": {
      "from": "LeadPriceSchedule",
      "localField": "_id",
      "foreignField": "lead",
      "as": "priceSchedule"
    }
  });

  stages.push({
    $sort: {
      updatedAt: -1
    }
  });

  // map history
  // stages.push({"$lookup": {"from": "LeadHistory", "localField": "lead", "foreignField": "_id", "as": "histories"}});

  // pagination
  stages.push({
    $facet: {
      entries: [
        {$skip: (paginationCond.page - 1) * paginationCond.limit},
        {$limit: paginationCond.limit}
      ],
      meta: [
        {$group: {_id: null, totalItems: {$sum: 1}}},
      ],
    }
  });
  return stages;
};

/**
 *
 * @param {String} leadId
 * @param {CampaignModel} campaign
 */
const createScheduleDownLeadPrice = (leadId, campaign) => {
  const newSchedule = new LeadPriceScheduleModel();
  newSchedule.lead = new mongoose.Types.ObjectId(leadId);
  newSchedule.price = campaign.leadMaxPrice;
  newSchedule.minPrice = campaign.leadMinPrice;
  newSchedule.downPriceStep = campaign.downPriceStep;

  const now = moment();
  newSchedule.createdAt = now._d;
  newSchedule.updatedAt = now._d;
  newSchedule.downPriceAt = moment().add(campaign.downTime, 'minutes')._d;
  newSchedule.save();
};
/*
const getBalanceInfo = (token) => {
  return get(CDP_APIS.USER.INFO, token);
};*/

const getCurrentLeadPrice = async (leadId) => {
  const schedule = await LeadPriceScheduleModel.findOne({lead: leadId});
  if (!schedule) {
    throw new Error('Schedule not found, so can not detect current lead\'s value');
  }

  return schedule.price;
};

/**
 *
 * @param {string} leadId
 * @param {number }price
 * @param {string} token
 * @returns {*}
 */
const chargeBalanceByBuyingLead = (leadId, price, token) => {
  const body = {
    leadId,
    cost: price
  };

  return post(CDP_APIS.USER.BUY_LEAD, body, token);
};

/**
 *
 * @param {string} leadId
 * @param {Object} session
 * @returns {Promise<void>}
 */
const finishScheduleDownPrice = async (leadId, session) => {
  const schedule = await LeadPriceScheduleModel
    .findOne({lead: leadId})
    .session(session);

  schedule.$session();
  schedule.isFinished = true;
  await schedule.save();
};

/**
 *
 * @param {CampaignModel} campaignInfo
 */
const getLeadLocation = (campaignInfo) => {
  if (campaignInfo.city) {
    const city = TitleService.getCityByCode(campaignInfo.city);

    if (!city) {
      return 'Không xác định';
    }

    if (campaignInfo.district) {
      const district = TitleService.getDistrictByValue(city, campaignInfo.district);

      if (!district) {
        return city.name;
      }

      return `${district.pre} ${district.name}, ${city.name}`;
    } else {
      return city.name;
    }
  }


  return 'Không xác định';
};

/**
 *
 * @param {CampaignModel} campaignInfo
 */
const getTypeOfLead = (campaignInfo) => {
  const formality = TitleService.getFormalityBuyByValue(campaignInfo.formality);
  if (formality) {
    const type = TitleService.getTypeByValue(formality, campaignInfo.type);
    if (type) {
      return type.name;
    }

    return formality.name;
  }

  return 'Không xác định';
};

const findReasonOfReturningLead = async (userId, leadInfo) => {
  const notify = await NotifyModel.findOne({
    $query: {
      fromUser: userId,
      type: NotifyTypeContant.USER_WANT_TO_RETURN_LEAD,
      'params.lead.id': leadInfo._id
    },
    $orderBy: {
      createdTime: -1
    }
  });

  if (notify) {
    return notify.content;
  }

  return '';
};

const findReasonOfReturningLeads = async (userId, leadInfos) => {
  return await Promise.all(leadInfos.map(async leadInfo => {
    leadInfo.reason = await findReasonOfReturningLead(userId, leadInfo);
    return leadInfo;
  }));
};

module.exports = {
  isValidDomainToCampaign,
  createNewLeadHistory,
  generateStageGetLeads,
  createScheduleDownLeadPrice,
/*  getBalanceInfo,*/
  getCurrentLeadPrice,
  chargeBalanceByBuyingLead,
  finishScheduleDownPrice,
  getLeadLocation,
  getTypeOfLead,
  findReasonOfReturningLeads
};
