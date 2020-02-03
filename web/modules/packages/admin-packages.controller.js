const HttpStatus = require('http-status-codes');
const requestUtil = require('../../utils/RequestUtil');
const PackageModel = require('./packages.model');
const log4js = require('log4js');
const Joi = require('@hapi/joi');
const logger = log4js.getLogger('Controllers');
const { UpdatePriceForPackageValidationSchema } = require("./validations/update-price-for-package.schema");
const mongoose = require('mongoose');
const PackageConstant = require('./packages.constant');

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

const updatePriceForPackage = async(req, res, next) => {
  try{
    logger.info('AdminPackagesController::UpdatePriceForPackage::is called', { packageId: req.params.packageId, price: req.body.price });
    const { error } = Joi.validate(Object.assign({}, req.params, req.body) , UpdatePriceForPackageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }

    const packageId = req.params.packageId;
    const price = req.body.price;
    const package = await PackageModel.findOne({_id: mongoose.Types.ObjectId(packageId)});

    if(!package){
      logger.info('AdminPackagesController::UpdatePriceForPackage::package not found');
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Gói này không tồn tại.']
      });
    }

    if(package.type == PackageConstant.packageTypes.FREE)
    {
      logger.info('AdminPackagesController::UpdatePriceForPackage::package type is free');
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ['Không thể điều chỉnh giá cho gói này.']
      });
    }

    if(package.type == PackageConstant.packageTypes.VIP1 && price == 0)
    {
      logger.info('AdminPackagesController::UpdatePriceForPackage::price of package type Vip is zero');
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ['Giá của các gói phải lớn hơn 0.']
      });
    }

    package.price = price;
    await package.save();
    
    logger.info('AdminPackagesController::UpdatePriceForPackage::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Thành công'],
			data: {
				package
			}
		});
  }catch(e){
    logger.error('AdminPackagesController::UpdatePriceForPackage::error', e);
    return next(e);
  }
};

module.exports = {
  getListPackages,
  updatePriceForPackage
}

