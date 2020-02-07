const HttpStatus = require('http-status-codes');
const requestUtil = require('../../utils/RequestUtil');
const PackageModel = require('./packages.model');
const log4js = require('log4js');
const Joi = require('@hapi/joi');
const logger = log4js.getLogger('Controllers');
const { UpdateElementOfPackageValidationSchema } = require("./validations/update-element-of-package.schema");
const mongoose = require('mongoose');
const PackageServices = require('./packages.service');

const getListPackages = async (req, res, next) => {
  try{
    logger.info('AdminPackagesController::getListPackages::is called');

    const packages = await PackageModel.find().lean();

		logger.info('AdminPackagesController::getListPackages::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Thành công'],
			data: {
				packages
			}
		});
  }catch(e){
    logger.error('AdminPackagesController::getListPackages::error', e);
    return next(e);
  }
};

const updateElementOfPackage = async(req, res, next) => {
  try{
    logger.info('AdminPackagesController::updateElementOfPackage::is called', { packageId: req.params.packageId, price: req.body.price });
    const { error } = Joi.validate(Object.assign({}, req.params, req.body) , UpdateElementOfPackageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }

    const packageId = req.params.packageId;
    let package = await PackageModel.findOne({_id: mongoose.Types.ObjectId(packageId)});

    if(!package){
      logger.info('AdminPackagesController::updateElementOfPackage::package not found');
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Gói này không tồn tại.']
      });
    }

    const info = await PackageServices.filterDataUpdatePackage(req, package);
    
    logger.info('AdminPackagesController::updateElementOfPackage::success');
		return res.status(info.status).json(info.info);
  }catch(e){
    logger.error('AdminPackagesController::updateElementOfPackage::error', e);
    return next(e);
  }
};

module.exports = {
  getListPackages,
  updateElementOfPackage
}

