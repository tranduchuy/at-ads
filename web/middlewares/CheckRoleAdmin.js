/**
 * Example:
 * router.get('xxx', require('./middlewares/CheckRoleAdmin'), function(req, res, next) {...})
 */

const HttpCode = require('../config/http-code');

module.exports = async function (req, res, next) {
  if (req.user.role !== global.USER_ROLE_ADMIN && req.user.role !== global.USER_ROLE_MASTER) {
    return res.json({
      status: HttpCode.ERROR,
      message: ['Permission denied'],
      data: {}
    });
  }

  return next();
};