const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const AccountAdsModel = require('./account-ads.model');
const messages = require("../../constants/messages");
const AccountAdsService = require("./account-ads.service");
const requestUtil = require('../../utils/RequestUtil');
const { AddAccountAdsValidationSchema } = require('./validations/add-account-ads.schema');

const addAccountAds = async (req, res, next) => {
  logger.info('AccountAdsController::addAccountAds is called');
  try {
    const { error } = Joi.validate(req.body, AddAccountAdsValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { adWordId } = req.body;
    const { _id } = req.user;
    const duplicateAdWordId = await AccountAdsModel.find({ adsId: adWordId, user: _id });
    if (duplicateAdWordId.length !== 0) {
      const result = {
        messages: [messages.ResponseMessages.AccountAds.Register.ACCOUNT_ADS_DUPLICATE],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    await AccountAdsService.createAccountAds({ userId: _id, adsId: adWordId });
    const response = {
      messages: [messages.ResponseMessages.AccountAds.Register.REGISTER_SUCCESS],
      data: {}
    };

    return res.status(HttpStatus.OK).json(response);
  } catch (e) {
    logger.error('AccountAdsController::addAccountAds::error', e);
    return next(e);
  }
};

const getAccountsAds = async (req, res, next) => {
  logger.info('AccountAdsController::getAccountsAds is called');
  try {
    const accounts = await AccountAdsService.getAccountsAdsByUserId(req.params.userId);
    if (accounts !== null) {
      const response = {
        messages: [messages.ResponseMessages.SUCCESS],
        data: {
          accounts: accounts
        }
      };
      return res.status(HttpStatus.OK).json(response);
    }

    const response = {
      messages: [messages.ResponseMessages.AccountAds.USER_ID_NOT_FOUND],
      data: {}
    };
    return res.status(HttpStatus.NOT_FOUND).json(response);

  } catch (e) {
    logger.error('AccountAdsController::getAccountsAds::error', e);
    return next(e);
  }
};

module.exports = {
  addAccountAds,
  getAccountsAds
};

