const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const WebsiteService = require('../website/website.service');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const request = require('request');

const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const RabbitMQService  = require('../../services/rabbitmq.service');
const Async = require('async');
const _ = require('lodash');
const { googleCampaignStatus } = require('../account-adwords/account-ads.constant');
const { campaignStatus } = require('../account-adwords/account-ads.constant');
const DeviceConstant = require('../../constants/device.constant');
const shortid = require('shortid');
const criterionOfDevice = require('../../constants/criterionIdOfDevice.constant');
const moment = require('moment');
const UserBehaviorLogsModel = require('../user-behavior-log/user-behavior-log.model');
const { LOGGING_TYPES } = require('../user-behavior-log/user-behavior-log.constant');
const { Paging } = require('./account-ads.constant');
const AdAccountConstant = require('../account-adwords/account-ads.constant');
const Request = require('../../utils/Request');
const config = require('config');
const trackingScript = config.get('trackingScript');
const adwordConfig = config.get('google-ads');
/**
 *
 * @param {string} userId
 * @param {string} adsId
 * @returns {Promise<void>}
 */
const createAccountAds = async ({ userId, adsId }) => {
  const key = shortid();
  const newAccountAds = new AccountAdsModel({
    user: userId,
    adsId,
    key,
    connectType : AdAccountConstant.connectType.byId
  });

  return await newAccountAds.save();
};

const createAccountAdsHaveIsConnectedStatus = async ({ userId, adsId }, isConnected) => {
  const key = shortid();
  const newAccountAds = new AccountAdsModel({
    user: userId,
    adsId,
    isConnected,
    key,
    connectType: AdAccountConstant.connectType.byId
  });

  return await newAccountAds.save();
};

const createAccountAdsHaveIsConnectedStatusAndConnectType = async ({ userId, adWordId, connectType}) => {
  const key = shortid();
  const newAccountAds = new AccountAdsModel({
    user  : userId,
    adsId : adWordId,  
    isConnected: true,
    key,
    connectType,
  });

  newAccountAds.isConnected = true;

  return await newAccountAds.save();
};


const checkIpIsBlackListed = (blackList, ips, ipInSampleBlockIp, autoBlackListIp) => {
    if(ipInSampleBlockIp)
    {
      blackList = blackList.concat(ipInSampleBlockIp);
    }

    blackList = blackList.concat(autoBlackListIp);

    return _.intersection(blackList, ips);
};

const addIpsToBlackListOfOneCampaign = (accountId, adsId, campaignId, ipsArr, callback) => {
  logger.info('AccountAdsController::addIpsToBlackListOfOneCampaign::is called', {accountId, adsId, campaignId, ipsArr});
  Async.eachSeries(ipsArr, (ip, cb)=> {
    GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
      .then((result) => {
        addIpAndCriterionIdToTheBlacklistOfACampaign(result, accountId, campaignId, adsId, ip, cb);
      })
      .catch(err => {
        switch (GoogleAdwordsService.getErrorCode(err)) {
          case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
            logger.info('AccountAdsController::addIpsToBlackListOfOneCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
            return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, cb);
          default:
            const message = GoogleAdwordsService.getErrorCode(err);
            logger.error('AccountAdsController::addIpsToBlackListOfOneCampaign::error', message);
            return cb(message);
        }
      });
  }, callback);
};

const updateIsDeletedStatusIsTrueForCampaign = (accountId, campaignId, cb) => {
  logger.info('AccountAdsService::updateIsDeletedStatusIsTrueForCampaign: ', {accountId, campaignId});
  BlockingCriterionsModel.updateOne({accountId, campaignId},{$set: {isDeleted: true, isOriginalDeleted: true}}).exec(err => {
    if(err)
    {
      logger.error('AccountAdsService::updateIsDeletedStatusIsTrueForCampaign:error ', err);
      return cb(err);
    }

    cb();
  });
}

const addIpAndCriterionIdToTheBlacklistOfACampaign = (result, accountId, campaignId, adsId, ip, cb) => {
  if(!result)
  {
    return cb(null);
  }
  const criterionId = result.value[0].criterion.id;
  const infoCampaign ={ip, criterionId, createdAt: new Date()};
  BlockingCriterionsModel.update({accountId, campaignId},{$push: {customBlackList: infoCampaign}}).exec(err=>{
    if(err)
    {
      logger.error('AccountAdsService::addIpsToBlackListOfOneCampaign:error ', err);
      return cb(err);
    }
    const logData = {adsId, campaignId, ip};
    logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign: ', logData);
    cb();
  });
};

/**
 *
 * @param {String}userId
 * @returns {array} account | null
 */
const getAccountsAdsByUserId = async (userId) => {
  const accountsAds = await AccountAdsModel.find({ 
    user: userId,
    isDeleted: false
  });
  
  if (accountsAds.length !== 0) {
    const promises = accountsAds.map(async (account) => {
      let websites = await WebsiteService.getWebsitesByAccountId(account._id);

      if(websites.length > 0)
      {
        websites = await checkDomainHasTracking(websites, account.key);
      }

      const query = { 
        accountId: mongoose.Types.ObjectId(account._id),
        isDeleted: false
      };
      const campaignNumber = await BlockingCriterionsModel.countDocuments(query);
      return {
        id: account._id,
        adsId: account.adsId,
        createdAt: account.createdAt,
        isConnected: account.isConnected,
        connectType: account.connectType,
        websites,
        key: account.key,
        campaignNumber,
        isFree: await isFreeAccount(account)
      }
    });
    return await Promise.all(promises);
  }
  return null;
};

const isFreeAccount = async (account) => {
  const websites = await WebsiteService.getWebsitesByAccountId(account._id);
  let flagNotFree = websites.some(website => {
    return !website.isExpired;
  });

  return !flagNotFree;
};

const createCampaign = (accountId, campaign) => {
  const newCampaign = new BlockingCriterionsModel({
    accountId   : accountId,
    campaignId  : campaign.campaignId.toString(),
    campaignName: campaign.campaignName
  })
  return newCampaign;
};

const createdCampaignArr = (accountId, campaigns) =>
{
   let campaignsArr = [];

   campaigns.forEach((campaign) => {
    const newcampaign = createCampaign(accountId, campaign);
    campaignsArr.push(newcampaign);
   });

   return campaignsArr;
};

