const _ = require('lodash');
const log4js = require('log4js');
const bcrypt = require('bcrypt');
const HttpStatus = require('http-status-codes');
const logger = log4js.getLogger('Controllers');
const {convertObjectToQueryString} = require('../../utils/RequestUtil');
const UserModel = require('./user.model');
const UserService = require('./user.service');
const UserConstants = require('./user.constant');
const UserTokenService = require('../userToken/userToken.service');

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
        messages: 'Email hoặc mật khẩu sai'
      });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: 'Email hoặc mật khẩu sai'
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

const AdminUserController = {
  list,
  update,
  login
};

module.exports = AdminUserController;
