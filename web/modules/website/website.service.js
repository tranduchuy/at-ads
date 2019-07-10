const WebsiteModel = require('./website.model');
const crypto = require('crypto');
/**
 *
 * @param {string} domain
 * @param {string} accountId
 * @returns {Promise<void>}
 */
const createDomain = async ({ domain, accountId }) => {
  const newDomain = new WebsiteModel({
    domain,
    accountId,
    code: crypto.randomBytes(3).toString('hex')
  });
  return await newDomain.save();
};

/**
 *
 * @param accountId
 * @returns list website.
 */
const getWebsitesByAccountId = async (accountId) => {
  return await WebsiteModel.find({ accountId: accountId }).select('domain code expiredAt status');
};

module.exports = {
  createDomain,
  getWebsitesByAccountId
};