const filterTheCampaignInfoInTheCampaignList = (result) => {
    return result
      .filter(campaign => campaign.networkSetting.targetGoogleSearch === googleCampaignStatus.isTargetGoogleSearch)
      .map(c => {
        if(c.status === googleCampaignStatus.ENABLED)
        {
          return {id: c.id, name: c.name, status: campaignStatus[c.status], isEnabled: campaignStatus.ISENABLED}
        }
        return {id: c.id, name: c.name, status: campaignStatus[c.status], isEnabled: campaignStatus.ISDISABLED}
    });
};

const onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
};

const removeIpsToBlackListOfOneCampaign = (accountId, adsId, campaignId, ipsArr, callback) => {
  Async.eachSeries(ipsArr, (ip, cb)=> {
    const queryFindIpOfcampaign = {accountId, campaignId, "customBlackList.ip": ip};
    const select = {'customBlackList.$': 1};

    BlockingCriterionsModel
    .findOne(queryFindIpOfcampaign, select)
    .exec((errQuery, blockingCriterionRecord) => {
        if(errQuery)
        {
          logger.error('AccountAdsService::RemoveIpsToBlackListOfOneCampaign:error ', errQuery);
          return cb(errQuery);
        }

        if(!blockingCriterionRecord)
        {
          logger.info('AccountAdsService::RemoveIpsToBlackListOfOneCampaign::ip not in campaign');
          return cb(null);
        }

        GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ip, blockingCriterionRecord.customBlackList[0].criterionId)
          .then((result) => {
            removeIpAndCriterionIdToTheBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
          })
          .catch(err => {
            switch (GoogleAdwordsService.getErrorCode(err)) {
              case 'INVALID_ID' :
                logger.info('AccountAdsController::RemoveIpsToBlackListOfOneCampaign::INVALID_ID', {campaignId});
                return removeIpAndCriterionIdToTheBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
              case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                logger.info('AccountAdsController::RemoveIpsToBlackListOfOneCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, cb);
              default:
                const message = GoogleAdwordsService.getErrorCode(err);
                logger.error('AccountAdsController::RemoveIpsToBlackListOfOneCampaign::error', message);
                return callback(message);
            }
          });
    });
  }, callback);
};

const removeIpAndCriterionIdToTheBlacklistOfACampaign = (accountId, campaignId, adsId, ip, cb) => {
  
  const queryUpdate = {accountId, campaignId};
  const updateingData = {$pull: {customBlackList : {ip}}};

  BlockingCriterionsModel.update(queryUpdate, updateingData).exec((e) => {
      if(e)
      {
        logger.error('AccountAdsService::RemoveIpsToBlackListOfOneCampaign:error ', e);
        return cb(e);
      }
      
      const logData = {adsId, campaignId, ip};
      logger.info('AccountAdsService::RemoveIpsToBlackListOfOneCampaign: ', logData);
      cb();
  });
};

const checkIpIsNotOnTheBlackList = (blackList, ips) => {
    if(!blackList || blackList.length === 0)
    {
      return ips;
    }
    return _.difference(ips, blackList);
};

/**
 * reuturn object if error, else null
 * @returns Promise<obj|null> 
 */
const createdAccountIfNotExists = async(userId, adsId) => {
  try{
    const accountInfo = {adsId, 'user': userId };
    const adAccount = await AccountAdsModel.findOne(accountInfo);

    if(!adAccount) {
      await createAccountAds({userId, adsId});
    }

    return null;

  }catch(e)
  {
    logger.error('AccountAdsService::createdAccountIfNotExists:error ', e);
    return e;
  }
};

const convertCSVToJSON = (report) => {
  let CSV = report.split('\n');
  CSV = CSV.slice(2, CSV.length - 2);

  const jsonArr = [];
  CSV.forEach(ele => {
    const temp = ele.split(',');
    let device = '';

    switch (temp[0]) {
      case DeviceConstant.computer:
        device = 'Máy tính';
        break;
      case DeviceConstant.mobile:
        device = 'Điện thoại';
        break;
      case DeviceConstant.tablet:
        device = 'Máy tính bảng';
        break;
      default:
        device = 'Other';
    }

    const json = {
      device,
      cost: temp[1],
      impressions: temp[2],
      clicks: temp[3],
      avgPosition: temp[4]
    };
    jsonArr.push(json);
  });

  return jsonArr;
}

const reportTotalOnTheSameDevice = (jsonArr, deviceName) => {
   const filterDevice = jsonArr.filter(ele => ele.device === deviceName);

   let totalCost = 0;
   let totalImpressions = 0;
   let totalClicks = 0;
   let totalAvgPosition = 0;

   filterDevice.forEach(ADevice => {
      totalCost += Number(ADevice.cost);
      totalImpressions += Number(ADevice.impressions);
      totalClicks += Number(ADevice.clicks);
      totalAvgPosition += Number(ADevice.avgPosition);
   });

   totalAvgPosition /= filterDevice.length;
   totalCost /= 1e6;

   const result = {
      device: deviceName,
      cost: totalCost,
      impressions: totalImpressions,
      clicks: totalClicks,
      avgPosition: parseFloat(totalAvgPosition.toFixed(2)),
      ctr: parseFloat((totalClicks/totalImpressions).toFixed(3))
   }

   return result;
}

const reportTotalOnDevice = (jsonArr) => {
  const reportOfComputer = reportTotalOnTheSameDevice(jsonArr, 'Máy tính');
  const reportOfMobile = reportTotalOnTheSameDevice(jsonArr, 'Điện thoại');
  const reportOfTablet = reportTotalOnTheSameDevice(jsonArr, 'Máy tính bảng');
  
  return [reportOfComputer, reportOfMobile, reportOfTablet];
};

const convertPercentToCoefficient = (number) => {
  if(number >= 0)
  {
    return (number/100)+1;
  }
  const temp = Math.abs(number / 100);
  if(temp === 0 )
  {
    return 0;
  }
  return 1 - temp;
};

