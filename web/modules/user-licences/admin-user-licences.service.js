const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const moment = require('moment');

const PackageConstant = require('../packages/packages.constant');

const filterExpiredAt = ({ userLicences, package, expiredAtOfUserLicence }) => {
  logger.info('AdminUserLicencesServices::filterExpiredAt::is Called', {});
  try {
    let expiredAt = userLicences.expiredAt
      ? moment(userLicences.expiredAt)
      : moment();
    const packageType = userLicences.packageId
      ? userLicences.packageId.type
      : '';

    if (
      !userLicences.packageId ||
      packageType != package.type ||
      expiredAt.isBefore(moment())
    ) {
      if (package.type == PackageConstant.packageTypes.FREE) {
        expiredAt = moment()
          .add(package.numOfDays, 'days')
          .endOf('day');
      } else {
        expiredAt = expiredAtOfUserLicence
          ? expiredAtOfUserLicence
          : moment()
              .add(package.numOfDays, 'days')
              .endOf('day');
      }
    } else {
      if (package.type == PackageConstant.packageTypes.FREE) {
        expiredAt = expiredAt.add(package.numOfDays, 'days').endOf('day');
      } else {
        expiredAt = expiredAtOfUserLicence
          ? expiredAtOfUserLicence
          : expiredAt.add(package.numOfDays, 'days').endOf('day');
      }
    }

    return expiredAt;
  } catch (e) {
    logger.error('AdminUserLicencesServices::filterExpiredAt::error', e);
    throw e;
  }
};

module.exports = {
  filterExpiredAt
};
