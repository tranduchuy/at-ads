const messages = require("../../constants/messages");
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require("http-status-codes");
const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const { getDetailIpClickValidationSchema } = require('./validations/get-detail-ip-click.schema')
const ReportService = require('./report.service');
const requestUtil = require('../../utils/RequestUtil');

const getIPClicks = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId,
		ip   : req.params.ip
	};

	// if(!req.adsAccount.isConnected){
	//   logger.info('ReportController::getIPClicks::accountAdsNotConnected\n', info);
	//   return res.status(HttpStatus.BAD_REQUEST).json({
	//     messages: ['Tài khoản chưa được kết nối']
	//   });
	// }

	logger.info('ReportController::getIPClicks is called\n', info);
	try {

		const { ip } = req.params;

		const stages = ReportService.buildStageGetIPClicks({
			ip        : ip,
			accountKey: req.adsAccount.key
		});

		console.log('ReportController::getIPClicks::stages ', JSON.stringify(stages));

		const result = await UserBehaviorLogModel.aggregate(stages);

		const response = {
			status  : HttpStatus.OK,
			messages: [messages.ResponseMessages.SUCCESS],
			data    : result
		};

		return res.status(HttpStatus.OK).json(response);

	} catch (e) {
		logger.error('ReportController::getIPClicks::error', e);
		return next(e);
	}
};

const getDetailIPClick = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId,
		ip   : req.params.ip
	};

	// if(!req.adsAccount.isConnected){
	//   logger.info('ReportController::getDetailIPClick::accountAdsNotConnected\n', info);
	//   return res.status(HttpStatus.BAD_REQUEST).json({
	//     messages: ['Tài khoản chưa được kết nối']
	//   });
	// }

	logger.info('ReportController::getDetailIPClick is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getDetailIpClickValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}
		const { ip } = req.params;
		const { startId, endId } = req.query;
		const startLog = await UserBehaviorLogModel.findOne({ _id: startId });
		if (!startLog) {
			logger.error('ReportController::getDetailIPClick::error. log id (startId) not found', startId);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: [
					'Yêu cầu không hợp lệ'
				]
			})
		}

		const endLog = await UserBehaviorLogModel.findOne({ _id: endId });
		if (!endLog) {
			logger.error('ReportController::getDetailIPClick::error. log id (endLog) not found', endId);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: [
					'Yêu cầu không hợp lệ'
				]
			})
		}

		const stages = ReportService.buildStageGetDetailIPClick({
			ip        : ip,
			accountKey: req.adsAccount.key,
			startTime : startLog ? startLog.createdAt : null,
			endTime   : endLog ? endLog.createdAt : null
		});

		const result = await UserBehaviorLogModel.aggregate(stages);

		const response = {
			status  : HttpStatus.OK,
			messages: [messages.ResponseMessages.SUCCESS],
			data    : result
		};

		return res.status(HttpStatus.OK).json(response);

	} catch (e) {
		logger.error('ReportController::getDetailIPClick::error', e);
		return next(e);
	}
};

module.exports = {
	getIPClicks,
	getDetailIPClick
};