const removeSampleBlockingIp = (adsId, accountId, campaignIds) => {
  return new Promise((resolve, reject) => {
    Async.eachSeries(campaignIds, (campaignId, callback)=>{
      const queryFindIpOfcampaign = {accountId, campaignId};

      BlockingCriterionsModel
        .findOne(queryFindIpOfcampaign)
        .exec((errQuery, blockingCriterionRecord) => {
          if(errQuery)
          {
            logger.error('AccountAdsService::removeSampleBlockingIp:error ', errQuery);
            return callback(errQuery);
          }

          if(!blockingCriterionRecord || ! blockingCriterionRecord.sampleBlockingIp)
          {
            logger.info('AccountAdsService::removeSampleBlockingIp:ip not in campaign', {campaignId});
            return callback(null);
          }

          GoogleAdwordsService.removeIpBlackList(adsId, campaignId, blockingCriterionRecord.sampleBlockingIp.ip, blockingCriterionRecord.sampleBlockingIp.criterionId)
          .then(result => {
            const accountInfo = {accountId, campaignId, adsId};
            removeIpAndCriterionsIdForSampleBlockingIp(accountInfo, callback);
          }).catch(error => {
            switch (GoogleAdwordsService.getErrorCode(error)) {
              case 'INVALID_ID' :
                logger.info('AccountAdsController::removeSampleBlockingIp::INVALID_ID', {campaignId});
                const accountInfo = {accountId, campaignId, adsId};
                return removeIpAndCriterionsIdForSampleBlockingIp(accountInfo, callback);
              case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                logger.info('AccountAdsController::removeSampleBlockingIp::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, callback);
              default:
                const message = GoogleAdwordsService.getErrorCode(error);
                logger.error('AccountAdsController::removeSampleBlockingIp::error', message);
                return callback(message);
            }
          });
      });
    },(err, result) => {
      if (err) {
        logger.error('AccountAdsController::removeSampleBlockingIp::error', err);
        return reject(err);
      }
      logger.info('AccountAdsController::removeSampleBlockingIp::success');
      return resolve(result);
    });
  });
};

/**
 * 
 * @param {{accountId: string, campaignId: string, adsId: string}} accountInfo 
 * @param {*} callback 
 */

const removeIpAndCriterionsIdForSampleBlockingIp = (accountInfo, callback) => {
  const accountId = accountInfo.accountId;
  const campaignId = accountInfo.campaignId;
  const adsId = accountInfo.adsId;
  const queryUpdate = {accountId, campaignId};
  const updateingData = {sampleBlockingIp: null};

  BlockingCriterionsModel
    .update(queryUpdate, updateingData)
    .exec((e) => {
      if(e)
      {
        logger.error('AccountAdsService::removeIpAndCriterionsIdInSampleBlockingIp:error ', e);
        return callback(e);
      }
      const logData = {adsId, campaignId};
      logger.info('AccountAdsService::removeIpAndCriterionsIdInSampleBlockingIp: ', logData);
      callback();
  });
};

const addSampleBlockingIp = (adsId, accountId, campaignIds, ip) => {
  return new Promise((resolve, reject) => {
    Async.eachSeries(campaignIds, (campaignId, callback)=> {
      GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
        .then((result) => {

          const accountInfo = { result, accountId, campaignId, adsId, ip };

          addIpAndCriterionIdForSampleBlockingIp(accountInfo, callback);
        })
        .catch(err => 
          {
            switch (GoogleAdwordsService.getErrorCode(err)) {
              case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                logger.info('AccountAdsController::removeIpsToAutoBlackListOfOneCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, cb);
              default:
                const message = GoogleAdwordsService.getErrorCode(err);
                logger.error('AccountAdsController::removeIpsToAutoBlackListOfOneCampaign::error', message);
                return callback(message);
            }
          });
    }, (e, result) => {
      if (e) {
        logger.error('AccountAdsController::addSampleBlockingIp::error', e);
        return reject(e);
      }
      logger.info('AccountAdsController::addSampleBlockingIp::success');
      return resolve(result);
    });
  });
};

/**
 * 
 * @param {{result: object, accountId: string, campaignId: string, adsId: string, ip: string}} accountInfo 
 * @param {*} callback 
 */
const addIpAndCriterionIdForSampleBlockingIp = (accountInfo, callback) => {
  if(!accountInfo.result)
  {
    return callback(null);
  }
  const criterionId = accountInfo.result.value[0].criterion.id;
  const ip = accountInfo.ip;
  const infoCampaign ={ip, criterionId, createdAt: new Date()};
  const campaignId = accountInfo.campaignId;
  const accountId = accountInfo.accountId;
  const adsId = accountInfo.adsId;
  const updateQuery = {accountId, campaignId};
  const updateingData =  {sampleBlockingIp: infoCampaign};

  BlockingCriterionsModel
    .update(updateQuery, updateingData)
    .exec(err=>{
      if(err)
      {
        logger.info('AccountAdsService::addIpAndCriterionIdForSampleBlockingIp:error ', err);
        return callback(err);
      }

      const logData = {adsId, campaignId, ip};
      logger.info('AccountAdsService::addIpAndCriterionIdForSampleBlockingIp: ', logData);
      callback();
    });
};

const updateIsDeletedStatus = async (accountId, campaignId, isDeleted, campaignsWhenSend) => {
  try{
    if(isDeleted)
    {
      const updateQuery = {
        accountId: accountId,
        campaignId: { 
          $in: campaignId 
        }
      };
    
      const dataUpdate = {
        $set: {
          isDeleted
        }
      };
    
      return await BlockingCriterionsModel
       .updateMany(updateQuery, dataUpdate);
    }

    const filterCampaign = campaignsWhenSend.filter( cp => { 
			return campaignId.some( f => {
			  return cp.campaignId == f;
			})
    });

    Async.eachSeries(filterCampaign, (campaign, callback) => {
      const queryUpdate = {
        accountId : accountId,
        campaignId: campaign.campaignId 
      };

      const updateData = {
        $set: {
          isDeleted,
          campaignName: campaign.campaignName
        }
      }

      BlockingCriterionsModel.updateOne(queryUpdate, updateData)
        .then(result => {
          return callback();
        }).catch(error => {
          return callback(error);
        });

    }, (err, res) => {
      if(err){
        throw err;
      }
      return res;
    });
  }catch(e){
    throw e;
  }
};

const saveSetUpCampaignsByOneDevice = async(accountAds, device, isEnabled) => {
  switch (device) {
    case criterionOfDevice.computer:
      accountAds.setting.devices.computer = isEnabled;
      break;
    case criterionOfDevice.mobile:
      accountAds.setting.devices.mobile = isEnabled;
      break;
    case criterionOfDevice.tablet:
      accountAds.setting.devices.tablet = isEnabled;
      break;
    default:
      break;
  }

  return await accountAds.save();
};

const getReportForAccount = (accountKey, from, to, page, limit) => {
  logger.info('AccountAdsService::getReportForAccount::is called ', {accountKey, from: from._d, to: to._d, page, limit});
  return new Promise(async (res, rej) => {
    try{
      const matchStage =  {
          $match: {
              accountKey,
              type: LOGGING_TYPES.CLICK,
              createdAt: {
                  $gte: new Date(from),
                  $lt: new Date(to)
              }
          }  
      };

      const sort =  {
          $sort: {
              "createdAt": -1
          }  
      };

      const projectStage = { 
          $project: {
            uuid              : 1,
            createdAt         : 1,
            isSpam            : 1,
            ip                : 1,
            keyword           : 1,
            location          : 1,
            isPrivateBrowsing : 1,
            reason            : 1,
            gclid             : 1
          }
      };

      const facetStage = {
        $facet: 
        {
          entries: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          meta: [
            {$group: {_id: null, totalItems: {$sum: 1}}},
          ],
        }
      };

      let query = [];

      query = [
        matchStage,
        sort,
        projectStage,
        facetStage  
      ];

      const queryInfo = JSON.stringify(query);
      logger.info('AccountAdsService::getReportForAccount::query', {queryInfo});

      const result = await UserBehaviorLogsModel.aggregate(query);
      
      logger.info('AccountAdsService::getReportForAccount::success ', {accountKey, from: from._d, to: to._d, page, limit});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getReportForAccount::error ', e, {accountKey, from: from._d, to: to._d, page, limit});
      return rej(e);
    }
  });
};

const getReportStatistic = (accountKey, from, to) => {
  logger.info('AccountAdsService::getReportStatistic::is called ', {accountKey, from: from._d, to: to._d});
  return new Promise(async (res, rej) => {
    try{
      const matchStage =  {
          $match: {
              accountKey,
              type: LOGGING_TYPES.CLICK,
              createdAt: {
                  $gte: new Date(from),
                  $lt: new Date(to)
              }
          }  
      };

      const sort =  {
          $sort: {
              "createdAt": -1
          }  
      };

      const groupStage = { 
          $group: { 
            _id: { 
                $dateToString: { format: "%d-%m-%Y", date: "$createdAt"} 
            }, 
            spamClick: { 
                $sum: {
                    $cond : [{$eq: ["$isSpam", true]}, 1, 0]
                },
            },
            realClick: { 
              $sum: {
                  $cond : [{$ne: ["$isSpam", true]}, 1, 0]
              },
          },
        }
      };

      let query = [];

      query = [
        matchStage,
        sort,
        groupStage  
      ];

      const queryInfo = JSON.stringify(query);
      logger.info('AccountAdsService::getReportStatistic::query', {queryInfo});

      const result = await UserBehaviorLogsModel.aggregate(query);
      
      logger.info('AccountAdsService::getReportStatistic::success ', {accountKey, from: from._d, to: to._d});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getReportStatistic::error ', e, {accountKey, from: from._d, to: to._d});
      return rej(e);
    }
  });
};


const getDailyClicking =  (accountKey, maxClick, page, limit) => {
  logger.info('AccountAdsService::getDailyClicking::is called ', {accountKey, maxClick, page, limit});

  return new Promise(async (res, rej)=> {
    try{
      const now = moment().startOf('day')._d;
      const tomorrow = moment(now).endOf('day')._d;

      const matchStage = {
          $match: {
            accountKey,
            type: LOGGING_TYPES.CLICK,
            createdAt: {
                $gte: now,
                $lt: tomorrow
            }
        }
      };

      const sortStage = {
        $sort: {
          createdAt: -1
        }
      };

      const projectStage = {
        $project: {
          _id: "$ip",
          info: [
            {
              "location": "$location",
              "keyword": "$keyword",
              "isSpam": "$isSpam",
              "os": "$os",
              "networkCompany": "$networkCompany",
              "browser": "$browser",
              "createdAt": "$createdAt",
              "isPrivateBrowsing": "$isPrivateBrowsing",
              "reason": "$reason"
            }
          ]
        }
      };

      const facetStage = {
        $facet: 
        {
           entries: [
             { $skip: (page - 1) * limit },
             { $limit: limit }
         ],
         meta: [
           {$group: {_id: null, totalItems: {$sum: 1}}},
           ],
        }
      };

      let query = []

      if(maxClick > 0)
      {
        query = [
          matchStage,
          sortStage,
          projectStage,
          // conditionToRemove,
          facetStage   
        ];
      }
      else
      {
        query = [
          sortStage,
          matchStage,
          projectStage,
          facetStage   
        ];
      }

      const queryInfo =  JSON.stringify(query);
      logger.info('AccountAdsService::getDailyClicking::query', {queryInfo});

      const result = await UserBehaviorLogsModel.aggregate(query);

      logger.info('AccountAdsService::getDailyClicking::success ', {accountKey, maxClick, page, limit});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getDailyClicking::error ', e, {accountKey, maxClick, page, limit});
      return rej(e);
    }
  });
};

const getIpsInfoInClassD = (accountKey, from, to, page, limit) => {
  logger.info('AccountAdsService::getIpsInfoInClassD::is called ', {accountKey});
  return new Promise(async(res, rej) => {
    try{
      const matchStage =  {
        $match: {
          accountKey,
          type: LOGGING_TYPES.CLICK,
          createdAt: {
            $gte: new Date(from),
            $lt: new Date(to)
          }
        }  
      };

      const projectStage ={ $project: { 
          keyword: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          click: {sum: 1},
          ip1: { $split: ["$ip", "."]}}
      };

      const projectStage1 ={ $project: {
          keyword: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          ip2: {$arrayElemAt: ["$ip1",0]},
          ip3: {$arrayElemAt: ["$ip1",1]},
          ip4: {$arrayElemAt: ["$ip1",2]}}
      };

      const projectStage2 = { $project: { 
          keyword: 1,
          networkCompany: 1,
          location: 1,
          createdAt: 1,
          ipClassC: { $concat: [ "$ip2", ".", "$ip3", ".", "$ip4", ".*"]}}
      };

      const groupStage = { $group: { 
        _id: "$ipClassC",
        keywords: {$push: "$keyword"},
        networks:{$push: "$networkCompany"},
        locations: {$push: '$location'},
        totalClick: {$sum: 1},
        logTimes: {$push: "$createdAt"}}
      };

      const projectStage3 =  { $project: {
        _id:1,
        keywords: 1,
        networks: 1,
        locations: 1,
        totalClick: 1,
        logTime: { $arrayElemAt: ["$logTimes", -1] }}
      };

      const facetStage = {
        $facet: 
        {
          entries: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          meta: [
            {$group: {_id: null, totalItems: {$sum: 1}}},
          ],
        }
      };

      const query = JSON.stringify([
        matchStage,
        projectStage,
        projectStage1,
        projectStage2,
        groupStage,
        projectStage3,
        facetStage
      ]);

      logger.info('AccountAdsService::getIpsInfoInClassD::query ', {accountKey, query});

      const result = await UserBehaviorLogsModel.aggregate([
        matchStage,
        projectStage,
        projectStage1,
        projectStage2,
        groupStage,
        projectStage3,
        facetStage
      ]);

      logger.info('AccountAdsService::getIpsInfoInClassD::success ', {accountKey});
      return res(result);

    }catch(e){
      logger.error('AccountAdsService::getIpsInfoInClassD::error ', e, {accountKey});
      return rej(e);
    }
  });
};

const getIpAndCampaigNumberInCustomBlockingIp = (accountId) => {
  logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::is called ', {accountId});
  return new Promise(async(res, rej) => {
    try{
      const matchStage = {
        $match: {
            accountId,
            isDeleted: false
        }  
      };

      const unwindStage = {
        $unwind: {
            path: "$customBlackList"
        }
      };

      const groupStage = {
        $group: { 
            _id: "$customBlackList.ip",
            campaignNumber: {$sum: 1}
        }
      };

      const query = [
        matchStage,
        unwindStage,
        groupStage
      ];

      const queryInfo = JSON.stringify(query);

      logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::query ', {accountId, queryInfo});

      const result = await BlockingCriterionsModel.aggregate(query);

      logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::success ', {accountId});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::error ', e, {accountId});
      return rej(e);
    }
  });
};

const removeIpsToAutoBlackListOfOneCampaign = (accountId, adsId, campaignId, ipsArr, callback) => {
  logger.info('AccountAdsService::removeIpsToAutoBlackListOfOneCampaign:is called ', {accountId, adsId, campaignId, ipsArr});
  Async.eachSeries(ipsArr, (ip, cb)=> {
    const queryFindIpOfcampaign = {accountId, campaignId, "autoBlackListIp.ip": ip};
    const select = {'autoBlackListIp.$': 1};

    BlockingCriterionsModel
    .findOne(queryFindIpOfcampaign, select)
    .exec((errQuery, blockingCriterionRecord) => {
        if(errQuery)
        {
          logger.error('AccountAdsService::removeIpsToAutoBlackListOfOneCampaign:error ', errQuery);
          return cb(errQuery);
        }

        if(!blockingCriterionRecord)
        {
          logger.info('AccountAdsService::removeIpsToAutoBlackListOfOneCampaign:ip not in campaign', {campaignId});
          return cb(null);
        }

        GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ip, blockingCriterionRecord.autoBlackListIp[0].criterionId)
          .then((result) => {
            removeIpAndCriterionIdToTheAutoBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
          })
          .catch(err => {
            switch (GoogleAdwordsService.getErrorCode(err)) {
              case 'INVALID_ID' :
                logger.info('AccountAdsController::removeIpsToAutoBlackListOfOneCampaign::INVALID_ID', {campaignId});
                return removeIpAndCriterionIdToTheAutoBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
              case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                logger.info('AccountAdsController::removeIpsToAutoBlackListOfOneCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, cb);
              default:
                const message = GoogleAdwordsService.getErrorCode(err);
                logger.error('AccountAdsController::removeIpsToAutoBlackListOfOneCampaign::error', message);
                return callback(message);
            }
          });
    });
  }, callback);
};

const removeIpAndCriterionIdToTheAutoBlacklistOfACampaign = (accountId, campaignId, adsId, ip, cb) => {
  logger.info('AccountAdsService::removeIpAndCriterionIdToTheAutoBlacklistOfACampaign:is called ', {accountId, campaignId, adsId, ip});
  const queryUpdate = {accountId, campaignId};
  const updateingData = {$pull: {autoBlackListIp : {ip}}};

  BlockingCriterionsModel.update(queryUpdate, updateingData).exec((e) => {
      if(e)
      {
        logger.error('AccountAdsService::removeIpAndCriterionIdToTheAutoBlacklistOfACampaign:error ', e);
        return cb(e);
      }
      
      const logData = {adsId, campaignId, ip};
      logger.info('AccountAdsService::removeIpAndCriterionIdToTheAutoBlacklistOfACampaign: ', logData);
      cb();
  });
};

const getIpHistory = (ip, limit, page) => {
  logger.info('AccountAdsService::getIpHistory::is called', {ip, limit, page});
  return new Promise(async (res, rej) => {
    try{
      const matchStage = {
        $match: {
          ip
        }
      };
      const sortStage = {
        $sort: {
          createdAt: -1
        }  
      };
      const projectStage = {
        $project: {
          isPrivate: 1,
          _id: 1,
          uuid: 1,
          accountKey: 1,
          networkCompany: 1,
          href: 1,
          ip: 1,
          location: 1,
          device: 1,
          referer: 1,
          browser: 1,
          os: 1,
          createdAt: 1,
          session: 1,
          isSpam: 1,
          isPrivateBrowsing: 1,
          type: 1,
          reason: 1
        }
      };

      const facetStage = {
        $facet: 
        {
          entries: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          meta: [
            {$group: {_id: null, totalItems: {$sum: 1}}},
          ],
        }
      };

      const query = [
        matchStage, 
        sortStage,
        projectStage,
        facetStage
      ]

      const queryInfo = JSON.stringify(query);

      logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::query ', { queryInfo });
      
      const select = {
        isPrivate: 1,
        _id: 1,
        uuid: 1,
        accountKey: 1,
        networkCompany: 1,
        href: 1,
        ip: 1,
        location: 1,
        device: 1,
        browser: 1,
        os: 1,
        createdAt: 1,
        session: 1,
        isSpam: 1,
        isPrivateBrowsing: 1,
        reason: 1
      };

      console.log('=======');
      console.log(JSON.stringify(query));

      const ipHistoryResult = await UserBehaviorLogsModel.aggregate(query);

      if(ipHistoryResult[0].entries.length !== 0)
      {
        const theLastIpHistory = await UserBehaviorLogsModel
        .find({ip})
        .sort({createdAt: -1})
        .select(select);

        logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::success ', {ip, limit, page});
        return theLastIpHistory.length === 0 ? res({ipHistoryResult, theLastIpHistory: []}) : res({ipHistoryResult, theLastIpHistory: [theLastIpHistory[0]]});
      }

      logger.info('AccountAdsService::getIpAndCampaigNumberInCustomBlockingIp::success ', {ip, limit, page});
      return res({ipHistoryResult, theLastIpHistory: []});

    }catch(e)
    {
      logger.error('AccountAdsService::getIpHistory::error ', e, {ip, limit, page});
      return rej(e);
    }
  });
};

const checkAndConvertIP = (ip) => {
  //127.0.0.1
  const regex1 = new RegExp(/^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/);
  //127.0.0.*
  const regex2 = new RegExp(/^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([*])$/);
  //127.0.*.*
  const regex3 = new RegExp(/^([0-9]{1,3})[.]([0-9]{1,3})[.]([*])[.]([*])$/);

  if(regex1.test(ip)){
    return ip;
  }


  const splitIp = ip.split('.');
  if(regex2.test(ip)){
    return splitIp.slice(0,3).join('.') + ".0/24";
  }

  if(regex3.test(ip)){
    return splitIp.slice(0,2).join('.') + ".0.0/16";
  }

  return false;
};

const standardizedIps = (ips) => {
  let ipsArr = [];

  ips.forEach(ipInfo => {
    const splitIp = ipInfo.ip.split('.');
    const splitIpClassD = splitIp[3].split('/');

    if(splitIpClassD)
    {
        if(splitIpClassD[1] == '32')
        {
          ipInfo.ip = splitIp.slice(0,3).join('.') + "." + splitIpClassD[0];
        }
        ipsArr.push(ipInfo);
    }
  }); 

  return ipsArr;
};

const removeIpsOnGoogleAds = (adsId, campaignId, ipsInfoArr, callback) => {
  Async.eachSeries(ipsInfoArr, (ipInfo, cb)=> {
    GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ipInfo.ip, ipInfo.criterionId)
      .then((result) => {
        logger.info('AccountAdsController::removeIpsOnGoogleAds::sussecc', {campaignId});
        return cb();
      })
      .catch(err => {
        switch (GoogleAdwordsService.getErrorCode(err)) {
          case 'INVALID_ID' :
            logger.info('AccountAdsController::removeIpsOnGoogleAds::INVALID_ID', {campaignId});
            return cb(null);
          case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
            logger.info('AccountAdsController::removeIpsOnGoogleAds::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
            return cb(null);
          default:
            const message = GoogleAdwordsService.getErrorCode(err);
            logger.error('AccountAdsController::removeIpsOnGoogleAds::error', message);
            return cb(message);
        }
    });
  }, callback);
};

const blockSampleIpForOneCampaign = (accountId, adsId, campaignId, ip, callback) => {
  logger.info('AccountAdsController::blockSampleIpForOneCampaign::is called', {accountId, adsId, campaignId, ip});
  GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
  .then((result) => {

    const accountInfo = { result, accountId, campaignId, adsId, ip };
    addIpAndCriterionIdForSampleBlockingIp(accountInfo, callback);
  })
  .catch(err => 
  {
    console.log(err);
    switch (GoogleAdwordsService.getErrorCode(err)) {
      case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
        logger.info('AccountAdsController::blockSampleIpForOneCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
        return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, callback);
      default:
        const message = GoogleAdwordsService.getErrorCode(err);
        logger.error('AccountAdsController::blockSampleIpForOneCampaign::error', message);
        return callback(message);
    }
  });
};

const blockIpsInAutoBlackList = (accountId, adsId, campaignId, ipsArr, callback) => {
  logger.info('AccountAdsController::blockIpsInAutoBlackList::is called', {accountId, adsId, campaignId, ipsArr});
  Async.eachSeries(ipsArr, (ip, cb)=> {
    GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
      .then((result) => {
        const accountInfo = { result, accountId, campaignId, adsId, ip };
        RabbitMQService.addIpAndCriterionIdInAutoBlackListIp(accountInfo, cb);
      })
      .catch(err => {
        switch (GoogleAdwordsService.getErrorCode(err)) {
          case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
            logger.info('AccountAdsController::blockIpsInAutoBlackList::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
            return updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, cb);
          default:
            const message = GoogleAdwordsService.getErrorCode(err);
            logger.error('AccountAdsController::blockIpsInAutoBlackList::error', message);
            return cb(message);
        }
      });
  }, callback);
};

const removeIpsOnGoogleAndAsyncIpsInDB = ({accountAds, campaignId, ipsAndCriterionsId, ipsInCustomBlackListIp, ipInSampleBlockIp, ipsInAutoBlackListIp, cb}) => {
  logger.info('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::is called\n', {campaignId});
  try{
    Async.series([
      callback => {
        if(ipsAndCriterionsId.length === 0)
        {
          return callback(null);
        }
        logger.info('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::removeIpsOnGoogleAds', {campaignId});
        
        removeIpsOnGoogleAds(accountAds.adsId, campaignId, ipsAndCriterionsId, callback);
      },
      callback => {
        if(ipsInCustomBlackListIp.length === 0)
        {
          return callback(null);
        }
        logger.info('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::UpdateIpsInCustomBlackList', {campaignId});
        BlockingCriterionsModel.updateOne({campaignId, accountId: accountAds._id}, {$set: {customBlackList: []}})
        .exec(err => {
          if(err)
          {
            return callback(err);
          }
          
          addIpsToBlackListOfOneCampaign(accountAds._id, accountAds.adsId, campaignId, ipsInCustomBlackListIp, callback);
        });
      },
      callback => {
        if(ipInSampleBlockIp.length === 0)
        {
          return callback(null);
        }

        logger.info('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::UpdateIpInSampleIps', {campaignId});
        
        blockSampleIpForOneCampaign(accountAds._id, accountAds.adsId, campaignId, ipInSampleBlockIp[0], callback);
      },
      callback => {
        if(ipsInAutoBlackListIp.length === 0)
        {
          return callback(null);
        }
        logger.info('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::UpdateIpsInAutoBlackList', {campaignId});
        BlockingCriterionsModel.updateOne({campaignId, accountId: accountAds._id}, {$set: {autoBlackListIp: []}})
        .exec(err => {
          if(err)
          {
            return callback(err);
          }
          
          blockIpsInAutoBlackList(accountAds._id, accountAds.adsId, campaignId, ipsInAutoBlackListIp, callback);
        }); 
      }
    ], error => {
      if(error)
      {
        logger.error('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::error', error, '\n' ,{campaignId});
        return cb(error);
      }
      return cb();
    });
  }catch(e){
    logger.error('AccountAdsService::removeIpsOnGoogleAndAsyncIpsInDB::error', e, '\n' ,{campaignId});
    return cb(e);
  }
};

const backUpIpOnGoogleAds = (accountAds, campaignIds) => {
  logger.info('AccountAdsService::backUpIpOnGoogleAds::is called', {campaignIds, accountAds});
  return new Promise(async (res, rej) => {
    try{
      const adsId = accountAds.adsId;
      const ipsOnGoogle = await GoogleAdwordsService.getIpBlockOfCampaigns(adsId, campaignIds);
      const filterIpWithTypeIpBlock = ipsOnGoogle.filter(ip => ip.criterion.type === 'IP_BLOCK').map(ip =>{
        return {
          campaignId: ip.campaignId,
          criterionId: ip.criterion.id,
          ip: ip.criterion.ipAddress}
        });
      
      const standardizedIpsInCampaigns = standardizedIps(filterIpWithTypeIpBlock);
      const ipsInCustomBlackListIp = accountAds.setting.customBlackList;
      const sampleBlockIp = accountAds.setting.sampleBlockingIp;
      const ipInSampleBlockIp = sampleBlockIp === '' ? [] : [sampleBlockIp];
      const ipsInAutoBlackListIp = accountAds.setting.autoBlackListIp;
      // const ips = ipsInAutoBlackListIp.concat(ipsInCustomBlackListIp, ipInSampleBlockIp);

      Async.eachSeries(campaignIds, (campaignId, cb) => {
        const ipsAndCriterionsId = standardizedIpsInCampaigns.filter(ipInfo => ipInfo.campaignId === campaignId)
        .map(ipInfo => {
          return { ip: ipInfo.ip, criterionId: ipInfo.criterionId }
        });
        return removeIpsOnGoogleAndAsyncIpsInDB({accountAds, campaignId, ipsAndCriterionsId, ipsInCustomBlackListIp, ipInSampleBlockIp, ipsInAutoBlackListIp, cb});
      }, err => {
        if(err)
        {
          logger.error('AccountAdsService::backUpIpOnGoogleAds::error', err, '\n' ,{campaignIds, accountAds});
          return rej(err);
        } 
        return res('thành công.');
      });
    }catch(e){
      logger.error('AccountAdsService::backUpIpOnGoogleAds::error', e, '\n', {campaignIds, accountAds});
      return rej(e);
    }
  });
};
/**
 * Kiểm tra danh sách google ad ids lấy từ google của user có hợp lệ để kết nối hay không
 * @param {ObjectId} userId
 * @param {string[]} googleAds
 * @return {Promise<[Object]>}
 */
const verifyGoogleAdIdToConnect = async (userId, googleAds) => {
  const tempResults = googleAds.map(ga => {
    return {
      googleAdId: ga.customerId,
      name: ga.name,
      availableToConnect: false,
      reason: ''
    }
  });

  const accountAds = await AccountAdsModel.find({
    adsId: {
      $in: googleAds.map(ga => ga.customerId)
    },
    isDeleted: false
  });

  const accountAdsObj = {};
  accountAds.forEach(a => {
    accountAdsObj[a.adsId] = a;
  });

  return tempResults.map(r => {
    if (accountAdsObj[r.googleAdId] === undefined) {
      r.availableToConnect = true;
      return r;
    }

    if (accountAdsObj[r.googleAdId].user.toString() === userId.toString()) {
      r.reason = 'Bạn đã kết nối tài khoản này';
      return r;
    }

    r.reason = 'Tài khoản google ad đã thuộc về người dùng khác';
    return r;
  });
};

const getUnique = (arr, comp) => {
  const unique = arr
      .map(e => e[comp])
       // store the keys of the unique objects
      .map((e, i, final) => final.indexOf(e) === i && i)
      // eliminate the dead keys & store unique objects
      .filter(e => arr[e]).map(e => arr[e]);

  return unique;
};

/**
 *
 * @param {string} accountKey
 * @param {Date} startTime
 * @param {Date} endTime
 * @return {Promise<void>}
 */
const getNoClickOfIps = async (accountKey, startTime, endTime, ips) => {
  logger.info('AccountAdService::getNoClickOfIps: is called\n', {accountKey, startTime, endTime, ips});
  try{
    const stages = [
      {
        $match: {
          accountKey,
          ip: {
            $in: ips
          },
          createdAt: {
            $gt: startTime,
            $lt: endTime
          },
          type: LOGGING_TYPES.CLICK
        }
      },
      {
        $group: {
          _id: "$ip",
          count: {$sum: 1}
        }
      }
    ];
    logger.info('AccountAdService::getNoClickOfIps::stages', JSON.stringify(stages));
    const results = await UserBehaviorLogsModel.aggregate(stages);
    const noClickOfIpsObj = {};
    results.forEach(r => {
      noClickOfIpsObj[r._id] = r.count;
    });
  
    return noClickOfIpsObj;
  }catch(e){
    logger.error('AccountAdService::getNoClickOfIps::error', e);
    throw e;
  }
};

const retry = async (req, retryCount, handleFn) => {
  logger.info('AccountAdService::retry is called\n');
  let count = 1;

  const fn = async () => {
    try {
      const r = await handleFn(req);
      logger.info('AccountAdService::retry::success\n');
     return r;
    } catch (e) {
      if(count <= retryCount)
      {
        logger.info('AccountAdService::retry::', count);
        count++;
        return await fn();
      }

      logger.error('AccountAdService::retry::error', e);
      throw e;
    } 
  }

  return await fn();
};

const getListOriginalCampaigns = (req) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}

  return new Promise( async (resolve, reject) => {
    if (!req.adsAccount.isConnected) {
      logger.info('AccountAdService::getListOriginalCampaigns::accountAdsNotConnected\n', info);
      return resolve({
        status   : HttpStatus.BAD_REQUEST,
        messages : ['Tài khoản chưa được kết nối']
      });
    }
  
    logger.info('AccountAdService::getListOriginalCampaigns is called\n', info);
    try {
      const result = await GoogleAdwordsService.getListCampaigns(req.adsAccount.adsId);
  
      const processCampaignList = filterTheCampaignInfoInTheCampaignList(result);
  
      logger.info('AccountAdService::getListOriginalCampaigns::success\n', info);
      return resolve({
        status    : HttpStatus.OK,
        messages  : ["Lấy danh sách chiến dịch thành công."],
        data      : { campaignList: processCampaignList }
      });
    } catch (e) {
      const message = GoogleAdwordsService.mapManageCustomerErrorMessage(e);
      logger.error('AccountAdService::getOriginalCampaigns::error', e, '\n', info);
      return reject(message);
    }
  });
};

