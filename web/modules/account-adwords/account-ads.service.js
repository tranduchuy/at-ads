const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const async = require('async');
const _ = require('lodash');
const { GoogleCampaignStatus } = require('../account-adwords/account-ads.constant');

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
  async.eachSeries(ipsArr, (ip, cb)=> {
    GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
      .then((result) => {
        if(result)
        {
          const criterionId = result.value[0].criterion.id;
          const infoCampaign ={ip, criterionId};
          BlockingCriterionsModel.update({accountId, campaignId},{$push: {customBackList: infoCampaign}}).exec(err=>{
            if(err)
            {
              logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign:error ', JSON.stringify(err));
              return cb(err);
            }
            const logData = {adsId, campaignId, ip};
            logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign: ', JSON.stringify(logData));
          });
        }
        return cb();
      })
      .catch(err => cb(err));
  }, callback);
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
    logger.error('AccountAdsService::checkCampaign::error', JSON.stringify(e));
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

const addNewIpsToBacklistArr = (oldBacklistArr, ips) => {
  ips.forEach(ip=>{
    oldBacklistArr.push(ip);
  });

  return oldBacklistArr;
};

const onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
};

const RemoveIpsToBlackListOfOneCampaign = (accountId, adsId, campaignId, ipsArr, callback) => {
  async.eachSeries(ipsArr, (ip, cb)=> {
    const queryFindIpOfcampaign = {accountId, campaignId, "customBackList.ip": ip};
    const select = {'customBackList.$': 1};

    BlockingCriterionsModel
    .findOne(queryFindIpOfcampaign, select)
    .exec((errIp, resultIp) => {
        if(errIp)
        {
          logger.info('AccountAdsService::RemoveIpsToBlackListOfOneCampaign:error ', JSON.stringify(errIp));
          return cb(errIp);
        }
        if(resultIp)
        {
          GoogleAdwordsService.removeIpBlackList(adsId, campaignId, ip, resultIp.customBackList[0].criterionId)
            .then((result) => {
              if(result)
              {
                const queryUpdate = {accountId, campaignId};
                const updateingData = {$pull: {customBackList : {ip}}};

                BlockingCriterionsModel.update(queryUpdate, updateingData).exec((e) => {
                    if(e)
                    {
                      logger.error('AccountAdsService::RemoveIpsToBlackListOfOneCampaign:error ', JSON.stringify(e));
                      return cb(e);
                    }
                    
                    const logData = {adsId, campaignId, ip};
                    logger.info('AccountAdsService::RemoveIpsToBlackListOfOneCampaign: ', JSON.stringify(logData));
                });
              }
            })
            .catch(err => cb(err));
        }
        cb();
    });
  }, callback);
};

const checkIpsInBackList = (backList, ips) => {
    if(!backList || backList.length === 0)
    {
      return false;
    }
    else 
    {
      const ipsArr = _.difference(ips, backList);

      if(ipsArr.length === 0)
      {
        return true;
      }
      return false;
    }
};

module.exports = {
  createAccountAds,
  detectIpsShouldBeUpdated,
  addIpsToBlackListOfOneCampaign,
  getAccountsAdsByUserId,
  checkCampaign,
  createdCampaignArr,
  getIdAndNameCampaignInCampaignsList,
  addNewIpsToBacklistArr,
  onlyUnique,
  RemoveIpsToBlackListOfOneCampaign,
  checkIpsInBackList 
};
