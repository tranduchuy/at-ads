const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const moment = require('moment');

const requestUtil = require('../../utils/RequestUtil');
const UserLicencesModel = require('./user-licences.model');
const PackageModel = require('../packages/packages.model');

const {
  UpdatePackageForUserValidationSchema
} = require('./validations/update-package-for-user.schema');

const updatePackageForUser = async (req, res, next) => {
  logger.info(
    'AdminUserLicencesController::updatePackageForUserLicence::Is called',
    { packageId: req.body.packageId, userId: req.body.userId }
  );
  try {
    const { error } = Joi.validate(
      req.body,
      UpdatePackageForUserValidationSchema
    );

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { userId, packageId } = req.body;

    const userLicences = await UserLicencesModel.findOne({
      userId: mongoose.Types.ObjectId(userId)
    }).populate('packageId');

    if (!userLicences) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy user.']
      });
    }

    const package = await PackageModel.findOne({
      _id: mongoose.Types.ObjectId(packageId)
    });

    if (!package) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy package.']
      });
    }

    let history = userLicences.histories || [];
    history.push({
      packageId: package._id,
      name: package.name,
      type: package.type,
      price: package.price,
      createdAt: new Date()
    });
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
      expiredAt = moment().add(package.numOfDays, 'days').endOf('day');
    } else {
      expiredAt = expiredAt.add(package.numOfDays, 'days').endOf('day');
    }

    userLicences.histories = history;
    userLicences.expiredAt = expiredAt;
    userLicences.packageId = package._id;

    await userLicences.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Cập nhật thành công'],
      data: userLicences
    });
  } catch (e) {
    logger.error(
      'AdminUserLicencesController::updatePackageForUserLicence::Error',
      e
    );
    next(e);
  }
};

module.exports = {
  updatePackageForUser
};
