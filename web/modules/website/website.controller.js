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
const { checkWebsiteByCodeValidationSchema } = require('./validations/check-website-by-code.schema');
const { UpdatePopupForWebsiteValidateSchema } = require('./validations/update-popup-for-website.schema');
const { UpdatePopupStatusForWebsiteValidateSchema } = require('./validations/update-popup-status-for-website.schema');
const { CheckWebsiteByDomainValidateSchema } = require('./validations/check-website-by-domain.schema');
const { UpdateFakeCustomerForWebsiteValidationSchema } = require('./validations/update-fake-customer-for-website.schema');

const addDomainForAccountAds = async (req, res, next) => {
  logger.info('WebsiteController::addDomainForAccountAds is called, userId:', req.user._id);
  try {
    const { error } = Joi.validate(req.body, AddDomainForAccountAdsValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { domain, accountId } = req.body;

    const duplicateDomain = await WebsiteModel.findOne({ domain: domain, accountAd: mongoose.Types.ObjectId(accountId) });
    if (duplicateDomain !== null) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.DOMAIN_DUPLICATE],
        data: {}
      };

      logger.info('WebsiteController::addDomainForAccountAds::domainDuplicate::userId:', req.user._id);
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const accountAds = await AccountAdsModel.findById(mongoose.Types.ObjectId(accountId));
    if (!accountAds) {
      const result = {
        messages: [messages.ResponseMessages.Website.Register.ACCOUNT_ID_NOT_FOUND],
        data: {}
      };

      logger.info('WebsiteController::addDomainForAccountAds::accountIDNotFound::userId:', req.user._id);
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    const limitWebSite = accountAds.setting.limitWebsite;
    const websitesOfAccount = await WebsiteService.getWebsitesByAccountId(accountId);
    if (websitesOfAccount.length >= limitWebSite) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: [`Tài khoàn ${accountAds.adsId} đã đạt giới hạn ${limitWebSite} website`]
      });
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
  logger.info('WebsiteController::getWebsitesByAccountId is called, userId:', req.user._id);
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

      logger.info('WebsiteController::getWebsitesByAccountId::accountIDNotFound::userId:', req.user._id);
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
  logger.info('WebsiteController::editDomain is called, userId:', req.user._id);
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

      logger.info('WebsiteController::editDomain::websiteNotFound::userId:', req.user._id);
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
  logger.info('WebsiteController::deleteDomain is called, userId:', req.user._id, '::code:', req.params.code);
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

      logger.info('WebsiteController::deleteDomain::websiteNotFound::userId:', req.user._id, '::code:',  code);
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    const requestUser = req.user;
    const ownDomain = await WebsiteService.isOwnDomain(website.accountAd, requestUser._id);
    if (!ownDomain) {
      const result = {
        messages: [messages.ResponseMessages.Website.Delete.IS_NOT_OWN_DOMAIN]
      };

      logger.info('WebsiteController::deleteDomain::isNotOwnDomain::userId:', requestUser._id, '::code:',  code);
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    await WebsiteModel.deleteOne({ code });
    const result = {
      messages: [messages.ResponseMessages.Website.Delete.DELETE_SUCCESS]
    };

    logger.info('WebsiteController::deleteDomain::success::userId:', requestUser._id, '::code:',  code);
    return res.status(HttpStatus.OK).json(result);

  } catch (e) {
    logger.error('WebsiteController::deleteDomain::error', e);
    return next(e);
  }
};

const checkWebsiteByCode = async (req, res, next) => {
  const info = {
    userId: req.user._id,
    code: req.params.code,
  }
  logger.info('WebsiteController::checkWebsiteByCode::is called\n', info);
  try{
    const { error } = Joi.validate(req.params, checkWebsiteByCodeValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { code } = req.params;
    const domain = await WebsiteModel.findOne({code});
    
    if(!domain)
    {
      logger.info('WebsiteController::checkWebsiteByCode::websiteNotFound\n',  info);
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Không tìm thấy domain."],
      });
    }

    logger.info('WebsiteController::checkWebsiteByCode::success\n',  info);
    return res.status(HttpStatus.OK).json({
      messages: ["Kiểm tra domain thành công."],
      data: {
        domain
      }
    });
  }catch(e){
    logger.error('WebsiteController::checkWebsiteByCode::error', e, '\n', info);
    return next(e);
  }
};

