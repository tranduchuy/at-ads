const AccountAdsModel = require('./account-ads.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const async = require('async');

/**
 *
 * @param {string} userId
 * @param {string} adsId
 * @returns {Promise<void>}
 */
const createAccountAds = async ({userId, adsId }) => {
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

module.exports = {
  createAccountAds,
  detectIpsShouldBeUpdated,
  addIpsToBlackListOfOneCampaign
};
