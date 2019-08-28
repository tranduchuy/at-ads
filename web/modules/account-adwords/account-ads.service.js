const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const mongoose = require('mongoose');

const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
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
    key
  });

  return await newAccountAds.save();
};

const createAccountAdsHaveIsConnectedStatus = async ({ userId, adsId }, isConnected) => {
  const key = shortid();
  const newAccountAds = new AccountAdsModel({
    user: userId,
    adsId,
    isConnected,
    key
  });

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
            return cb();
          default:
            const message = GoogleAdwordsService.getErrorCode(err);
            logger.error('AccountAdsController::addIpsToBlackListOfOneCampaign::error', message);
            return cb(message);
        }
      });
  }, callback);
};

const addIpAndCriterionIdToTheBlacklistOfACampaign = (result, accountId, campaignId, adsId, ip, cb) => {
  if(result)
  {
    const criterionId = result.value[0].criterion.id;
    const infoCampaign ={ip, criterionId};
    BlockingCriterionsModel.update({accountId, campaignId},{$push: {customBlackList: infoCampaign}}).exec(err=>{
      if(err)
      {
        logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign:error ', err);
        return cb(err);
      }
      const logData = {adsId, campaignId, ip};
      logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign: ', logData);
    });
  }
  return cb();
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
      const websites = await WebsiteModel.find({ accountAd: mongoose.Types.ObjectId(account._id) });
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
        websites,
        key: account.key,
        campaignNumber
      }
    });
    return await Promise.all(promises);
  }
  return null;
};

const createCampaign = (accountId, campaignId) => {
  const newCampaign = new BlockingCriterionsModel({
    accountId: accountId,
    campaignId: campaignId.toString()
  })
  return newCampaign;
};

const createdCampaignArr = (accountId, campaignIds) =>
{
   let campaignIdsArr = [];

   campaignIds.forEach((campaign) => {
    const newcampaign = createCampaign(accountId, campaign);
    campaignIdsArr.push(newcampaign);
   });

   return campaignIdsArr;
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
                return removeIpAndCriterionIdToTheBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
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
                const account = {accountId, campaignId, adsId};
                return removeIpAndCriterionsIdForSampleBlockingIp(account, callback);
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
                return callback();
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
  const infoCampaign ={ip, criterionId};
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

const updateIsDeletedStatus = async (accountId, campaignId, isDeleted) => {
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
  logger.info('AccountAdsService::getReportForAccount::is called ', {accountKey, from, to});
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
            uuid: 1,
            createdAt: 1,
            isSpam: 1,
            ip: 1,
            keyword: 1,
            location: 1
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
      
      logger.info('AccountAdsService::getReportForAccount::success ', {accountKey, from, to});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getReportForAccount::error ', e, {accountKey, from, to});
      return rej(e);
    }
  });
};

const getReportStatistic = (accountKey, from, to) => {
  logger.info('AccountAdsService::getReportStatistic::is called ', {accountKey, from, to});
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
      
      logger.info('AccountAdsService::getReportStatistic::success ', {accountKey, from, to});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getReportStatistic::error ', e, {accountKey, from, to});
      return rej(e);
    }
  });
};


