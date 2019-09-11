const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');

const UserConstant = require('../modules/user/user.constant');

module.exports = (req, res, next) => {
    logger.info('Middlewares::check-user-admin is called\n', { userId: req.user._id});
    try{
        if(req.user.role !== UserConstant.role.admin && req.user.role !== UserConstant.role.master)
        {
            logger.info('Middlewares::check-user-admin::notAuthorized\n', { userId: req.user._id});
            return res.status(HttpStatus.BAD_REQUEST).json({
                messages: ["Tài khoản Không có quyền."],
            });
        }

        logger.info('Middlewares::check-user-admin::success\n', { userId: req.user._id});
        return next();
    }
    catch(e)
    {
        logger.error('Middlewares::check-user-admin::error ', e, '\n', { userId: req.user._id});
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Lỗi không xác định']
        })
    }
}