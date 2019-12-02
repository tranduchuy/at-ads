const UserBehaviorLogModel = require('./user-behavior-log.model');
const IPLookupService = require('../../services/ip-lookup.service');
const moment = require('moment');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const Url = require('url-parse');
const queryString = require('query-string');
const UserBehaviorLogConstant = require('./user-behavior-log.constant');
const TRAFFIC_SOURCE_TYPES = UserBehaviorLogConstant.TRAFFIC_SOURCE_TYPES;
const googleUrls = UserBehaviorLogConstant.GOOGLE_URLs;
const FireBaseTokensModel = require('../fire-base-tokens/fire-base-tokens.model');
const config = require('config');
const FireBaseConfig = config.get('fireBase');
const { TOPIC } = require('../fire-base-tokens/fire-base-tokens.constant');
const { ERROR } = require('../fire-base-tokens/fire-base-tokens.constant');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(FireBaseConfig.CREDENTIAL),
    databaseURL: FireBaseConfig.DATABASEURL
});
const messaging = admin.messaging();

const createUserBehaviorLog = async (inputData) => {
  try {
    const {
      ip, utmMedium, utmSource, utmCampaign, type,
      referrer, userAgent, browser, engine, isPrivateBrowsing,
      device, os, cpu, domain, pathname, uuid, accountKey, location,
      browserResolution, screenResolution, keyword, matchType, page, position, gclid, href, localIp, trafficSource
    } = inputData;
    const company = await IPLookupService.getNetworkCompanyByIP(ip);

    const newUserBehaviorLog = new UserBehaviorLogModel({
      uuid,
      accountKey,
      type,
      networkCompany: company || null,
      href,
      ip,
      referrer,
      localIp,
      userAgent,
      location,
      domain,
      pathname,
      isPrivateBrowsing,
      browserResolution,
      screenResolution,
      keyword,
      matchType,
      page,
      position,
      trafficSource,
      gclid: gclid || null,
      utmCampaign: utmCampaign || null,
      utmMedium: utmMedium || null,
      utmSource: utmSource || null,
      browser: browser || null,
      engine: engine || null,
      device: device || null,
      os: os || null,
      cpu: cpu || null
    });

    return await newUserBehaviorLog.save();
  } catch (e) {
    logger.error('UserBihaviorLogService::createUserBehaviorLog::error', e);
    return e;
  }
};

buildStageStatisticUser = (queryCondition) => {
  let stages = [];
  const matchStage = {
    accountKey: queryCondition.accountKey,
    createdAt: {
        $gte: new Date(queryCondition.startDate),
        $lt: new Date(queryCondition.endDate)
    }
  };

  stages.push({$match: matchStage});

  stages.push({
    $group:
      {
        _id: "$uuid",
        count: {"$sum": 1},
        logInfo: {$push: "$$ROOT"}
      }
  });
  
  stages.push({
    $project: {
      count: "$count",
      info: {$arrayElemAt: ["$logInfo", 0]}
    }
  });

  stages.push({
    $project: {
      count: "$count",
      "uuid": "$info.uuid",
      "isPrivateBrowsing": "$info.isPrivateBrowsing",
      "isSpam": "$info.isSpam",
      "reason": "$info.reason",
      "accountKey": "$info.accountKey",
      "type": "$info.type",
      "networkCompany": "$info.networkCompany",
      "ip": "$info.ip",
      "createdAt": "$info.createdAt",
      "localIp": "$info.localIp",
      "userAgent": "$info.userAgent",
      "location": "$info.location",
      "domain": "$info.domain",
      "browserResolution": "$info.browserResolution",
      "screenResolution": "$info.screenResolution",
      "keyword": "$info.keyword",
      "gclid": "$info.gclid",
      "utmCampaign": "$info.utmCampaign",
      "utmMedium": "$info.utmMedium",
      "utmSource": "$info.utmSource",
      "session": "$info.session",
      "browser": "$info.browser",
      "os": "$info.os" 
    }
  });

  stages.push({"$sort": {"createdAt": -1}});

  stages = stages.concat([
    {
      $facet: {
        entries: [
          {$skip: (queryCondition.page - 1) * queryCondition.limit},
          {$limit: queryCondition.limit}
        ],
        meta: [
          {$group: {_id: null, totalItems: {$sum: 1}}},
        ],
      }
    }
  ]);
  return stages;
};

