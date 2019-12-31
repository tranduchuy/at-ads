const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const mongoose = require('mongoose');
const requestUtil = require('../../utils/RequestUtil');

const CustomerInfomationsModel = require('../customer-infomation/customer-infomation.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const UserBehaviorLogsModel = require('../user-behavior-log/user-behavior-log.model');
const CustomerInfomationsServices = require('./customer-infomation.service');

const { AddCustomerInfomationValidationSchema } = require('./validations/add-customer-infomation.schema');

const addCustomerInfomation = async(req, res, next) => {
  const info = {
    uuid: req.params.uuid,
    name: req.body.name,
    phone: req.body.phoneNumber,
    email: req.body.email,
    domain: req.body.domain,
    key: req.body.key
  }
  logger.info("CustomerInfomationsControllers::addCustomerInfomation::is called", info);
  try{
    const { error } = Joi.validate(Object.assign({}, req.params, req.body), AddCustomerInfomationValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }

    const uuid = req.params.uuid;
    const { name, phoneNumber, email, domain, key } = req.body;
    const accountAd = await AccountAdsModel.findOne({key});

    if(!accountAd)
    {
      logger.info("CustomerInfomationsControllers::addCustomerInfomation::accountAds not found");
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Không tìm thấy tài khoản googleAds."]
      });
    }

    const log = await UserBehaviorLogsModel.findOne({uuid,  accountKey: key});

    if(!log)
    {
      logger.info("CustomerInfomationsControllers::addCustomerInfomation::uuid not found");
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Uuid không tồn tại."]
      });
    }

    let customer = await CustomerInfomationsModel.findOne({uuid, key});
    let splitNumber = phoneNumber.split('');
    splitNumber[0] = '+84';
    splitNumber = splitNumber.join('');

    if(!customer)
    {
      await CustomerInfomationsServices.createdCustomerInfo({uuid, name, splitNumber, email, domain, key});

      logger.info("CustomerInfomationsControllers::addCustomerInfomation::success");
      return res.status(HttpStatus.OK).json({
        messages: ["Thêm thông tin thành công."]
      });
    }

    if(customer.customerInfo.filter(info => info.domain == domain).length > 0)
    {
      if(customer.customerInfo.filter(info => info.phoneNumber == splitNumber).length > 0)
      {
        logger.info("CustomerInfomationsControllers::addCustomerInfomation::phoneNumber duplicate");
        return res.status(HttpStatus.OK).json({
          messages: ["Thêm thông tin thành công."]
        });
      }
    }

    customer.customerInfo.push({
      name,
      phoneNumber: splitNumber,
      email,
      domain,
      createdAt: new Date()
    });
    await customer.save();

    logger.info("CustomerInfomationsControllers::addCustomerInfomation::success");
    return res.status(HttpStatus.OK).json({
			messages: ["Thêm thông tin thành công."]
		});
  }catch(e){
    logger.error("CustomerInfomationsControllers::addCustomerInfomation::error", JSON.stringify(e));
    return next(e);
  }
};

module.exports = {
  addCustomerInfomation
};
