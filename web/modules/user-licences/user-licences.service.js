const UserModel = require('../user/user.model');
const UserLicenceModel = require('./user-licences.model');
const moment = require('moment');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

/**
 * Does user can call api google, especially when block or delete ip
 * @param {String} userId 
 * @returns {Boolean}
 */
const canCallAPIGoogle = async (userId) => {
  const licence = await UserLicenceModel.findOne({
    userId
  }).lean();
  // TODO
  if (!licence) {
    return false;
  }

  const now = moment();
  return moment(licence.expiredAt).isAfter(now);
};

module.exports = {
  canCallAPIGoogle
};