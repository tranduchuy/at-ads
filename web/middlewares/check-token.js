const UserModel = require('../modules/user/user.model');
const UserTokenModel = require('../modules/userToken/userToken.model');
const GlobalConstant = require('../constants/global.constant');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');
const UserConstant = require('../modules/user/user.constant');

const returnInvalidToken = function (req, res) {
	return res.status(HttpStatus.UNAUTHORIZED).json({
		message: 'Invalid token',
		data: {}
	});
};

module.exports = async (req, res, next) => {
	try {
		const token = req.headers[GlobalConstant.ApiTokenName] || req.query[GlobalConstant.ApiTokenName];
		const standForUserId = req.headers[GlobalConstant.StandFor] || req.query[GlobalConstant.StandFor];

		if (token === null || token === undefined || token === '') {
			returnInvalidToken(req, res, next);
			return;
		}

		let userToken = await UserTokenModel.findOne({ token });
		if (!userToken) {
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

		if (standForUserId) {
			if ([UserConstant.role.admin, UserConstant.role.master].indexOf(user.role) === -1) {
				return returnInvalidToken(req, res, next);
			}

			const standForUser = await UserModel.findOne({
				_id: standForUserId
			});

			if (standForUser) {
				req.standBy = user;
				req.user = standForUser;
				return next();
			}
		}

		req.user = user;
		return next();
	} catch (e) {
		logger.error('Middlewares::check-token::error ', e);
		return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
			messages: ['Lỗi không xác định'],
		});
	}
};
