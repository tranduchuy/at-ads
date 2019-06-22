const mongoose = require('mongoose');
const async = require('async');
const ObjectId = mongoose.Types.ObjectId;
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const AJV = require('../../../services/AJV');
const HTTP_CODE = require('../../../config/http-code');
const CampaignModel = require('../../../models/CampaignModel');
const CAMPAIGN_SCHEMAS = require('./validator-schema');
const CampaignTypeConstant = require('../../../constants/campaign-type');
const {extractPaginationCondition} = require('../../../utils/RequestUtil');
const CDP_APIS = require('../../../config/cdp-url-api.constant');
const {convertObjectToQueryString, get, post, put, del} = require('../../../utils/Request');

const create = async (req, res, next) => {
  logger.info('AdminCampaignController::create::called');
  try {
    const errors = AJV(CAMPAIGN_SCHEMAS.CREATE, req.body);
    if (errors.length !== 0) {
      // return res.json({
      //   status: HTTP_CODE.ERROR,
      //   message: errors,
      //   data: {}
      // });
      return next(new Error(errors.join('\n')));
    }

    const {
      name, leadMinPrice, leadMaxPrice, downTime, downPriceStep, campaignType,
      formality, type, city, district, projectId, domains, isPrivate, userId
    } = req.body;

    const newCampaign = new CampaignModel();
    newCampaign.name = name.trim();
    newCampaign.leadMinPrice = leadMinPrice;
    newCampaign.leadMaxPrice = leadMaxPrice;
    newCampaign.downTime = downTime;
    newCampaign.downPriceStep = downPriceStep;
    newCampaign.campaignType = campaignType;
    newCampaign.formality = formality;
    newCampaign.type = type;
    newCampaign.city = city;
    newCampaign.district = district;
    newCampaign.project = null;
    newCampaign.isPrivate = isPrivate;
    newCampaign.domains = domains;
    newCampaign.user = null;
    newCampaign.updatedAt = new Date();
    newCampaign.createdAt = new Date();
    newCampaign.admin = req.user.id;

    if (isPrivate === true) {
      if (userId === null || userId === undefined) {
        return next(new Error('UserId is required'));
      }

      newCampaign.user = userId;
    }

    if (campaignType === CampaignTypeConstant.PROJECT) {
      if (district === null || district === undefined) {
        return next(new Error('District is required'));
      }

      if (projectId === null || projectId === undefined) {
        return next(new Error('Project is required'));
      }

      newCampaign.project = new ObjectId(projectId);
    }

    await newCampaign.save();
    logger.info('AdminCampaignController::create::success');

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: ['Success'],
      data: {}
    });
  } catch (e) {
    logger.error('AdminCampaignController::create::error', e);
    return next(e);
  }
};

const list = async (req, res, next) => {
  logger.info('AdminCampaignController::list::called');

  try {
    const stages = _buildStageGetListCampaigns(req);
    const result = await CampaignModel.aggregate(stages);
    logger.info('AdminCampaignController::list stage', JSON.stringify(stages));
    const userIds = result[0].entries
      .filter(item => item.user)
      .map(item => item.user);

    // get users info from CDP
    const urlGetUserInfo = `${CDP_APIS.USER.LIST_USER_INFO}?ids=${userIds.join(',')}`;
    get(urlGetUserInfo, req.user.token)
      .then((response) => {
        const usersObj = {};
        response.data.entries.forEach(user => {
          usersObj[user.id] = user;
        });

        const entries = result[0].entries.map(item => {
          item.project = item.projectInfo.map(project => {
            return {
              _id: project._id,
              title: project.title
            }
          });
          delete item.projectInfo;

          if (item.project.length === 0) {
            item.project = null;
          } else {
            item.project = item.project[0];
          }

          if (item.user && usersObj[item.user]) {
            item.user = usersObj[item.user];
          } else {
            item.user = null;
          }

          return item;
        });

        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: {
            totalItems: result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0,
            entries
          }
        });
      })
      .catch((e) => {
        logger.error('AdminCampaignController::list::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('AdminCampaignController::list::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('AdminCampaignController::update::called');

  // TODO: should update worker down price because of updating downTime and downPriceStep
  try {
    const errors = AJV(CAMPAIGN_SCHEMAS.UPDATE_INFO, req.body);
    if (errors.length > 0) {
      return next(new Error(errors.join('\n')));
    }

    const campaign = await CampaignModel.findOne({
      _id: req.params.id
    });

    if (!campaign) {
      return next(new Error('Campaign not found'));
    }

    const {
      name, leadMinPrice, leadMaxPrice, downTime, downPriceStep,
      formality, type, city, district, domains, status
    } = req.body;

    campaign.name = name.toString().trim() || campaign.name;
    campaign.leadMinPrice = leadMinPrice || campaign.leadMinPrice;
    campaign.leadMaxPrice = leadMaxPrice || campaign.leadMaxPrice;
    campaign.downTime = downTime || campaign.downTime;
    campaign.downPriceStep = downPriceStep || campaign.downPriceStep;
    campaign.formality = formality || campaign.formality;
    campaign.type = type || campaign.type;
    campaign.city = city.toString().trim() || campaign.city;
    campaign.district = district || campaign.district;
    campaign.domains = domains || campaign.domains;
    campaign.status = status || campaign.status;
    campaign.updatedAt = new Date();
    await campaign.save();
    logger.error('AdminCampaignController::update::success');

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {}
    });
  } catch (e) {
    logger.error('AdminCampaignController::update::error');
    return next(e);
  }
};