const updatePopupForWebsite = async (req, res, next) => {
  const info = {
    userId: req.user._id,
    themeColor: req.body.themeColor,
    supporterAvatar: req.body.supporterAvatar,
    supporterName: req.body.supporterName,
    supporterMajor: req.body.supporterMajor,
    supporterPhone: req.body.supporterPhone,
    website: req.params.website,
  }
  logger.info('WebsiteController::updatePopupForWebsite::is called\n', info);
  try{
    const { error } = Joi.validate(Object.assign({}, req.params, req.body), UpdatePopupForWebsiteValidateSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    let themeColor = req.body.themeColor || null;
    let name = req.body.supporterName || null;
    let avatar = req.body.supporterAvatar || null;
    let major = req.body.supporterMajor || null;
    let phone = req.body.supporterPhone || null;
    let website = req.params.website;

    const websiteInfo = await WebsiteModel.findOne({_id: mongoose.Types.ObjectId(website)});

    if(!websiteInfo)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Website không tồn tại."],
      });
    }

    const accountAd = await AccountAdsModel.findOne({user: req.user._id, _id: websiteInfo.accountAd});

    if(!accountAd)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ["Website không thuộc tài khoản này."],
      });
    }

    websiteInfo.popupConfig.themeColor = themeColor; 
    websiteInfo.popupConfig.supporter.name = name;
    websiteInfo.popupConfig.supporter.avatar = avatar;
    websiteInfo.popupConfig.supporter.major = major;
    websiteInfo.popupConfig.supporter.phone = phone;

    await websiteInfo.save();
    return res.status(HttpStatus.OK).json({
      messages: ["Cập nhật popup thành công."],
      data: websiteInfo
    });
  }catch(e){
    logger.error('WebsiteController::updatePopupForWebsite::error', e, '\n', info);
    return next(e);
  }
};

const updatePopupStatusOfWebsite = async (req, res, next) => {
  const info = {
    userId: req.user._id,
    popupStatus: req.body.popupStatus,
    website: req.params.website,
  }
  logger.info('WebsiteController::updatePopupStatusOfWebsite::is called\n', info);
  try{
    const { error } = Joi.validate(Object.assign({}, req.params, req.body), UpdatePopupStatusForWebsiteValidateSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    let {popupStatus, popupPosition, autoShowPopupRepeatTime, autoShowPopup} = req.body;
    let website = req.params.website;

    const websiteInfo = await WebsiteModel.findOne({_id: mongoose.Types.ObjectId(website)});

    if(!websiteInfo)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Website không tồn tại."],
      });
    }

    if(!websiteInfo.popupConfig)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ["Popup chưa được thiết lập."],
      });
    }

    const accountAd = await AccountAdsModel.findOne({user: req.user._id, _id: websiteInfo.accountAd});

    if(!accountAd)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ["Website không thuộc tài khoản này."],
      });
    }

    if(popupStatus == false || popupStatus == true)
    {
      websiteInfo.isPopupOpening = popupStatus;
    }

    if(popupPosition)
    {
      websiteInfo.popupConfig.popupPosition = popupPosition;
    }

    if(autoShowPopupRepeatTime)
    {
      websiteInfo.popupConfig.autoShowPopupRepeatTime = autoShowPopupRepeatTime;
    }

    if(autoShowPopup == false || autoShowPopup == true)
    {
      websiteInfo.popupConfig.autoShowPopup = autoShowPopup;
    }

    await websiteInfo.save();
    return res.status(HttpStatus.OK).json({
      messages: ["Cập nhật popup thành công."],
      data: websiteInfo
    });
  }catch(e){
    logger.error('WebsiteController::updatePopupStatusOfWebsite::error', e, '\n', info);
    return next(e);
  }
};

const checkWebsiteByDomain = async (req, res, next) => {
  const info = {
    key: req.params.key,
    domain: req.query.domain,
  };
  logger.info('WebsiteController::checkWebsiteByDomain::is called\n', info);
  try{
    const { error } = Joi.validate(Object.assign({}, req.params, req.query), CheckWebsiteByDomainValidateSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const key = req.params.key;
    const domain = req.query.domain;
    const accountAd = await AccountAdsModel.findOne({key});

    if(!accountAd)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Không tìm thấy tài khoản GoogleAds."],
      });
    }

    const website = await WebsiteModel.findOne({accountAd: accountAd._id, domain});

    if(!website)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Không tìm thấy website."],
      });
    }

    return res.status(HttpStatus.OK).json({
      messages: ["Kiểm tra thành công."],
      data: website
    });
  }catch(e){
    logger.error('WebsiteController::checkWebsiteByDomain::error', e, '\n', info);
    return next(e);
  }
};

const updateFakeCustomerForWebsite = async (req, res, next) => {
  try{
    logger.info('WebsiteController::updateFakeCustomerForWebsite::is called');
    const { error } = Joi.validate(Object.assign({}, req.params, req.body), UpdateFakeCustomerForWebsiteValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const websiteId = req.params.website;
    let websiteInfo = await WebsiteModel.findOne({_id: mongoose.Types.ObjectId(websiteId)});

    if(!websiteInfo)
    {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ["Website không tồn tại."],
      });
    }

    const accountAd = await AccountAdsModel.findOne({user: req.user._id, _id: websiteInfo.accountAd});

    if(!accountAd)
    {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ["Website không thuộc tài khoản này."],
      });
    }

    websiteInfo = await WebsiteService.filterFakeCustomerData(req, websiteInfo);

    return res.status(HttpStatus.OK).json({
      messages: ["Thành công."],
      website: websiteInfo
    });
  }catch(e){
    logger.error('WebsiteController::updateFakeCustomerForWebsite::error', e);
    return next(e);
  }
};

module.exports = {
  addDomainForAccountAds,
  getWebsitesByAccountId,
  editDomain,
  deleteDomain,
  checkWebsiteByCode,
  updatePopupForWebsite,
  updatePopupStatusOfWebsite,
  checkWebsiteByDomain,
  updateFakeCustomerForWebsite
};