const getListGoogleAdsOfUser = (req) => {
  return new Promise((resolve, reject) => {
    logger.info('AccountAdService::getListGoogleAdsOfUser is called. Get list google ads of google id', req.user.googleId);
    try {
      GoogleAdwordsService.getListGoogleAdsAccount(req.accessToken, req.refreshToken)
        .then(results => {

          let adsInfo = results.map(ads => { return { customerId: ads.customerId, name: ads.descriptiveName }});
          const adsIds = results.map(ads => ads.customerId);
          console.log(adsIds);

          Async.eachSeries(adsIds, (adsId, callback) => {
            GoogleAdwordsService.getAccountHierachy(req.refreshToken, adsId)
              .then(result => {
                adsInfo = result.length > 0 ? adsInfo.concat(result) : adsInfo;
                return callback()
              }).catch(e => {
              if (GoogleAdwordsService.getErrorCode(e) === 'USER_PERMISSION_DENIED') {
                logger.error('AccountAdService::getListGoogleAdsOfUser::USER_PERMISSION_DENIED');
                return callback(null);
              }
              return callback(e);
            })
          }, async err => {
            if (err) {
              logger.error('AccountAdService::getListGoogleAdsOfUser::error', err);
              return reject(err);
            }

            adsInfo = getUnique(adsInfo, 'customerId');
            const googleAds = adsInfo.length > 0 ? await verifyGoogleAdIdToConnect(req.user._id, adsInfo) : [];

            return resolve({
              status: HttpStatus.OK,
              data  : {
                googleAds
              }
            });
            
          });
        })
        .catch(err => {
          if (GoogleAdwordsService.getErrorCode(err) === 'CUSTOMER_NOT_FOUND') {
            return reject(new Error('Bạn không có tài khoản hợp lệ.'));
          }
          return reject(err);
        });
    } catch (e) {
      logger.error('AccountAdService::getListGoogleAdsOfUser::error', e);
      return reject(e);
    }
  })
};

