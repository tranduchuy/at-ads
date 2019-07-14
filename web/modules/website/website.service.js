const WebsiteModel = require('./website.model');
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
        accountId,
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
  return await WebsiteModel.find({ accountId }).select('domain code expiredAt status');
};

module.exports = {
  createDomain,
  getWebsitesByAccountId
};
