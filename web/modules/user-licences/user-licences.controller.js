const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');

const requestUtil = require('../../utils/RequestUtil');
const PackageConstant = require('../packages/packages.constant');
const UserLicencesModel = require('./user-licences.model');

const {
  UpdateLimitGoogleAdValidationSchema
} = require('./validations/update-limit-google-ad.schema');

const updateLimitGoogleAd = async (req, res, next) => {
  logger.info('UserLicencesController::UpdateLimitGoogleAd::is called', {
    userId: req.body.userId,
    limitGoogleAd: req.body.limitGoogleAd
  });
  try {
    const { error } = Joi.validate(
      req.body,
      UpdateLimitGoogleAdValidationSchema
    );

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const {userId, limitGoogleAd} = req.body;
    const userLicence = await UserLicencesModel.findOne({ userId: mongoose.Types.ObjectId(userId) }).populate('packageId');

    if (!userLicence) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: [`Không tìm thấy licence`],
      });
    }

    const typePackage = userLicence.packageId ? userLicence.packageId.type : '';
    
    if(typePackage != PackageConstant.packageTypes.CUSTOM)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: [`Tài khoản không thuộc gói ${PackageConstant.packageTypes.CUSTOM}`],
      });
    }

    userLicence.limitGoogleAd = limitGoogleAd;
    await userLicence.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Cập nhật thành công'],
      data: userLicence
    });
  } catch (e) {
    logger.error('UserLicencesController::UpdateLimitGoogleAd::error', e);
    next(e);
  }
};

module.exports = {
  updateLimitGoogleAd
};