const checkDomainHasTracking = async(websites, key) => {
  logger.info('AccountAdService::checkDomainHasTracking is called.', {websites, key});
  try{
    return await Promise.all(websites.map(async (website) => {
      const html = await Request.getHTML(website.domain);
      if (html !== null) {
        const script = AdAccountConstant.trackingScript.replace('{accountKey}', key);
        website.isValid = true;
        website.isTracking = html.indexOf(script) !== -1;
        const splitHtml = html.split('\n');
        website.isDuplicateScript = (splitHtml.filter(e => e.indexOf(trackingScript)!== -1 )).length > 1;
      } else {
        website.isValid = false;
        website.isTracking = false;
        website.isDuplicateScript = false;
      }
      return await website.save();
    }));
  }catch(e){
    throw e;
  }
};

const getAccessTokenFromGoogle = (refreshToken) => {
  logger.info('AccountAdService::getAccessTokenFromGoogle is called.', {refreshToken});
  return new Promise((resolve, reject) => {
    try{
      const body = {
        client_id    : adwordConfig.client_id,
        client_secret: adwordConfig.client_secret,
        refresh_token: refreshToken,
        grant_type   : 'refresh_token'
      };
  
      request.post({url:'https://www.googleapis.com/oauth2/v4/token', formData: body}, (err, httpResponse, body) => {
        if (err) {
          logger.error('AccountAdService::getAccessTokenFromGoogle::Error ', err);
          return reject(err);
        }

        if (httpResponse.statusCode !== HttpStatus.OK) {
          logger.error('UserController::getAccessTokenFromGoogle::error', httpResponse);
          return reject(JSON.parse(httpResponse.body));
        }

        return resolve(JSON.parse(body));
      });
    }catch(e){
      logger.error('AccountAdService::getAccessTokenFromGoogle::Error ', e);
      return reject(e);
    }
  });
};

