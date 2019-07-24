const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const Async = require('async');
const _ = require('lodash');
const { GoogleCampaignStatus } = require('../account-adwords/account-ads.constant');
const DeviceConstant = require('../../constants/device.constant');

/**
 *
 * @param {string} userId
 * @param {string} adsId
 * @returns {Promise<void>}
 */
const createAccountAds = async ({ userId, adsId }) => {
  const newAccountAds = new AccountAdsModel({
    user: userId,
    adsId
  });

  return await newAccountAds.save();
};

const detectIpsShouldBeUpdated = (backList, ips) => {
    if(!backList || backList.length === 0)
    {
      return ips;
    }

    let ipsArr = [];

    ips.forEach((ip => {
      if(backList.indexOf(ip) === -1)
      {
        ipsArr.push(ip);
      }
    }));

    return ipsArr;  
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
    BlockingCriterionsModel.update({accountId, campaignId},{$push: {customBackList: infoCampaign}}).exec(err=>{
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
  const accountsAds = await AccountAdsModel.find({ user: userId });
  if (accountsAds.length !== 0) {
    const promises = accountsAds.map(async (account) => {
      const numberOfWebsites = await WebsiteModel.countDocuments({ accountAd: mongoose.Types.ObjectId(account._id) });
      return {
        id: account._id,
        adsId: account.adsId,
        createdAt: account.createdAt,
        numberOfWebsites
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

const checkCampaign = async(accountId, campaignIds) => {
  try{
     const result = await BlockingCriterionsModel
    .find({accountId:accountId, campaignId: {$in: campaignIds}})

    if(!result || result.length === 0)
    {
      return true;
    }
    return false;
  }
  catch(e)
  {
    logger.error('AccountAdsService::checkCampaign::error', e);
    return false;
  }
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

const getIdAndNameCampaignInCampaignsList = (result) => {
    return result
      .filter(campaign => campaign.status === GoogleCampaignStatus.ENABLED && campaign.networkSetting.targetGoogleSearch === true)
      .map(c => {
      return {id: c.id, name: c.name}
    });
};

const onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
};

const removeIpsToBlackListOfOneCampaign = (accountId, adsId, campaignId, ipsArr, callback) => {
  Async.eachSeries(ipsArr, (ip, cb)=> {
    const queryFindIpOfcampaign = {accountId, campaignId, "customBackList.ip": ip};
    const select = {'customBackList.$': 1};

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
          GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ip, blockingCriterionRecord.customBackList[0].criterionId)
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
    const updateingData = {$pull: {customBackList : {ip}}};

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

const checkIpsInBackList = (backList, ips) => {
    if(!backList || backList.length === 0)
    {
      return false;
    }
    return _.difference(ips, backList).length !== ips.length;
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

module.exports = {
  createAccountAds,
  detectIpsShouldBeUpdated,
  addIpsToBlackListOfOneCampaign,
  getAccountsAdsByUserId,
  checkCampaign,
  createdCampaignArr,
  getIdAndNameCampaignInCampaignsList,
  onlyUnique,
  removeIpsToBlackListOfOneCampaign,
  checkIpsInBackList,
  createdAccountIfNotExists,
  convertCSVToJSON,
  reportTotalOnDevice
};
