
const RabbitMQService = require('../../services/rabbitmq.service');
const messages = require("../../constants/messages");
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const { LogTrackingBehaviorValidationSchema } = require('./validations/log-tracking-behavior.schema');
const { updateLogFromClientValidationSchema } = require('./validations/update-log-form-client.schema');
const HttpStatus = require("http-status-codes");
const parser = require('ua-parser-js');
const Url = require('url-parse');
const queryString = require('query-string');
const requestUtil = require('../../utils/RequestUtil');
const UserBehaviorLogService = require('./user-behavior-log.service');
const SocketService = require('../../services/socket.service');
const TrackingServices = require('../tracking/tracking.service');

const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const AdAccountModel = require('../account-adwords/account-ads.model');

const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const WebsiteModel = require('../website/website.model');
const WebsiteService = require('../website/website.service');
const UserBehaviorLogConstant = require('./user-behavior-log.constant');
const Config = require('config');
const rabbitChannels = Config.get('rabbitChannels');

const logTrackingBehavior = async (req, res, next) => {
  logger.info('UserBehaviorController::logTrackingBehavior::is called');
  try {
    return res.json({
      status: HttpStatus.OK,
      data: {
        logId: null
      },
      messages: [messages.ResponseMessages.SUCCESS]
    });

    // const href = req.body.href;
    // let { key, uuid } = req.body;
    // const hrefURL = new Url(href);
    // const hrefOrigin = hrefURL.origin;
    // const accountOfKey = await AdAccountModel.findOne({key}).lean();

    // if(!accountOfKey || !accountOfKey.isConnected || accountOfKey.isDeleted)
    // {
    //   key = '';
    // }

    // const website = await WebsiteModel.findOne({domain: hrefOrigin, accountAd: accountOfKey._id }).lean();

    // if (!website) {
    //   key = '';
    // }

    // const { error } = Joi.validate(req.body, LogTrackingBehaviorValidationSchema);

    // if (error) {
    //   return requestUtil.joiValidationResponse(error, res);
    // }

    // let localIp = req.ip; // trust proxy sets ip to the remote client (not to the ip of the last reverse proxy server)
    // if (localIp.substr(0,7) == '::ffff:') { // fix for if you have both ipv4 and ipv6
    //   localIp = localIp.substr(7);
    // }

    // const googleUrls = UserBehaviorLogConstant.GOOGLE_URLs;
    // const {ip, userAgent, isPrivateBrowsing, screenResolution, browserResolution, location, referrer, msisdn} = req.body;
    // const referrerURL = new Url(referrer);
    // let type = UserBehaviorLogConstant.LOGGING_TYPES.TRACK;
    // const hrefQuery = queryString.parse(hrefURL.query);
    // const detectKeyWord = UserBehaviorLogService.detectKeyWord(hrefQuery);
  
    // if(hrefQuery.gclid || detectKeyWord.campaignId || detectKeyWord.campaignType || detectKeyWord.keyword || detectKeyWord.matchtype || detectKeyWord.page || detectKeyWord.position){
    //   if(detectKeyWord.campaignType == 'Google search')
    //   {
    //     if(googleUrls.includes(referrerURL.hostname.replace('www.', '')))
    //     {
    //       type = UserBehaviorLogConstant.LOGGING_TYPES.CLICK;
    //     }
    //   }
    //   else
    //   {
    //     if(referrerURL.hostname)
    //     {
    //       type = UserBehaviorLogConstant.LOGGING_TYPES.CLICK;
    //     }
    //   }
    // }

    // const trafficSource = UserBehaviorLogService.mappingTrafficSource(referrer,href);
    // const ua = parser(userAgent);

    // key = await UserBehaviorLogService.detectCampaignId(key, accountOfKey, detectKeyWord);

    // const data = {
    //   uuid,
    //   ip,
    //   href,
    //   referrer,
    //   type,
    //   screenResolution,
    //   browserResolution,
    //   userAgent,
    //   location: location,
    //   accountKey: key,
    //   localIp,
    //   isPrivateBrowsing,
    //   domain: hrefURL.origin,
    //   pathname: hrefURL.pathname,
    //   gclid: hrefQuery.gclid || null,
    //   utmCampaign: hrefQuery.utm_campaign || null,
    //   utmMedium: hrefQuery.utm_medium || null,
    //   utmSource: hrefQuery.utm_source || null,
    //   keyword: detectKeyWord.keyword,
    //   page: detectKeyWord.page,
    //   matchType: detectKeyWord.matchtype,
    //   position: detectKeyWord.position,
    //   campaignType: detectKeyWord.campaignType,
    //   campaignId: detectKeyWord.campaignId,
    //   trafficSource,
    //   msisdn,
    //   ...ua
    // };

    // const log = await UserBehaviorLogService.createUserBehaviorLog(data);
    // logger.info('UserBehaviorController::logTrackingBehavior::log', JSON.stringify(log));

    // RabbitMQService.detectSession(log._id);

    // if(type === UserBehaviorLogConstant.LOGGING_TYPES.CLICK)
    // {
    //   if(hrefQuery.gclid || detectKeyWord.campaignId || detectKeyWord.campaignType || detectKeyWord.keyword || detectKeyWord.matchtype || detectKeyWord.page || detectKeyWord.position)
    //   {
    //     if(key && website && accountOfKey && !accountOfKey.isDisabled && website.accountAd.toString() === accountOfKey._id.toString())
    //     {
    //       await RabbitMQService.sendMessages(rabbitChannels.BLOCK_IP, log._id);
    //       const sendData = UserBehaviorLogService.getInfoSend(log, accountOfKey, isPrivateBrowsing);
    //       SocketService.sendDashboardLog(sendData);
    //       // await RabbitMQService.sendMessages(rabbitChannels.SEND_INFO_DASHBOARD, JSON.stringify(sendData));
    //     }
    //     else
    //     {
    //       log.reason = UserBehaviorLogService.filterReason(website, accountOfKey, key);
    //       await log.save();
    //     }
    //   }
    //   else
    //   {
    //     log.reason = { 
    //       message: UserBehaviorLogConstant.MESSAGE.gclidNotFound
    //     };
  
    //     await log.save();
    //   }
    // }
    // else{
    //   log.reason = { 
    //     message: UserBehaviorLogConstant.MESSAGE.isTrack
    //   };
  
    //   await log.save();
    // }

    // return res.json({
    //   status: HttpStatus.OK,
    //   data: {
    //     logId: log._id ? log._id.toString() : null
    //   },
    //   messages: [messages.ResponseMessages.SUCCESS]
    // });
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

const updateTimeOutOfPage = async (req, res, next) => {
  const logId = req.params.id;
  const timeMillisecond = new Date().getTime();
  logger.info('UserBehaviorController::updateTimeOutOfPage::called', {logId, timeMillisecond});
  try {
    return res.status(HttpStatus.OK).json({
      messages: ['Success']
    });

    // const log = await UserBehaviorLogModel.findOne({_id: logId});
    // if (!log) {
    //   return res.status(HttpStatus.BAD_REQUEST).json({
    //     messages: ['Not found log']
    //   });
    // }

    // log.timeUnLoad = timeMillisecond;
    // log.timeOnPage = timeMillisecond - log.createdAt.getTime();
    // await log.save();

    // return res.status(HttpStatus.OK).json({
    //   messages: ['Success']
    // });
  } catch (e) {
    logger.error('UserBehaviorController::updateTimeOutOfPage::error', e);
    return next(e);
  }
};

const scrollPercentage = async (req, res, next) => {
  const logId = req.params.id;
  const scroll = req.body.scroll;
  logger.info('UserBehaviorController::scrollPercentage::called', {logId, scroll});
  try {
    return res.status(HttpStatus.OK).json({
      messages: ['Success']
    });

    // const log = await UserBehaviorLogModel.findOne({_id: logId});
    // if (!log) {
    //   logger.info('UserBehaviorController::scrollPercentage::LOG_NOT_FOUND')
    //   return res.status(HttpStatus.BAD_REQUEST).json({
    //     messages: ['Not found log']
    //   });
    // }

    // log.scrollPercentage = scroll;
    // await log.save();

    // return res.status(HttpStatus.OK).json({
    //   messages: ['Success']
    // });
  } catch (e) {
    logger.error('UserBehaviorController::scrollPercentage::error', e);
    return next(e);
  }
};

const getInfoTracking = async (req, res, next) => {
  logger.info('UserBehaviorController::getInfoTracking::called');
  try{
    const detectAdsInfo = TrackingServices.detectAdsInfo(req);

    if(detectAdsInfo.gclid && detectAdsInfo.gclid != '{gclid}')
    {
      const campaign = await BlockingCriterionsModel.findOne({'campaignId': detectAdsInfo.campaignId});

      if(campaign)
      {
        const adAccount = await AdAccountModel.findOne({'_id': campaign.accountId});

        if(adAccount)
        {
          let data = {
            campaignId: detectAdsInfo.campaignId,
            accountKey: adAccount.key,
            type: 1,
            href: detectAdsInfo.url,
            userAgent: req.useragent.source,
            matchType : detectAdsInfo.matchType,
            keyword: detectAdsInfo.keyword,
            page : detectAdsInfo.page,
            position : detectAdsInfo.position,
            campaignType : detectAdsInfo.campaignType,
            gclid : detectAdsInfo.gclid,
          };
         
          const log = await UserBehaviorLogService.createdUserBehaviorLogForTracking(req, data);
          await RabbitMQService.sendMessages(rabbitChannels.BLOCK_IP, log._id);
        }
      }
    }

    logger.info('UserBehaviorController::getInfoTracking::success');
    return requestUtil.redirectResquestwhenTrackingAds(detectAdsInfo, res);

  }catch(e){
    logger.error('UserBehaviorController::getInfoTracking::error', e);
    return next(e);
  }
};

const updateLogFromClient = async(req, res, next) => {
  logger.info('UserBehaviorController::updateLogFromClient::is called');
  try{
    const { error } = Joi.validate(req.body, updateLogFromClientValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { uuid, gclid, browserResolution, screenResolution, referrer, href, isPrivateBrowsing } = req.body;
    const log = await UserBehaviorLogModel.findOne({gclid, 'uuid': null});

    if(log)
    {
      const hrefURL = new Url(href);
      const trafficSource = UserBehaviorLogService.mappingTrafficSource(referrer,href);
      log.uuid = uuid;
      log.trafficSource = trafficSource;
      log.browserResolution = browserResolution;
      log.screenResolution = screenResolution;
      log.referrer = referrer;
      log.isPrivateBrowsing = isPrivateBrowsing;

      if(hrefURL && log.href.indexOf('//www.google.com/asnc') >= 0)
      {
        log.href = href;
        log.domain = hrefURL.origin;
        log.pathname = hrefURL.pathname;
      }

      if(isPrivateBrowsing){
        await RabbitMQService.sendMessages(rabbitChannels.BLOCK_IP, log._id);
      }

      await log.save();
      await RabbitMQService.detectSession(log._id);
    }

    return res.status(HttpStatus.OK).json({
      messages: ['Success']
    });
  }catch(e){
    logger.error('UserBehaviorController::updateLogFromClient::error', e);
    return next(e);
  }
}

module.exports = {
  logTrackingBehavior,
  getlogTrackingBehavior,
  getLogForIntroPage,
  updateTimeOutOfPage,
  scrollPercentage,
  getInfoTracking,
  updateLogFromClient
};
