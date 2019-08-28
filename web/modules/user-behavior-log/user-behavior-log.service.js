const UserBehaviorLogModel = require('./user-behavior-log.model');
const IPLookupService = require('../../services/ip-lookup.service');
const moment = require('moment');
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

const createUserBehaviorLog = async ({
                                       ip, utmMedium, utmSource, utmCampaign, type,
                                       referrer, userAgent, browser, engine, isPrivateBrowsing,
                                       device, os, cpu, domain, pathname, uuid, accountKey, location,
                                       browserResolution, screenResolution, keyword, gclid, href, localIp, trafficSource
                                     }) => {
  try {
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
      trafficSource,
      gclid: gclid || null,
      utmCampaign: utmCampaign || null,
      utmMedium: utmMedium || null,
      utmSource: utmSource || null,
      browser: browser || null,
      engine: engine || null,
      device: device || null,
      os: os || null,
      cpu: cpu || null,
      createdAt: new Date()
    });

    return await newUserBehaviorLog.save();

  } catch (e) {
    console.log(e);
    return e;
  }
};

buildStageStatisticUser = (queryCondition) => {
  let stages = [];
  const matchStage = {};

  matchStage['accountKey'] = queryCondition.accountKey;
  if (queryCondition.startDate) {
    matchStage.createdAt = {
      $gte: moment(queryCondition.startDate, 'DD-MM-YYYY').startOf('date')._d
    };
  }

  if (queryCondition.endDate) {
    matchStage.createdAt = matchStage.createdAt || {};
    matchStage.createdAt['$lt'] = moment(queryCondition.endDate, 'DD-MM-YYYY').endOf('date')._d;
  }

  if (Object.keys(matchStage).length > 0) {
    stages.push({$match: matchStage});
  }


  stages.push({"$sort": {"createdAt": -1}});

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
      info: {$arrayElemAt: ["$info", 0]}
    }
  });

  stages.push({
    $project: {
      count: "$count",
      "isPrivateBrowsing": "$info.isPrivateBrowsing",
      "isSpam": "$info.isSpam",
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
      "session": "$info.session"
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
      $gte: moment(queryCondition.startDate, 'DD-MM-YYYY').startOf('date')._d
    };
  }

  if (queryCondition.endDate) {
    matchStage.createdAt = matchStage.createdAt || {};
    matchStage.createdAt['$lt'] = moment(queryCondition.endDate, 'DD-MM-YYYY').endOf('date')._d;
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

mappingTrafficSource = (referrer, href) => {
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
    return TRAFFIC_SOURCE_TYPES["direct/none"];
  }
}

const sendMessageForFireBase = async (sendData) => {
  try{
      const FireBaseTokensTokens = await FireBaseTokensModel.find({topic: TOPIC.home});

    if(FireBaseTokensTokens.length > 0)
    {
      const tokens = FireBaseTokensTokens.map(token => token.token);
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
            console.log('List of tokens that caused failures: ' + failedTokens);
            console.log("lenght" + ' ' + failedTokens.length);
          }

          if(failedTokens.length > 0)
          {
            await FireBaseTokensModel.deleteMany({token: {$in: failedTokens}});
          }
          console.log('success');
        });
    }
  }catch(e){
    console.log(e);
  }
};

const getInfoSend = (data, account, isPrivateBrowsing) => {
  if(data.ip)
  {
    const splitIp = data.ip.split('.');
    data.ip = '*.' + splitIp.slice(1,3).join('.');
  }

  let isSpam = false;

  if(account)
  {
    if(account.setting.blockByPrivateBrowser && isPrivateBrowsing)
    {
      isSpam = true
    }
  }

  const sendData = {
    createdAt: new Date(),
    ip: data.ip,
    isSpam,
    device: { name: data.device.vendor || null },
    os: {name: data.os.name || null, version: data.os.version || null},
    browser: data.browser || null,
    network: data.networkCompany || null,
    location: data.location
  };

  return sendData;
};

module.exports = {
  createUserBehaviorLog,
  buildStageStatisticUser,
  mappingTrafficSource,
  buildStageDetailUser,
  sendMessageForFireBase,
  getInfoSend
};
