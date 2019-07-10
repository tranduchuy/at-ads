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

module.exports = {
  createDomain
};
