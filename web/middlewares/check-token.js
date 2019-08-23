const UserModel = require('../modules/user/user.model');
const UserTokenModel = require('../modules/userToken/userToken.model');
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

module.exports = async (req, res, next) => {
  try{
    const token = req.headers[GlobalConstant.ApiTokenName] || req.query[GlobalConstant.ApiTokenName];

    if (token === null || token === undefined || token === '') {
      returnInvalidToken(req, res, next);
      return;
    } 

    let userToken = await UserTokenModel.findOne({token})

    if(!userToken)
    {
      returnInvalidToken(req, res, next);
      return;
    }

    const user = await UserModel.findOne({
      _id: userToken.userId
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
