
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
const RabbitMQService = require('../../services/rabbitmq.service');

const logTrackingBehavior = async (req, res, next) => {
  try {
    const { error } = Joi.validate(req.body, LogTrackingBehaviorValidationSchema);
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { key, uuid} = req.cookies;

    const googleUrls = global.GOOGLE_URLs;

    const {ip, userAgent, isPrivateBrowsing, referrer, href} = req.body;
    const hrefURL = new Url(href);
    const referrerURL = new Url(referrer);
    console.log(referrerURL);
    let type = global.LOGGING_TYPES.TRACK;
    if(googleUrls.includes(referrerURL.hostname.replace('www.', ''))){
      type = global.LOGGING_TYPES.CLICK;
    }

    const hrefQuery = queryString.parse(hrefURL.query);
    const ua = parser(userAgent);
    const data = {
      uuid,
      ip,
      referrer,
      type,
      userAgent,
      accountKey: key,
      isPrivateBrowsing,
      domain: hrefURL.origin,
      pathname: hrefURL.pathname,
      utmCampaign: hrefQuery.utm_campaign || null,
      utmMedium: hrefQuery.utm_medium || null,
      utmSource: hrefQuery.utm_source || null,
      ...ua
    };

    await UserBehaviorLogService.createUserBehaviorLog(data);
    
    if(type === global.LOGGING_TYPES.CLICK)
    {
      const message = {
        ip,
        accountKey: key,
        isPrivateBrowsing
      };
      
      RabbitMQService.sendMessages("DEV_BLOCK_IP", message);
    }
 

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
