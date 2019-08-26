const UserBehaviorLogModel = require('./user-behavior-log.model');
const IPLookupService = require('../../services/ip-lookup.service');
const moment = require('moment');
const Url = require('url-parse');
const queryString = require('query-string');
const UserBehaviorLogConstant = require('./user-behavior-log.constant');
const TRAFFIC_SOURCE_TYPES = UserBehaviorLogConstant.TRAFFIC_SOURCE_TYPES;
const googleUrls = UserBehaviorLogConstant.GOOGLE_URLs;

const createUserBehaviorLog = async ({
                                       ip, utmMedium, utmSource, utmCampaign, type,
                                       referrer, userAgent, browser, engine, isPrivateBrowsing,
                                       device, os, cpu, domain, pathname, uuid, accountKey, location,
                                       browserResolution, screenResolution, keyword, gclid, href, localIp,trafficSource
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


  stages.push({"$sort": {"createdAt": 1}});

  stages.push({
    $group:
      {
        _id: "$uuid",
        count: {"$sum": 1}
      }
  });

  stages.push(
    {
      $lookup:
        {
          from: "UserBehaviorLogs",
          localField: "_id",
          foreignField: "uuid",
          as: "info"
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

mappingTrafficSource = (referrer) => {
  if(referrer){
    const referrerURL = new Url(referrer);
    const hostname = referrerURL.hostname;
    const hrefQuery = queryString.parse(referrerURL.query);

    if (googleUrls.includes(hostname.replace('www.', ''))){
      if(hrefQuery.gclid){
        return TRAFFIC_SOURCE_TYPES["google/cpc"];
      } else {
        return TRAFFIC_SOURCE_TYPES["google/organic"];
      }
    } else if(hostname.replace('www.', '') === 'facebook.com'){
      if(hrefQuery.fbclid){
        if((hrefQuery.utm_source === 'facebook' || hrefQuery.utm_medium === 'cpc')){
          return TRAFFIC_SOURCE_TYPES["facebook/cpc"];
        } else {
          return TRAFFIC_SOURCE_TYPES["facebook/referral"];
        }
      }
    } else if (hostname.replace('www.', '') === 'bing.com') {
      if(hrefQuery.msclkid){
        if((hrefQuery.utm_source|| hrefQuery.utm_medium)){
          return TRAFFIC_SOURCE_TYPES["bing/cpc"];
        } else {
          return TRAFFIC_SOURCE_TYPES["bing/organic"];
        }
      }
    }
    else if (hostname.replace('www.', '') === 'coccoc.com') {
        if((hrefQuery.utm_source|| hrefQuery.utm_medium || hrefQuery.utm_campaign)){
          return TRAFFIC_SOURCE_TYPES["coccoc/cpc"];
        } else {
          return TRAFFIC_SOURCE_TYPES["coccoc/organic"];
        }
    } else {
      if (hrefQuery.gclid){
        return TRAFFIC_SOURCE_TYPES["google/display"];
      } else {
        return TRAFFIC_SOURCE_TYPES["other/referral"];
      }
    }
  } else {
    return TRAFFIC_SOURCE_TYPES["direct/none"];
  }
};

module.exports = {
  createUserBehaviorLog,
  buildStageStatisticUser,
  mappingTrafficSource
};
