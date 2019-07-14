const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const messages = require("../../constants/messages");
const requestUtil = require('../../utils/RequestUtil');
const WebsiteModel = require('./website.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const WebsiteService = require('./website.service');

const { GetWebsitesValidationSchema } = require("./validations/get-websites.schema");
const { AddDomainForAccountAdsValidationSchema } = require('./validations/add-domain.schema');

const addDomainForAccountAds = async (req, res, next) => {
  logger.info('WebsiteController::addDomainForAccountAds is called');
  try {
    const { error } = Joi.validate(req.body, AddDomainForAccountAdsValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { domain, accountId } = req.body;
    const duplicateDomain = await WebsiteModel.find({ domain: domain });
    if (duplicateDomain.length !== 0) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.DOMAIN_DUPLICATE],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const accountAds = await AccountAdsModel.find({ _id: accountId });
    if (accountAds.length === 0) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.ACCOUNT_ID_NOT_FOUND],
        data: {}
      };
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    await WebsiteService.createDomain({ domain, accountId });
    const response = {
      messages: [messages.ResponseMessages.Website.Register.REGISTER_SUCCESS],
      data: {}
    };

    return res.status(HttpStatus.OK).json(response);

  } catch (e) {
    logger.error('WebsiteController::addDomainForAccountAds::error', e);
    return next(e);
  }
};

const getWebsitesByAccountId = async (req, res, next) => {
  logger.info('WebsiteController::getWebsitesByAccountId is called');
  try {
    const { error } = Joi.validate(req.query, GetWebsitesValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }
    const accountId = req.query.accountId;
    const accountAds = await AccountAdsModel.find({ _id: accountId });
    if (accountAds.length === 0) {
      const result = {
        messages: [messages.ResponseMessages.Website.ACCOUNT_ID_NOT_FOUND],
        data: {}
      };
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    const result = {
      messages: [messages.ResponseMessages.SUCCESS],
      data: {
        website: await WebsiteService.getWebsitesByAccountId(accountId)
      }
    };
    return res.status(HttpStatus.OK).json(result);

  } catch (e) {
    logger.error('WebsiteController::getWebsitesByAccountId::error', e);
    return next(e);
  }
};

module.exports = {
  addDomainForAccountAds,
  getWebsitesByAccountId
};