const remove = async (req, res, next) => {
  logger.info('AdminCampaignController::remove::called');

  try {
    const campaign = await CampaignModel.findOne({_id: req.params.id});
    if (!campaign) {
      return next(new Error('Campaign not found'));
    }

    campaign.deleteFlag = 1;
    await campaign.save();

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {}
    });
  } catch (e) {
    logger.error('AdminCampaignController::remove::error', e);
    return next(e);
  }
};

const detail = async (req, res, next) => {
  logger.info('AdminCampaignController::detail::called');

  try {
    const campaign = await CampaignModel.findOne({_id: req.params.id}).lean();
    if (!campaign) {
      return next(new Error('Campaign not found'));
    }

    if (campaign.user) {
      const urlGetUserInfo = `${CDP_APIS.USER.LIST_USER_INFO}?ids=${campaign.user}`;
      get(urlGetUserInfo, req.user.token)
        .then((response) => {
          if (response.data.entries.length === 1) {
            campaign.user = response.data.entries[0];
          } else {
            campaign.user = null;
          }

          return res.json({
            status: HTTP_CODE.SUCCESS,
            message: 'Success',
            data: campaign
          });
        })
        .catch(e => {
          logger.error('AdminCampaignController::detail::error', e);
          return next(e);
        });

      return;
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: campaign
    });
  } catch (e) {
    logger.error('AdminCampaignController::detail::error', e);
    return next(e);
  }
};

const updateDomains = async (req, res, next) => {
  logger.info('AdminCampaignController::updateDomains::called');

  try {
    const errors = AJV(CAMPAIGN_SCHEMAS.UPDATE_DOMAINS, req.body);
    if (errors.length > 0) {
      return next(new Error(errors.join('\n')));
    }

    const campaign = await CampaignModel.findOne({_id: req.params.id});
    if (!campaign) {
      return next(new Error('Campaign not found'));
    }

    campaign.domains = req.body.domains;
    await campaign.save();

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: campaign
    });
  } catch (e) {
    logger.error('AdminCampaignController::updateDomains::error', e);
    return next(e);
  }
};

function _buildStageGetListCampaigns(req) {
  const stages = [];
  const paginationCond = extractPaginationCondition(req);

  const $match = {};
  if (req.query.status && !isNaN(req.query.status)) {
    $match.status = parseInt(req.query.status, 0);
  } else {
    $match.status = {
      $ne: global.STATUS.DELETE
    }
  }

  if (req.query.name) {
    $match.name = {$regex: req.query.name.toLowerCase().trim(), $options: 'i'};
  }

  const searchExtractFields = ['userId', 'formality', 'type', 'city', 'district'];
  searchExtractFields.forEach(field => {
    if (!req.query.hasOwnProperty(field)) {
      return;
    }

    if (field === 'city') {
      $match.city = req.query[field];
    } else {
      if (!isNaN(req.query[field])) {
        $match[field] = req.query[field];
      }
    }
  });

  if (req.query.projectId) {
    $match.project = new ObjectId(req.query.projectId);
  }

  stages.push({
    $match
  });

  // map project
  stages.push({
    '$lookup': {
      'from': 'Projects',
      'localField': 'project',
      'foreignField': '_id',
      'as': 'projectInfo'
    }
  });

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
}

module.exports = {
  create,
  list,
  update,
  remove,
  detail,
  updateDomains
};
