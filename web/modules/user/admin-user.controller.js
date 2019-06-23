const _ = require('lodash');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const {convertObjectToQueryString} = require('../../utils/RequestUtil');

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

const AdminUserController = {
  list,
  update
};

module.exports = AdminUserController;
