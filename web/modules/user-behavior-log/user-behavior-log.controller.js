const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const { LogTrackingBehaviorValidationSchema } = require('./validations/log-tracking-behavior.schema');
const HttpStatus = require("http-status-codes");
const parser = require('ua-parser-js');
const Url = require('url-parse');
const queryString = require('query-string');

const UserBehaviorLogService = require('./user-behavior-log.service');
const logTrackingBehavior = async (req, res, next) => {
  try {
    const { error } = Joi.validate(req.body, LogTrackingBehaviorValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };
      return res.json(result);
    }
    const {ip, userAgent, referrer, href} = req.body;

    const hrefURL = new Url(href);
    const hrefQuery = queryString.parse(hrefURL.query);
    const ua = parser(userAgent);
    const data = {
      ip,
      referrer,
      userAgent,
      domain: hrefURL.origin,
      pathname: hrefURL.pathname,
      utmCampaign: hrefQuery.utm_campaign || null,
      utmMedium: hrefQuery.utm_medium || null,
      utmSource: hrefQuery.utm_source || null,
      ...ua
    };
    const newUserBehaviorLog = await UserBehaviorLogService.createUserBehaviorLog(data);


    return res.json({
      status: HttpStatus.OK,
      data: newUserBehaviorLog,
      message: 'request success'
    });
  } catch (e) {
    logger.error('UserController::logTrackingBehavior::error', e);
    return next(e);
  }
};

module.exports = {
  logTrackingBehavior
};
