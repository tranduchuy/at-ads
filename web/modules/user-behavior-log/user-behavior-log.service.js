const UserBehaviorLogModel = require('./user-behavior-log.model');
const IPLookupService = require('../../services/ip-lookup.service');

const createUserBehaviorLog = async ({
                                       ip, utmMedium, utmSource, utmCampaign, type,
                                       referrer, userAgent, browser, engine, isPrivateBrowsing,
                                       device, os, cpu, domain, pathname, uuid, accountKey, location,
                                       browserResolution, screenResolution, keyword, gclid, href, localIp
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

  stages.push({"$sort": {"createdAt": -1}});

  matchStage['accountKey'] = queryCondition.accountKey;

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
      "accountKey": "$info.hlvjJj_7G",
      "type": "$info.type",
      "networkCompany": "$info.networkCompany",
      "ip": "$info.ip",
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

module.exports = {
  createUserBehaviorLog,
  buildStageStatisticUser
};