const getDailyClicking =  (accountKey, maxClick, page, limit) => {
  logger.info('AccountAdsService::getDailyClicking::is called ', {accountKey, maxClick, page, limit});

  return new Promise(async (res, rej)=> {
    try{
      const now = moment().startOf('day');;
      const tomorow = moment(now).endOf('day');

      const matchStage = {
          $match: {
            accountKey,
            type: LOGGING_TYPES.CLICK,
            createdAt: {
                $gte: new Date(now),
                $lt: new Date(tomorow)
            }
        }
      };

      const groupStage = { 
          $group: { 
            _id: "$ip", 
            click: { 
                $sum: 1
            },
            info: {
                $push: {
                location: '$location',
                keyword: '$keyword',
                os: '$os',
                networkCompany: '$networkCompany',
                browser: '$browser',
                createdAt: '$createdAt'
                }
            }
          }
      };

      const projectStage = {
        $project: { 
           id: 1,
           click: 1,
           info: { 
               $slice: [ "$info", -1 ]
            } 
        }
      };

      const conditionToRemove = {
        $match: {click: {$lt: maxClick}}  
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
          groupStage,
          projectStage,
          conditionToRemove,
          facetStage   
        ];
      }
      else
      {
        query = [
          matchStage,
          groupStage,
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

const getAllIpInAutoBlackListIp = (accountId) => 
{
  logger.info('AccountAdsService::getDailyClicking::is called ', {accountId});
  return new Promise(async (res, rej) => {
    try{
      const matchStage = {
          $match: {
            accountId
          }
        };
    
      const unwindStage = {
          $unwind: {
              path: "$autoBlackListIp"
          }
        };
    
      const groupStage = {
          $group: {
              _id: "$autoBlackListIp.ip",
              campaigns: {
                  $push: {
                    campaignId: "$campaignId",
                    campaignName: "$campaignName"
                  }
              }
          }
        };
    
      const lookupStage = {
          $lookup: {
              "from": "UserBehaviorLogs",
              "localField": "_id",
              "foreignField": "ip",
              "as": "logs"
          }
        };
    
      const projectStage = {
          $project: {
              _id: 1,
              campaigns: 1,
              log: {
                  $arrayElemAt: ["$logs", 0]
              }
            }
        };
    
      const projectStage1 = {
        $project: {
            _id: 1,
            campaigns: 1,
            numberOfCampaigns: {$size: "$campaigns"},
            network: "$log.networkCompany.name"
          }
        };
        
      const queryInfo = JSON.stringify([
        matchStage,
        unwindStage,
        groupStage,
        lookupStage,
        projectStage,
        projectStage1   
      ]);
      logger.info('AccountAdsService::getAllIpInAutoBlackListIp::query', {accountId, queryInfo});
      
      const result = await BlockingCriterionsModel.aggregate([
        matchStage,
        unwindStage,
        groupStage,
        lookupStage,
        projectStage,
        projectStage1    
      ]);
    
      logger.info('AccountAdsService::getAllIpInAutoBlackListIp::success ', {accountId});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getAllIpInAutoBlackListIp::error ', e, {accountId});
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
                return removeIpAndCriterionIdToTheAutoBlacklistOfACampaign(accountId, campaignId, adsId, ip, cb);
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
          browser: 1,
          os: 1,
          createdAt: 1,
          session: 1,
          isSpam: 1
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
        isSpam: 1
      };

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
      if(splitIpClassD[1] === '24' || splitIpClassD[1] === '16' || splitIpClassD[1] === '32')
      {
        if(splitIpClassD[1] == '32')
        {
          ipInfo.ip = splitIp.slice(0,3).join('.') + "." + splitIpClassD[0];
        }
        ipsArr.push(ipInfo);
      }
    }
  }); 

  return ipsArr;
};

const backUpIpOnGoogleAds = (adsId, campaignIds, accountAds) => {
  logger.info('AccountAdsService::backUpIpOnGoogleAds::is called', {adsId, campaignIds, accountAds});
  return new Promise(async (res, rej) => {
    try{
      const ipsOnGoogle =await GoogleAdwordsService.getIpBlockOfCampaigns(adsId, campaignIds);
      const filterIpWithTypeIpBlock = ipsOnGoogle.filter(ip => ip.criterion.type === 'IP_BLOCK').map(ip =>{
        return {
          campaignId: ip.campaignId,
          criterionId: ip.criterion.id,
          ip: ip.criterion.ipAddress}
        });
      
      const standardizedIpsInCampaigns = standardizedIps(filterIpWithTypeIpBlock);
      const allIpsInCampaigns = standardizedIpsInCampaigns.map(ipInfo => ipInfo.ip).filter(onlyUnique);

      Async.eachSeries(campaignIds, (campaignId, callback) => {
        const ipsInCampaign = standardizedIpsInCampaigns.filter(ipInfo => ipInfo.campaignId === campaignId).map(ipInfo => ipInfo.ip);
        const ipsNotInCampaign = _.difference(allIpsInCampaigns, ipsInCampaign);
        const ipsInCampaignAtDB = standardizedIpsInCampaigns.filter(ipInfo => ipInfo.campaignId === campaignId)
        .map(ipInfo => {
          return {ip: ipInfo.ip, criterionId: ipInfo.criterionId}
        });
        
        const queryUpdate = {
          accountId: accountAds._id,
          campaignId
        };

        const dataUpdate = {
          $set: {
            customBlackList: ipsInCampaignAtDB
          }
        };

        BlockingCriterionsModel
        .updateOne(queryUpdate, dataUpdate)
        .exec(err => {
          if(err)
          {
            logger.error('AccountAdsService::backUpIpOnGoogleAds::error', err, '\n' ,{adsId, campaignIds, accountAds});
            return rej(err);
          }
        });

        if(ipsNotInCampaign.length !== 0)
        {
           return addIpsToBlackListOfOneCampaign(accountAds._id, adsId, campaignId, ipsNotInCampaign, callback);
        }

        callback(null);
      }, err => {
        if(err)
        {
          logger.error('AccountAdsService::backUpIpOnGoogleAds::error', err, '\n' ,{adsId, campaignIds, accountAds});
          return rej(err);
        }
        accountAds.setting.customBlackList =  allIpsInCampaigns;
        accountAds.save(error => {
          if(error)
          {
            logger.error('AccountAdsService::backUpIpOnGoogleAds::error', error, '\n' ,{adsId, campaignIds, accountAds});
            return rej(error);
          }
          return res('block ip thành công.');
        });
      });
    }catch(e){
      logger.error('AccountAdsService::backUpIpOnGoogleAds::error', e, '\n', {adsId, campaignIds, accountAds});
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
      name: ga.descriptiveName,
      availableToConnect: false,
      reason: ''
    }
  });

  const accountAds = await AccountAdsModel.find({
    adsId: {
      $in: googleAds.map(ga => ga.customerId)
    }
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

    if (accountAdsObj[r.googleAdId].userId === userId) {
      r.reason = 'Bạn đã kết nối tài khoản này';
      return r;
    }

    r.reason = 'Tài khoản google ad đã thuộc về người dùng khác';
    return r;
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
  getAllIpInAutoBlackListIp,
  getIpsInfoInClassD,
  getIpAndCampaigNumberInCustomBlockingIp,
  removeIpsToAutoBlackListOfOneCampaign,
  getIpHistory,
  checkAndConvertIP,
  getReportStatistic,
  backUpIpOnGoogleAds,
  verifyGoogleAdIdToConnect
};
