const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const async = require('async');
const _ = require('lodash');

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

const addIpsToBlackListOfOneCampaign = (adsId, campaignId, ipsArr, callback) => {
  async.eachSeries(ipsArr, (ip, cb)=> {
    GoogleAdwordsService.addIpBlackList(adsId, campaignId, ip)
      .then((result) => {
        if(result)
        {
          const logData = {adsId, campaignId, ip};
          logger.info('AccountAdsService::addIpsToBlackListOfOneCampaign: ', JSON.stringify(logData));
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
    const promises = accounts
    Ads.map(async (account) => {
      const numberOfWebsites = await WebsiteModel.countDocuments({ accountAd: mongoose.Types.ObjectId(account._id) });
      return {
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
    logger.info('AccountAdsService::checkCampaign::error', JSON.stringify(e));
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
}

module.exports = {
  createAccountAds,
  detectIpsShouldBeUpdated,
  addIpsToBlackListOfOneCampaign,
  getAccountsAdsByUserId,
  checkCampaign,
  createdCampaignArr
};
