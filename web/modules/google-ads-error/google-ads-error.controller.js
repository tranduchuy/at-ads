const log4js = require('log4js');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const logger = log4js.getLogger('Controllers');
const requestUtil = require('../../utils/RequestUtil');
const { getErrorListForAdminPageValidationSchema } = require('../google-ads-error/validations/get-error-list-for-admin-page.schema');
const GoogleAdsErrorService = require('./google-ads-error.service');
const { Paging } = require('../account-adwords/account-ads.constant');

const getErrorListForAdminPage = async (req, res, next) => {
	logger.info('GoogleAdsError::getErrorListForAdminPage::is called', { id: req.user._id });
	try {
		const { error } = Joi.validate(req.query, getErrorListForAdminPageValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let limit = parseInt(req.query.limit || Paging.LIMIT);
		let page = parseInt(req.query.page || Paging.PAGE);

		const data = await GoogleAdsErrorService.getErrorListForAdminPage(page, limit);
		let entries = [];
		let totalItems = 0;

		if (data[0].entries.length > 0) {
			entries = data[0].entries;
			totalItems = data[0].meta[0].totalItems
		}

		logger.info('GoogleAdsError::getErrorListForAdminPage::success\n');
		res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data: {
				entries,
				totalItems
			}
		})
	} catch (e) {
		logger.error('GoogleAdsError::getErrorListForAdminPage::error\n', e);
		return next(e);
	}
};

const getErrorStatistic = async (req, res, next) => {
	try {
		logger.info('GoogleAdsError::getErrorStatistic::called');

		res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data: await GoogleAdsErrorService.statisticError()
		})
	} catch (e) {
		logger.error('GoogleAdsError::getErrorStatistic::error\n', e);
		return next(e);
	}
};

module.exports = {
	getErrorListForAdminPage,
	getErrorStatistic
};
