const AccountAdsModel = require('./account-ads.model');
const WebsiteModel = require('../website/website.model');
const log4js = require('log4js');

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

/**
 *
 * @param {String}userId
 * @returns {array} account | null
 */
const getAccountsAdsByUserId = async (userId) => {
  const accountsAds = await AccountAdsModel.find({ user: userId });
  if (accountsAds.length !== 0) {
    const promises = accountsAds.map(async (account) => {
      const numberOfWebsites = await WebsiteModel.countDocuments({ accountId: account._id });
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


module.exports = {
  createAccountAds,
  getAccountsAdsByUserId
};