buildStageDetailUser = (queryCondition) => {
  let stages = [];
  const matchStage = {};

  matchStage['uuid'] = queryCondition.uuid;
  if (queryCondition.startDate) {
    matchStage.createdAt = {
      $gte: new Date(queryCondition.startDate)
    };
  }

  if (queryCondition.endDate) {
    matchStage.createdAt = matchStage.createdAt || {};
    matchStage.createdAt['$lt'] = new Date(queryCondition.endDate);
  }

  if (Object.keys(matchStage).length > 0) {
    stages.push({$match: matchStage});
  }


  stages.push({"$sort": {"createdAt": -1}});

  stages = stages.concat([
    {
      $facet: {
        entries: [
          {$skip: (queryCondition.page - 1) * queryCondition.limit},
          {$limit: queryCondition.limit}
        ],
        meta: [
          {$group: {_id: null, totalItems: {$sum: 1}}},
        ],
      }
    }
  ]);
  return stages;
};

const mappingTrafficSource = (referrer, href) => {
  if (referrer) {
    const referrerURL = new Url(referrer);
    const hostname = referrerURL.hostname;

    const hrefURL = new Url(href);
    const hrefQuery = queryString.parse(hrefURL.query);

    if (googleUrls.includes(hostname.replace('www.', ''))) {
      if (hrefQuery.gclid) {
        return TRAFFIC_SOURCE_TYPES["google/cpc"];
      } else {
        return TRAFFIC_SOURCE_TYPES["google/organic"];
      }
    } else if (hostname.replace('www.', '') === 'facebook.com') {
      if (hrefQuery.fbclid) {
        if ((hrefQuery.utm_source === 'facebook' || hrefQuery.utm_medium === 'cpc')) {
          return TRAFFIC_SOURCE_TYPES["facebook/cpc"];
        } else {
          return TRAFFIC_SOURCE_TYPES["facebook/referral"];
        }
      } else {
        return TRAFFIC_SOURCE_TYPES["other/referral"];
      }
    } else if (hostname.replace('www.', '') === 'bing.com') {
      if (hrefQuery.msclkid) {
        if ((hrefQuery.utm_source || hrefQuery.utm_medium)) {
          return TRAFFIC_SOURCE_TYPES["bing/cpc"];
        } else {
          return TRAFFIC_SOURCE_TYPES["bing/organic"];
        }
      } else {
        return TRAFFIC_SOURCE_TYPES["bing/organic"];
      }
    } else if (hostname.replace('www.', '') === 'coccoc.com') {
      if ((hrefQuery.utm_source || hrefQuery.utm_medium || hrefQuery.utm_campaign)) {
        return TRAFFIC_SOURCE_TYPES["coccoc/cpc"];
      } else {
        return TRAFFIC_SOURCE_TYPES["coccoc/organic"];
      }
    } else {
      if (hrefQuery.gclid) {
        return TRAFFIC_SOURCE_TYPES["google/display"];
      } else {
        return TRAFFIC_SOURCE_TYPES["other/referral"];
      }
    }
  } else {
  
    const hrefURL = new Url(href);
    const hrefQuery = queryString.parse(hrefURL.query);
    if (hrefQuery.gclid) {
      return TRAFFIC_SOURCE_TYPES["google/cpc"];
    }
    
    return TRAFFIC_SOURCE_TYPES["direct/none"];
  }
}

const sendMessageForFireBase = async (sendData) => {
  logger.info('UserBihaviorLogService::sendMessageForFireBase::Is called');
  logger.info('UserBihaviorLogService::sendMessageForFireBase::Data', sendData);
  try{
      const FireBaseTokensTokens = await FireBaseTokensModel.find({topic: TOPIC.home});

    if(FireBaseTokensTokens.length > 0)
    {
      const tokens = FireBaseTokensTokens.map(token => token.token);

      logger.info('UserBihaviorLogService::sendMessageForFireBase::tokensList', tokens);

      const data = JSON.stringify(sendData);
      const message = {
        data: {
          log:data,
          topic: TOPIC.home
        },
        tokens,
      }
      let failedTokens = [];

      admin.messaging().sendMulticast(message)
        .then(async (response) => {
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                if(resp.error.errorInfo.code === ERROR.tokenDeleted)
                {
                  failedTokens.push(tokens[idx]);
                }
              }
            });
            logger.info('UserBihaviorLogService::sendMessageForFireBase::List of tokens that caused failures', failedTokens);
          }

          if(failedTokens.length > 0)
          {
            await FireBaseTokensModel.deleteMany({token: {$in: failedTokens}});
          }
          logger.info('UserBihaviorLogService::sendMessageForFireBase::success');
        });
    }
  }catch(e){
    logger.error('UserBihaviorLogService::sendMessageForFireBase::error', e);
  }
};

