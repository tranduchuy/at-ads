const UserModel = require('../modules/user/user.model');
const config = require('config');
const jwt = require('jsonwebtoken');
const GlobalConstant = require('../constants/global.constant');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');

const returnInvalidToken = function (req, res) {
  return res.status(HttpStatus.UNAUTHORIZED).json({
    message: 'Invalid token',
    data: {}
  });
};

module.exports = async function (req, res, next) {
  try{
    const token = req.headers[GlobalConstant.ApiTokenName] || req.query[GlobalConstant.ApiTokenName];

    if (token === null || token === undefined || token === '') {
      returnInvalidToken(req, res, next);
      return;
    }

    let userInfo = jwt.verify(token, config.get('jwt').secret);

    const user = await UserModel.findOne({
      _id: userInfo._id
    });

    if (!user) {
      returnInvalidToken(req, res, next);
      return;
    }

    req.user = user;
    return next();
  }catch(e){
    logger.error('Middlewares::check-token::error ', e);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      messages: ['Lỗi không xác định'],
    });
  }
};
