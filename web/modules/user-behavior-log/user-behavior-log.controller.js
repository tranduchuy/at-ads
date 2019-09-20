
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
  logger.info('UserBehaviorController::logTrackingBehavior::is called');
  try {
    const href = req.body.href;
    let { key, uuid} = req.cookies;
    
    const hrefURL = new Url(href);
    const hrefOrigin = hrefURL.origin;

    const accountOfKey = await AdAccountModel.findOne({key}).lean();

    const website = await WebsiteService.getWebsiteByDomain(hrefOrigin);

    if (!website || !accountOfKey || website.accountAd.toString() !== accountOfKey._id.toString()) {
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

    const hrefQuery = queryString.parse(hrefURL.query);
    
    if(googleUrls.includes(referrerURL.hostname.replace('www.', '')) || !googleUrls.includes(referrerURL.hostname.replace('www.', '')) && hrefQuery.gclid){
      type = UserBehaviorLogConstant.LOGGING_TYPES.CLICK;
    }

    const trafficSource = UserBehaviorLogService.mappingTrafficSource(referrer,href);

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
      trafficSource,
      ...ua
    };

    const log = await UserBehaviorLogService.createUserBehaviorLog(data);

    console.log('detect session');
    // detect session
    RabbitMQService.detectSession(log._id);

    if(type === UserBehaviorLogConstant.LOGGING_TYPES.CLICK)
    {
      if(hrefQuery.gclid)
      {
        if(website && accountOfKey && website.accountAd.toString() === accountOfKey._id.toString())
        {
          RabbitMQService.sendMessages(rabbitChannels.BLOCK_IP, log._id);
          const sendData = UserBehaviorLogService.getInfoSend(log, accountOfKey, isPrivateBrowsing);
          await UserBehaviorLogService.sendMessageForFireBase(sendData);
        }
        else
        {
          log.reason = UserBehaviorLogService.filterReason(website, accountOfKey);
    
          await log.save();
        }   
      }
      else
      {
        log.reason = { 
          message: UserBehaviorLogConstant.MESSAGE.gclidNotFound
        };
  
        await log.save();
      }
    }

    return res.json({
      status: HttpStatus.OK,
      data: {},
      messages: [messages.ResponseMessages.SUCCESS]
    });
  } catch (e) {
    logger.error('UserBehaviorController::logTrackingBehavior::error', e);
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
    logger.error('UserBehaviorController::logTrackingBehavior::error', e);
    return next(e);
  }
};

const getLogForIntroPage = async (req, res, next) => {
  logger.info('UserBehaviorController::getLogForIntroPage::is called');
  try{
    const data = await UserBehaviorLogService.getDataForIntroPage();
    return res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công'],
      data: {
        logs: data
      }
    });
  }catch(e)
  {
    logger.error('UserBehaviorController::getLogForIntroPage::error', e);
    return next(e);
  }
};

module.exports = {
  logTrackingBehavior,
  getlogTrackingBehavior,
  getLogForIntroPage
};
