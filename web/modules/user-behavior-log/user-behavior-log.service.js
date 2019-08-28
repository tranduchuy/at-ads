const UserBehaviorLogModel = require('./user-behavior-log.model');
const IPLookupService = require('../../services/ip-lookup.service');
const moment = require('moment');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
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

const sendMessageForFireBase = async (sendData) => {
  logger.info('UserBihaviorLogService::sendMessageForFireBase::Is called');
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
          splitIp: { $split: ["$ip", "."]}}
      };
      const projectStage1 = {
        $project: {
          isSpam: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          device: 1,
          os: 1,
          browser: 1,
          classC: {$arrayElemAt: ["$splitIp",2]},
          classD: {$arrayElemAt: ["$splitIp",3]}}
      }
      const projectStage2 = {
        $project: { 
          isSpam: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          device: 1,
          os: 1,
          browser: 1,
          ip: { $concat: [ "*.", "$classC", ".", "$classD"]}}
      }
      const limitStage = {
        $limit : 30  
      };

      const query = [
        sortStage,
        projectStage,
        projectStage1,
        projectStage2,
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
}

module.exports = {
  createUserBehaviorLog,
  buildStageStatisticUser,
  sendMessageForFireBase,
  getInfoSend,
  getDataForIntroPage
};
