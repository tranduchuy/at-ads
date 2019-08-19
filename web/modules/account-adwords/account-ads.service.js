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
  Async.eachSeries(ipsArr, (ip, cb)=> {
    GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
      .then((result) => {
        addIpAndCriterionIdToTheBlacklistOfACampaign(result, accountId, campaignId, adsId, ip, cb);
      })
      .catch(err => cb(err));
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
    user: userId.toString(),
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
          logger.info('AccountAdsService::RemoveIpsToBlackListOfOneCampaign:error ', errQuery);
          return cb(errQuery);
        }
        if(blockingCriterionRecord)
        {
          GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ip, blockingCriterionRecord.customBlackList[0].criterionId)
            .then((result) => {
              removeIpAndCriterionIdToTheBlacklistOfACampaign(result, accountId, campaignId, adsId, ip, cb);
            })
            .catch(err => cb(err));
        }
        else { return cb(null); }
    });
  }, callback);
};

const removeIpAndCriterionIdToTheBlacklistOfACampaign = (result, accountId, campaignId, adsId, ip, cb) => {
  if(result)
  {
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
        return cb();
    });
  }
  else { return cb(null); }
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
            logger.info('AccountAdsService::removeSampleBlockingIp:error ', errQuery);
            return callback(errQuery);
          }
          if(!blockingCriterionRecord)
          {
            return callback(null);
          }

          GoogleAdwordsService.removeIpBlackList(adsId, campaignId, blockingCriterionRecord.sampleBlockingIp.ip, blockingCriterionRecord.sampleBlockingIp.criterionId)
          .then(result => {
            const accountInfo = {result, accountId, campaignId, adsId};
            removeIpAndCriterionsIdForSampleBlockingIp(accountInfo, callback);
          }).catch(error => callback(error));
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
 * @param {{result: object, accountId: string, campaignId: string, adsId: string}} accountInfo 
 * @param {*} callback 
 */

const removeIpAndCriterionsIdForSampleBlockingIp = (accountInfo, callback) => {
  if(!accountInfo.result)
  {
    return callback(null);
  }

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
      return callback();
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
        .catch(err => callback(err));
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

const getReportForAccount = (accountKey, from, to) => {
  logger.info('AccountAdsService::getReportForAccount::is called ', {accountKey, from, to});
  return new Promise(async (res, rej) => {
    try{
      const matchStage =  {
          $match: {
              accountKey,
              type: 1,
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
            logs: {
              $push: {
                  uuid: "$uuid",
                  createdAt: "$createdAt",
                  isSpam: "$isSpam",
                  ip: "$ip",
                  keyword: "$keyword",
                  location: "$location"
              }
          }
        }
      };

      const queryInfo = JSON.stringify([
        matchStage,
        sort,
        groupStage  
      ]);
      logger.info('AccountAdsService::getReportForAccount::query', {queryInfo});

      const result = await UserBehaviorLogsModel.aggregate(
        [
            matchStage,
            sort,
            groupStage
        ]);
      
      logger.info('AccountAdsService::getReportForAccount::success ', {accountKey, from, to});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getReportForAccount::error ', e, {accountKey, from, to});
      return rej(e);
    }
  });
};

const getDailyClicking =  (accountKey, maxClick, page, limit) => {
  logger.info('AccountAdsService::getDailyClicking::is called ', {accountKey});

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

      logger.info('AccountAdsService::getDailyClicking::success ', {accountKey});
      return res(result);
    }catch(e){
      logger.error('AccountAdsService::getDailyClicking::error ', e, {accountKey});
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
              campaignIds: {
                  $push: "$campaignId"
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
              campaignIds: 1,
              log: {
                  $arrayElemAt: ["$logs", 0]
              }
            }
        };
    
      const projectStage1 = {
        $project: {
            _id: 1,
            campaignIds: 1,
            numberOfCampaigns: {$size: "$campaignIds"},
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
  getIpAndCampaigNumberInCustomBlockingIp
};
