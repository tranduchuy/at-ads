const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const messages = require("../../constants/messages");
const requestUtil = require('../../utils/RequestUtil');
const WebsiteModel = require('./website.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const WebsiteService = require('./website.service');
const mongoose = require('mongoose');

const { DeleteDomainValidationSchema } = require("./validations/delete-domain.schema");
const { EditDomainValidationSchema } = require("./validations/edit-domain.schema");
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
    const duplicateDomain = await WebsiteModel.findOne({ domain: domain });
    if (duplicateDomain !== null) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.DOMAIN_DUPLICATE],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const accountAds = await AccountAdsModel.findById(mongoose.Types.ObjectId(accountId));
    if (!accountAds) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.ACCOUNT_ID_NOT_FOUND],
        data: {}
      };

      logger.info('WebsiteController::addDomainForAccountAds::accountIDNotFound');
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    await WebsiteService.createDomain({ domain, accountId });
    const response = {
      messages: [messages.ResponseMessages.Website.Register.REGISTER_SUCCESS],
      data: {}
    };

    logger.info('WebsiteController::addDomainForAccountAds::success');
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
    const accountAds = await AccountAdsModel.findOne({ _id: accountId });
    if (!accountAds) {
      const result = {
        messages: [messages.ResponseMessages.Website.ACCOUNT_ID_NOT_FOUND],
        data: {}
      };

      logger.info('WebsiteController::getWebsitesByAccountId::accountIDNotFound');
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    const result = {
      messages: [messages.ResponseMessages.SUCCESS],
      data: {
        website: await WebsiteService.getWebsitesByAccountId(accountId)
      }
    };
    logger.info('WebsiteController::getWebsitesByAccountId::success');
    return res.status(HttpStatus.OK).json(result);

  } catch (e) {
    logger.error('WebsiteController::getWebsitesByAccountId::error', e);
    return next(e);
  }
};

const editDomain = async (req, res, next) => {
  logger.info('WebsiteController::editDomain is called');
  try {
    const { error } = Joi.validate(Object.assign({}, req.params, req.body), EditDomainValidationSchema);
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }
    let website = await WebsiteModel.findById(mongoose.Types.ObjectId(req.params.websiteId));
    if (!website) {
      const result = {
        messages: [messages.ResponseMessages.Website.Edit.WEBSITE_NOT_FOUND]
      };

      logger.info('WebsiteController::editDomain::websiteNotFound');
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const { domain, status } = req.body;
    const dataForUpdating = {};
    if (domain) dataForUpdating.domain = domain;
    if (status) dataForUpdating.status = status;

    await website.update(dataForUpdating);
    const result = {
      messages: [messages.ResponseMessages.Website.Edit.EDIT_SUCCESS]
    };

    logger.info('WebsiteController::editDomain::success');
    return res.status(HttpStatus.OK).json(result);
  } catch (e) {
    logger.error('WebsiteController::editDomain::error', e);
    return next(e);
  }
};

const deleteDomain = async (req, res, next) => {
  logger.info('WebsiteController::deleteDomain is called', req.params.code);
  try {
    const { error } = Joi.validate(req.params, DeleteDomainValidationSchema);
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { code } = req.params;
    const website = await WebsiteModel.findOne({code});
    if (!website) {
      const result = {
        messages: [messages.ResponseMessages.Website.Delete.WEBSITE_NOT_FOUND],
      };

      logger.info('WebsiteController::deleteDomain::websiteNotFound', req.user._id, code);
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    const requestUser = req.user;
    const ownDomain = await WebsiteService.isOwnDomain(website.accountAd, requestUser._id);
    if (!ownDomain) {
      const result = {
        messages: [messages.ResponseMessages.Website.Delete.IS_NOT_OWN_DOMAIN]
      };

      logger.info('WebsiteController::deleteDomain::isNotOwnDomain', requestUser._id, code);
      return res.status(HttpStatus.UNAUTHORIZED).json(result);
    }

    await WebsiteModel.deleteOne({ code });
    const result = {
      messages: [messages.ResponseMessages.Website.Delete.DELETE_SUCCESS]
    };

    logger.info('WebsiteController::deleteDomain::success', requestUser._id, code );
    return res.status(HttpStatus.OK).json(result);

  } catch (e) {
    logger.error('WebsiteController::deleteDomain::error', e);
    return next(e);
  }
};

module.exports = {
  addDomainForAccountAds,
  getWebsitesByAccountId,
  editDomain,
  deleteDomain
};
