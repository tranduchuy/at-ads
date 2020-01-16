const getListWebsites = require('./validations/get-website-for-admin-page.schema');
const Joi = require('@hapi/joi');
const requestUtil = require('../../utils/RequestUtil');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const WebsiteService = require('./website.service');
const AccountAdService = require('../account-adwords/account-ads.service');
const WebsiteModel = require('./website.model');
const UserModel = require('../user/user.model');
const AccountAdModel = require('../account-adwords/account-ads.model');
const { Paging } = require('../account-adwords/account-ads.constant');

const getWebsitesListForAdminPage = async (req, res, next) => {
	logger.info('Admin/WebsiteController::getWebsiteListForAdminPage::is Called', {
		userId: req.user._id
	});
	try {
		const { error } = Joi.validate(req.query, getListWebsites);
		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { adsId, email } = req.query;
		let limit = parseInt(req.query.limit || Paging.LIMIT);
		let page = parseInt(req.query.page || Paging.PAGE);
		const result = await WebsiteService.getWebsiteInfoforAdminPage(
			adsId,
			email,
			page,
			limit
		);

		logger.info('Admin/WebsiteController::getWebsiteListForAdminPage::success');
		res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data: {
				entries: result.entries,
				totalItems: result.totalItems
			}
		});
	} catch (e) {
		logger.error('Admin/WebsiteController::getWebsiteListForAdminPage::error', e);
		return next(e);
	}
};

const checkAttachTrackingScript = async (req, res, next) => {
	logger.info('Admin/WebsiteController::checkAttachTrackingScript::called', req.params.code);
	try {
		const {code} = req.params;
		const website = await WebsiteModel.findOne({code});

		if (!website) {
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Không tìm thấy website'],
				data: {}
			});
		}

		const adAccount = await AccountAdModel.findOne({_id: website.accountAd}).lean();
		if (!adAccount) {
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Không tìm thấy tài khoản'],
				data: {}
			});
		}

		const user = await UserModel.findOne({_id: adAccount.user}).lean();

		const resultWebsites = await AccountAdService.checkDomainHasTracking([website], adAccount.key);
		return res.status(HttpStatus.OK).json({
			messages: ['Thành công'],
			data: {
				website: Object.assign({}, resultWebsites[0].toObject(), {accountInfo: adAccount, userInfo: user})
			}
		});
	} catch (e) {
		logger.error('Admin/WebsiteController::checkAttachTrackingScript::error', e);
		return next(e);
	}
};

module.exports = {
	getWebsitesListForAdminPage,
	checkAttachTrackingScript
};