const getInfoSend = (log, account, isPrivateBrowsing) => {
  let isSpam = false;

  if(account)
  {
    if(account.setting.blockByPrivateBrowser && isPrivateBrowsing)
    {
      isSpam = true
    }
  }

  return {
    createdAt: log.createdAt,
    ip: log.ip,
    isSpam,
    device: { name: log.device ? log.device.vendor : null },
    os: {name: log.os ? log.os.name : null, version: log.os ? log.os.version : null},
    browser: log.browser || null,
    network: log.networkCompany || null,
    location: log.location,
    keyword: log.keyword,
    position: log.position,
    matchType: log.matchType,
    page: log.page
  };
};

const getDataForIntroPage = () => {
  logger.info('UserBihaviorLogService::getDataForIntroPage::Is called');
  return new Promise(async(res, rej) => {
    try{

      const sortStage = {
        $sort: {
          createdAt: -1
        }
      };

      const projectStage = {
        $project: { 
          isSpam: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          device: 1,
          os: 1,
          browser: 1,
          ip: 1,
          keyword: 1,
          page: 1,
          position: 1,
          matchType: 1
        }
      };

      const limitStage = {
        $limit : 30  
      };

      const query = [
        sortStage,
        projectStage,
        limitStage
      ];

      logger.info('UserBihaviorLogService::getDataForIntroPage::query', JSON.stringify(query));
      const data = await UserBehaviorLogModel.aggregate(query);
      return res(data);
    }catch(e)
    {
      logger.error('UserBihaviorLogService::getDataForIntroPage::Error', e);
      return rej(e)
    }
  });
};

const filterReason = (website, accountOfKey) => {
  let reason = {};

  if(!website)
  {
    reason = { 
      message: UserBehaviorLogConstant.MESSAGE.websiteNotFound
    };
  }
  else if(!accountOfKey)
  {
    reason = { 
      message: UserBehaviorLogConstant.MESSAGE.accountNotFound
    };
  }
  else if(website.accountAd.toString() !== accountOfKey._id.toString())
  {
    reason = { 
      message: UserBehaviorLogConstant.MESSAGE.userIdOfWebsiteNotMatchUserIdOfaccount,
      websiteId: website._id,
      accountAdId: accountOfKey._id
    };
  }
  else
  {
    reason = {
      message: UserBehaviorLogConstant.MESSAGE.unKnow
    };
  }

  return reason;
};

const detectKeyWord = (query) => {
  logger.info('UserBihaviorLogService::detectKeyWord::Is called');
  try{
    let matchtype = null;
		let keyword = null;
		let adposition = null;
		let page = null;
    let position = null;

    if(query.click_matchtype) {
      switch (query.click_matchtype) {
        case 'b':
          matchtype = 'Rộng';
          break;
        case 'e':
          matchtype = 'Chính xác';
          break;
        case 'p':
          matchtype = 'Cụm từ';
          break;
        default:
          break;
      };
    }

    if(query.click_adposition)
    {
      adposition = query.click_adposition.split('t');
      if(adposition.length > 1)
      {
        page = adposition[0];
        position = adposition[1];
      }
    }

    if(query.click_keyword)
    {
      keyword = query.click_keyword;
    }
    
    return { keyword, matchtype, page, position };
  }catch(e){
    logger.error('UserBihaviorLogService::detectKeyWord::Error', e);
    throw new Error(e);
  }
}

module.exports = {
  createUserBehaviorLog,
  buildStageStatisticUser,
  mappingTrafficSource,
  buildStageDetailUser,
  sendMessageForFireBase,
  getInfoSend,
  getDataForIntroPage,
  filterReason,
  detectKeyWord
};
