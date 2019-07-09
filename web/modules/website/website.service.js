const WebsiteModel = require('./website.model');
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
    code: '3'
  });
  // TODO: Confirm rule when generate field code.
  return await newDomain.save();
};

module.exports = {
  createDomain
};
