const HttpStatus = require('http-status-codes');

/**
 * @param {number[]} roles
 */
module.exports = (roles) => {
  return (req, res, next) => {
    if (roles.indexOf(req.user.role) === -1) {
      return res.json({
        status: HttpStatus.ERROR,
        message: ['Permission denied'],
        data: {}
      });
    }

    return next();
  }
}