const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const mongoose = require('mongoose');

const requestUtil = require('../../utils/RequestUtil');
const UserLicencesServices = require('../user-licences/user-licences.service');
const PackageConstant = require('../packages/packages.constant');
const AccountAdsModel = require('./account-ads.model');

const { UpdateLimitWebsiteValidationSchema } = require('./validations/update-limit-website.schema');

const updateLimitWebsite = async(req, res, next) => {
  logger.info('AdminAccountAdsController::updateLimitWebsite::is called', { accountId: req.body.accountId, limitWebsite: req.body.limitWebsite });
	try{
		const { error } = Joi.validate(req.body, UpdateLimitWebsiteValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }
    
    const { accountId, limitWebsite } = req.body;
    const accountAds = await AccountAdsModel.findOne({_id: mongoose.Types.ObjectId(accountId)});

    if(!accountAds)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["không tìm thấy tài khoản google Ads."]
      });
    }

    const userLicence = await UserLicencesServices.findUserLicenceByUserId(accountAds.user);

    if(!userLicence)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["không tìm thấy licence."]
      });
    }

    const typePackage = userLicence.packageId ? userLicence.packageId.type : '';

    if(typePackage != PackageConstant.packageTypes.CUSTOM && typePackage != PackageConstant.packageTypes.VIP1)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ["Tài khoản không thuộc gói được phép thiết lập chức năng này."]
      });
    }

    accountAds.setting.limitWebsite = limitWebsite;
    await accountAds.save();

		return res.status(HttpStatus.OK).json({
      messages: ["Thiết lập thành công."],
      data: {
        licence: userLicence,
        accountAds
      }
		});
	}catch(e){
		logger.error('AdminAccountAdsController::updateLimitWebsite::error', e);
		return next(e);
	}
};

module.exports = {
  updateLimitWebsite
}