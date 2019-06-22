const TokenModel = require('../models/TokenModel');
const UserModel = require('../models/UserModel');
const {get} = require('../utils/Request');
const CDP_APIS = require('../config/cdp-url-api.constant');

const urlToPassCheckingToken = [
  '/selector',
  '/api/v1/users/login',
  '/api/v1/users/register',
  '/api/v1/users/confirm',
  '/api/v1/users/confirm/resend',
  '/api/v1/users/check',
  '/api/v1/users/highlight',
  '/api/v1/users/forget-password',
  '/api/v1/users/reset-password',

  '/api/v1/sales/add',
  '/api/v1/buys/add',

  '/api/v1/images/upload',
  '/api/v1/images/get', // /api/v1/images/get/{id}
  '/api/v1/posts/click-post-sale',

  '/api/v1/search',
  '/api/v1/search/box',

  '/api/v1/tags/query',
  '/api/v1/tags/list',
  '/api/v1/tags/highlight',
  '/api/v1/tags/related',

  '/api/v1/news/highlight',
  '/api/v1/posts/latest',
  '/api/v1/posts/top/city',
  '/api/v1/news/latest',
  '/api/v1/projects/highlight',
  '/api/v1/vips/list',
  '/api/v1/vips/price',
  '/api/v1/leads/customer-focus',

  '/admin/v1/admins/login',
  '/api/v1/system'
];

const checkSuitIgnoreUrl = function (path) {
  for (let i = 0; i < urlToPassCheckingToken.length; i++) {
    if (path.indexOf(urlToPassCheckingToken[i]) === 0) {
      return true;
    }
  }

  return false;
};

const returnInvalidToken = function (req, res, next) {

  if (checkSuitIgnoreUrl(req.path)) {
    return next();
  }

  return res.json({
    status: 401,
    message: 'Invalid token',
    data: {}
  });


};

module.exports = async function (req, res, next) {
  const token = req.headers['accesstoken'] || req.query['accesstoken'];

  if (token == null || typeof token === undefined) {
    returnInvalidToken(req, res, next);
    return;
  }

  // TODO: should improve performance

  get(CDP_APIS.USER.INFO, token)
    .then((body) => {
      try {
        req.user = body.data.entries[0];
        req.user.token = token;
        return next();
      } catch (e) {
        return returnInvalidToken(req, res, next);
      }
    })
    .catch((err) => {
      return returnInvalidToken(req, res, next);
    });

  // const accessToken = await TokenModel.findOne({token: token});
  //
  // if (!accessToken) {
  //     returnInvalidToken(req, res, next);
  //     return;
  // }
  //
  // const user = await UserModel.findOne({
  //     _id: accessToken.user,
  //     status: global.STATUS.ACTIVE
  // });
  //
  // if (!user) {
  //     returnInvalidToken(req, res, next);
  //     return;
  // }
  //
  // req.user = user;
  // return next();
};
