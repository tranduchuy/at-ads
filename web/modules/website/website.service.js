const WebsiteModel = require('./website.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const mongoose = require('mongoose');
const crypto = require('crypto');
/**
 *
 * @param {string} domain
 * @param {string} accountId
 * @returns {Promise<void>}
 */
const createDomain = async ({ domain, accountId }) => {
  let flag = true;
  while (flag) {
    const code = crypto.randomBytes(3).toString('hex');
    const website = await WebsiteModel.findOne({ code });
    if (!website) {
      flag = false;
      const newDomain = new WebsiteModel({
        domain,
        accountAd: mongoose.Types.ObjectId(accountId),
        code
      });
      return await newDomain.save();
    }
  }

};

/**
 *
 * @param {string} accountId
 * @returns {Promise<[{domain: string, code: string, expiredAt: Date, status: number}]>} list website.
 */
const getWebsitesByAccountId = async (accountId) => {
  return await WebsiteModel.find({ accountAd: mongoose.Types.ObjectId(accountId) }).select('domain code expiredAt status');
};

/**
 *
 * @param {ObjectId}accountId
 * @param {ObjectId}userId
 * @returns {Promise<boolean>}
 */
const isOwnDomain = async (accountId, userId) => {
  const account = await AccountAdsModel.findById(accountId);
  return account.user === userId.toString();
};

module.exports = {
  createDomain,
  getWebsitesByAccountId,
  isOwnDomain
};