module.exports = {
  createAccountAds,
  createAccountAdsHaveIsConnectedStatus,
  checkIpIsBlackListed,
  addIpsToBlackListOfOneCampaign,
  getAccountsAdsByUserId,
  createdCampaignArr,
  filterTheCampaignInfoInTheCampaignList,
  onlyUnique,
  removeIpsToBlackListOfOneCampaign,
  checkIpIsNotOnTheBlackList,
  createdAccountIfNotExists,
  convertCSVToJSON,
  reportTotalOnDevice,
  removeSampleBlockingIp,
  addSampleBlockingIp,
  updateIsDeletedStatus,
  saveSetUpCampaignsByOneDevice,
  getDailyClicking,
  getReportForAccount,
  getIpsInfoInClassD,
  getIpAndCampaigNumberInCustomBlockingIp,
  removeIpsToAutoBlackListOfOneCampaign,
  getIpHistory,
  checkAndConvertIP,
  getReportStatistic,
  backUpIpOnGoogleAds,
  verifyGoogleAdIdToConnect,
  getUnique,
  getNoClickOfIps,
  retry,
  getListOriginalCampaigns,
  getListGoogleAdsOfUser,
  checkDomainHasTracking,
  createAccountAdsHaveIsConnectedStatusAndConnectType,
  getAccessTokenFromGoogle,
  updateIsDeletedStatusIsTrueForCampaign
};
