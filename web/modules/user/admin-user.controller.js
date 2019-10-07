const _ = require('lodash');
const log4js = require('log4js');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const HttpStatus = require('http-status-codes');
const logger = log4js.getLogger('Controllers');
const {convertObjectToQueryString} = require('../../utils/RequestUtil');
const requestUtil = require('../../utils/RequestUtil');
const UserModel = require('./user.model');
const WebsiteModel = require('../website/website.model');
const UserService = require('./user.service');
const UserConstants = require('./user.constant');
const UserTokenService = require('../userToken/userToken.service');
const { Paging } = require('../account-adwords/account-ads.constant');
const AdminUserService = require('./admin-user.service');

const Mongoose = require('mongoose');

const { getUsersListForAdminPageValidationSchema } = require('./validations/get-user-list-for-admin-page.schema');
const { getAccountsListForAdminPageValidationSchema } = require('./validations/get-accounts-list-for-admin-page.schema');
const { getWebsiteListForAdminPageValidationSchema } = require('./validations/get-website-for-admin-page.schema');

const list = async (req, res, next) => {
  logger.info('UserController::list::called');

  try {
    const queryStr = convertObjectToQueryString(req.query);
    const url = `${CDP_URL_APIS.USER.LIST_USER}?${queryStr}&role=3`;
    const limit = parseInt(req.query.limit || 10, 0);
    // TODO: api get list user
  } catch (e) {
    logger.error('UserController::list::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('Admin/UserController::update::called');

  try {
    const urlApi = CDP_URL_APIS.USER.UPDATE_USER_INFO.replace(':id', req.params.id);
    let {name, phone, birthday, gender, city, district, ward, type, avatar, status, expirationDate} = req.body;
    const postData = {name, phone, birthday, gender, city, district, ward, type, avatar, status, expirationDate};

    // TODO: api update user info
  } catch (e) {
    logger.error('Admin/UserController::update::error', e);
    return next(e);
  }
};

const login = async (req, res, next) => {
  logger.info('Admin/UserController::login::called');
  try {
    const {email, password} = req.body;
    const user = await UserService.findByEmail(email);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Email hoặc mật khẩu sai']
      });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Email hoặc mật khẩu sai']
      });
    }

    const userToken = await UserTokenService.createUserToken(user._id);
    logger.info('Admin/UserController::login::success. Email: ', user.email);

    const userInfoResponse = {
      _id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      type: user.type,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      registerBy: user.registerBy,
      usePassword: !!user.passwordHash || !!user.passwordSalt
    };

    return res.status(HttpStatus.OK).json({
      messages: [],
      data: {
        meta: {
          token: userToken.token
        },
        user: userInfoResponse
      }
    });
  } catch (e) {
    logger.error('Admin/UserController::login::error', e);
    return next(e);
  }
};

const getUsersListForAdminPage = async (req, res, next) => {
  logger.info('Admin/UserController::getListUserForAdminPage::is Called', { id: req.user._id });
  try{
    const { error } = Joi.validate(req.query, getUsersListForAdminPageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }
    
    const { email, name } = req.query;

    let limit = parseInt(req.query.limit || Paging.LIMIT);
    let page = parseInt(req.query.page || Paging.PAGE);

    const data = await AdminUserService.getUsersListForAdminPage(email, name, page, limit);
    let entries = [];
    let totalItems = 0;
    if(data[0].entries.length > 0)
    {
      entries = data[0].entries;
      totalItems = data[0].meta[0].totalItems
    }

    logger.info('Admin/UserController::getUsersListForAdminPage::success\n');
    res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        entries,
        totalItems
      }
    })
  }catch(e){
    logger.error('Admin/UserController::getUsersListForAdminPage::error\n', e);
    return next(e);
  }
};

const getAccountsListForAdminPage = async (req, res, next) => {
  logger.info('Admin/UserController::getAccountsListForAdminPage::is Called', { id: req.user._id });
  try{
    const { error } = Joi.validate(req.query, getAccountsListForAdminPageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }
    
    const { email } = req.query;

    let limit = parseInt(req.query.limit || Paging.LIMIT);
    let page  = parseInt(req.query.page || Paging.PAGE);

    let entries    = [];
    let totalItems = 0;

    if(email)
    {
      const userList = await UserModel.find({email: {$regex: email, $options: 'g' }});

      if(userList.length > 0)
      {
        entries           = userList;
        totalItems        = userList.length;
        const userIds     = entries.map(user => user._id);
        const adsList     = await AdminUserService.getAccountsListForAdminPage(userIds, page, limit);
        const accountList = adsList[0].entries;
        if(accountList.length < 0)
        {
          entries    = [];
          totalItems = 0;
        }
        else
        {
          let accountId     = adsList[0].entries.map(ads => ads.user.toString()).filter(AdminUserService.onlyUnique);
          accountId         = accountId.map(ads => new Mongoose.Types.ObjectId(ads));
          entries           = AdminUserService.mapAdsAccountWithUserAccount(accountList, entries);
          const adsIds      = accountList.map(ads => ads._id);
          const websiteList = await WebsiteModel.find({accountAd: {$in: adsIds}});
          entries           = AdminUserService.mapAdsAccountWithWebsiteList(entries, websiteList);
        }
      }
    }
    else
    {
      const data = await AdminUserService.getAccountsListForAdminPage([], page, limit);

      if(data[0].entries.length > 0)
      {
        entries           = data[0].entries;
        totalItems        = data[0].meta[0].totalItems;
        const adsIds      = entries.map(ads => ads._id);
        let userList      = entries.map(ads => ads.user.toString()).filter(AdminUserService.onlyUnique);
        userList          = userList.map(ads => new Mongoose.Types.ObjectId(ads));
        const usersInfo   = await UserModel.find({_id: {$in : userList}});
        const websiteList = await WebsiteModel.find({accountAd: {$in: adsIds}});
        entries           = AdminUserService.mapAdsAccountWithUserAccount(entries, usersInfo);
        entries           = AdminUserService.mapAdsAccountWithWebsiteList(entries, websiteList);
      }
    }

    logger.info('Admin/UserController::getAccountsListForAdminPage::success\n');
    res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        entries,
        totalItems
      }
    })
  }catch(e){
    logger.error('Admin/UserController::getAccountsListForAdminPage::error\n', e);
    return next(e);
  }
};

const getWebsitesListForAdminPage = async (req, res, next) => {
  logger.info('Admin/UserController::getWebsiteListForAdminPage::is Called', { id: req.user._id });
  try{
    const { error } = Joi.validate(req.query, getWebsiteListForAdminPageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
    }
    
    const { userId, accountId } = req.query;

    let limit = parseInt(req.query.limit || Paging.LIMIT);
    let page = parseInt(req.query.page || Paging.PAGE);

    const data = await AdminUserService.getWebsitesForAdminPage(userId, accountId, page, limit);
    let entries = [];
    let totalItems = 0;

    if(data[0].entries.length > 0)
    {
      entries = data[0].entries;
      totalItems = data[0].meta[0].totalItems
    }

    logger.info('Admin/UserController::getWebsiteListForAdminPage::success\n');
    res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        entries,
        totalItems
      }
    })
  }catch(e){
    logger.error('Admin/UserController::getWebsiteListForAdminPage::error\n', e);
    return next(e);
  }
};

const AdminUserController = {
  list,
  update,
  login,
  getUsersListForAdminPage,
  getAccountsListForAdminPage,
  getWebsitesListForAdminPage
};

module.exports = AdminUserController;
