
const RabbitMQService = require('../../services/rabbitmq.service');
const messages = require("../../constants/messages");
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const { LogTrackingBehaviorValidationSchema } = require('./validations/log-tracking-behavior.schema');
const HttpStatus = require("http-status-codes");
const parser = require('ua-parser-js');
const Url = require('url-parse');
const queryString = require('query-string');
const requestUtil = require('../../utils/RequestUtil');
const UserBehaviorLogService = require('./user-behavior-log.service');


const AdAccountModel = require('../account-adwords/account-ads.model');

const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const WebsiteService = require('../website/website.service');
const UserBehaviorLogConstant = require('./user-behavior-log.constant');
const Config = require('config');
const rabbitChannels = Config.get('rabbitChannels');

const logTrackingBehavior = async (req, res, next) => {
  try {
    const href = req.body.href;
    let { key, uuid} = req.cookies;

    const hrefURL = new Url(href);
    const domains = await WebsiteService.getValidDomains();

    const hrefOrigin = hrefURL.origin;

    if(domains.indexOf(hrefOrigin) === -1){
      return res.json({
        status: HttpStatus.UNAUTHORIZED,
        data: {},
        messages: [messages.ResponseMessages.UNAUTHORIZED]
      });
    }

    const accountOfKey = await AdAccountModel.findOne({
      key: key
    });

    if(!accountOfKey){
      key = '';
    }

    const { error } = Joi.validate(req.body, LogTrackingBehaviorValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    let localIp = req.ip; // trust proxy sets ip to the remote client (not to the ip of the last reverse proxy server)

    if (localIp.substr(0,7) == '::ffff:') { // fix for if you have both ipv4 and ipv6
      localIp = localIp.substr(7);
    }
    const googleUrls = UserBehaviorLogConstant.GOOGLE_URLs;

    const {ip, userAgent, isPrivateBrowsing, screenResolution, browserResolution, location, referrer} = req.body;
    const referrerURL = new Url(referrer);
    let type = UserBehaviorLogConstant.LOGGING_TYPES.TRACK;
    if(googleUrls.includes(referrerURL.hostname.replace('www.', ''))){
      type = UserBehaviorLogConstant.LOGGING_TYPES.CLICK;
    }

    const hrefQuery = queryString.parse(hrefURL.query);

    const ua = parser(userAgent);
    const data = {
      uuid,
      ip,
      href,
      referrer,
      type,
      screenResolution,
      browserResolution,
      userAgent,
      location: location,
      accountKey: key,
      localIp,
      isPrivateBrowsing,
      domain: hrefURL.origin,
      pathname: hrefURL.pathname,
      gclid: hrefQuery.gclid || null,
      utmCampaign: hrefQuery.utm_campaign || null,
      utmMedium: hrefQuery.utm_medium || null,
      utmSource: hrefQuery.utm_source || null,
      keyword: hrefQuery.keyword || null,
      ...ua
    };

    const log = await UserBehaviorLogService.createUserBehaviorLog(data);

    if(type === UserBehaviorLogConstant.LOGGING_TYPES.CLICK)
    {
      RabbitMQService.sendMessages(rabbitChannels.BLOCK_IP, log._id);
    }
    console.log('detect session');
    // detect session
    RabbitMQService.detectSession(log._id);

    return res.json({
      status: HttpStatus.OK,
      data: {},
      messages: [messages.ResponseMessages.SUCCESS]
    });
  } catch (e) {
    logger.error('UserController::logTrackingBehavior::error', e);
    return next(e);
  }
};

const statisticUser = async (req, res, next) => {
  const info = {
    id: req.adsAccount._id,
    adsId: req.adsAccount.adsId
  };

  if(!req.adsAccount.isConnected){
    logger.info('UserBehaviorLogController::statisticUser::accountAdsNotConnected\n', info);
    return res.status(HttpStatus.BAD_REQUEST).json({
      messages: ['Tài khoản chưa được kết nối']
    });
  }

  logger.info('UserBehaviorLogController::statisticUser is called\n', info);
  try {

    const {limit, page, startDate, endDate} = req.query;
    const stages= UserBehaviorLogService.buildStageStatisticUser({
      accountKey: req.adsAccount.accountKey ? req.adsAccount.accountKey : null,
      limit: parseInt((limit || 10).toString()),
      page: parseInt((page || 1).toString()),
      startDate,
      endDate
    });

    console.log('UserBehaviorLogController::statisticUser stages: ', JSON.stringify(stages));
    const result = await UserBehaviorLogModel.aggregate(stages);

    const response = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.SUCCESS],
      data: {
        meta: {
          totalItems: result[0].meta[0] ? result[0].meta[0].totalItems : 0
        },
        orders: result[0].entries
      }
    };

    return res.status(HttpStatus.OK).json({
      response
    });

  } catch (e) {
    logger.error('UserController::logTrackingBehavior::error', e);
    return next(e);
  }
};

const getlogTrackingBehavior = async (req, res, next) => {
  try {
    return res.json({
      status: HttpStatus.OK,
      data: {},
      messages: [messages.ResponseMessages.SUCCESS]
    });
  } catch (e) {
    logger.error('UserController::logTrackingBehavior::error', e);
    return next(e);
  }
};

module.exports = {
  logTrackingBehavior,
  getlogTrackingBehavior
};
