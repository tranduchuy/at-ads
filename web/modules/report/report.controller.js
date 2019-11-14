const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require("http-status-codes");
const moment = require('moment');
const mongoose = require('mongoose');

const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const WebsiteModel = require('../website/website.model');

const { getDetailIpClickValidationSchema } = require('./validations/get-detail-ip-click.schema');
const { getTrafficSourceStatisticByDayValidationSchema } = require('./validations/get-traffic-source-statistic-by-day.schema');
const { getTrafficSourceLogsValidationSchema } = require('./validations/get-traffic-source-logs.schema');
const { getIpsInAutoBlackListOfAccountValidationSchema } = require('./validations/get-ips-in-auto-black-list-of-account.schema');
const { statisticsOfGoogleErrorsAndNumberOfRequestsSchemaValidation } = require('./validations/statistics-of-google-errors-and-number-of-requests.schema');

const ReportService = require('./report.service');
const ClickReportService = require('../click-report/click-report.service');
const requestUtil = require('../../utils/RequestUtil');
const messages = require("../../constants/messages");
const { Paging } = require("../account-adwords/account-ads.constant");
const AdAccountConstant = require('../account-adwords/account-ads.constant');

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
		let { page, limit } = req.query;

		if (!page) {
			page = Paging.PAGE;
		}

		if (!limit) {
			limit = Paging.LIMIT;
		}

		page = Number(page);
		limit = Number(limit);

		const stages = ReportService.buildStageGetIPClicks({
			ip        : ip,
			accountKey: req.adsAccount.key
		}, page, limit);

		logger.info('ReportController::getIPClicks::stages ', JSON.stringify(stages));
		const result = await UserBehaviorLogModel.aggregate(stages);
		const last = await UserBehaviorLogModel
			.findOne({
				ip        : ip,
				accountKey: req.adsAccount.key
			})
			.sort({
				createdAt: -1
			});

		const response = {
			status  : HttpStatus.OK,
			messages: [messages.ResponseMessages.SUCCESS],
			data    : {
				meta : {
					totalItems: result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0,
				},
				items: result[0].entries,
				last
			}
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
		// if (!startLog) {
		// 	logger.error('ReportController::getDetailIPClick::error. log id (startId) not found', startId);
		// 	return res.status(HttpStatus.BAD_REQUEST).json({
		// 		messages: [
		// 			'Yêu cầu không hợp lệ'
		// 		]
		// 	});
		// }

		const endLog = await UserBehaviorLogModel.findOne({ _id: endId });
		if (!endLog) {
			logger.error('ReportController::getDetailIPClick::error. log id (endLog) not found', endId);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: [
					'Yêu cầu không hợp lệ'
				]
			});
		}

		const stages = ReportService.buildStageGetDetailIPClick({
			ip        : ip,
			accountKey: req.adsAccount.key,
			startTime : startLog ? startLog.createdAt : null,
			endTime   : endLog ? endLog.createdAt : null
		});
		logger.info('ReportController::getDetailIPClick::stages', stages);

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

const getTrafficSourceStatisticByDay = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId,
		from : req.query.from,
		to   : req.query.to,
		website: req.query.website
	};

	logger.info('ReportController::getTrafficSourceStatisticByDay is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getTrafficSourceStatisticByDayValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}
		let { from, to, website } = req.query;
		from = moment(Number(from)).startOf('day');
		to = moment(Number(to)).endOf('day');

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::getTrafficSourceStatisticByDay::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		let websiteInfo = null;

		if(website)
		{
			websiteInfo = await WebsiteModel.findOne({_id: mongoose.Types.ObjectId(website), accountAd: req.adsAccount._id});
			console.log(websiteInfo);
		}

		if(!websiteInfo && website)
		{
			logger.info('AccountAdsController::getTrafficSourceStatisticByDay::website not found\n', info);
			return res.status(HttpStatus.NOT_FOUND).json({
				messages: ['Không tìm thấy website.']
			});
		}

		const accountKey = req.adsAccount.key;
		let result = await ReportService.getTrafficSourceStatisticByDay(accountKey, websiteInfo, from, to);
		result.sort((trafficSource, trafficSource1) => trafficSource1.sessionCount - trafficSource.sessionCount);

		logger.info('AccountAdsController::getTrafficSourceStatisticByDay::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công'],
			data    : {
				TrafficSourceData: result
			}
		});
	} catch (e) {
		logger.error('ReportController::getTrafficSourceStatisticByDay::error', e);
		return next(e);
	}
};

const getTrafficSourceLogs = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId,
		from : req.query.from,
		to   : req.query.to,
		page : req.query.page,
		limit: req.query.limit,
		website: req.query.website
	};

	logger.info('ReportController::getTrafficSourceLogs is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getTrafficSourceLogsValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}
		let { from, to, website } = req.query;
		from = moment(Number(from)).startOf('day');
		to = moment(Number(to)).endOf('day');
		let page = req.query.page || Paging.PAGE;
		let limit = req.query.limit || Paging.LIMIT;
		page = Number(page);
		limit = Number(limit);
		const twoWeek = moment(from).add(14, 'd').startOf('day');

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::getTrafficSourceLogs::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		if (twoWeek.isBefore(to)) {
			logger.info('AccountAdsController::getTrafficSourceLogs::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Khoảng cách giữa ngày bắt đầu và ngày kết thúc tối đa là 2 tuần.']
			});
		}

		let websiteInfo = null;

		if(website)
		{
			websiteInfo = await WebsiteModel.findOne({_id: mongoose.Types.ObjectId(website), accountAd: req.adsAccount._id});
		}

		if(!websiteInfo && website)
		{
			logger.info('AccountAdsController::getTrafficSourceStatisticByDay::website not found\n', info);
			return res.status(HttpStatus.NOT_FOUND).json({
				messages: ['Không tìm thấy website.']
			});
		}

		const accountKey = req.adsAccount.key;
		const result = await ReportService.getTrafficSourceLogs(accountKey, websiteInfo, from, to, page, limit);
		let trafficSourceData = [];
		let totalItems = 0;

		if (result[0].entries.length !== 0) {
			trafficSourceData = result[0].entries;
			totalItems = result[0].meta[0].totalItems;
			trafficSourceData = trafficSourceData.map(ele => ele.info);
			const ips = trafficSourceData.map(ele => ele.ip);
			const sessions = await ReportService.getSessionCountOfIp(accountKey, websiteInfo, from, to, ips);
			trafficSourceData = ReportService.addSessionCountIntoTrafficSourceData(trafficSourceData, sessions);
		}

		logger.info('AccountAdsController::getTrafficSourceLogs::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công'],
			data    : {
				trafficSourceData,
				totalItems
			}
		});
	} catch (e) {
		logger.error('ReportController::getTrafficSourceLogs::error', e);
		return next(e);
	}
};

const getIpsInAutoBlackListOfAccount = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}

	if (req.user.connectType == AdAccountConstant.connectType.byId && !req.adsAccount.isConnected) {
		logger.info('ReportController::getIpsInAutoBlackListOfAccount::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data    : {
				ips: []
			}
		});
	}

	logger.info('ReportController::getIpsInAutoBlackListOfAccount::is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getIpsInAutoBlackListOfAccountValidationSchema);
		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let page = req.query.page || Paging.PAGE;
		let limit = req.query.limit || Paging.LIMIT;
		page = Number(page);
		limit = Number(limit);

		const accountId = req.adsAccount._id;
		const accountKey = req.adsAccount.key;
		const result = await ReportService.getInfoOfIpInAutoBlackList(accountId, page, limit);
		let entries = [];
		let totalItems = 0;

		if (result[0].entries.length !== 0) {
			entries = result[0].entries;
			totalItems = result[0].meta[0].totalItems;
			let ips = entries.map(infoOfIp => infoOfIp._id);
			ips = ReportService.filterGroupIpAndSampleIp(ips);

			if (ips.groupIps.length > 0) {
				entries = await ReportService.getInfoLogForGroupIp(ips.groupIps, entries);
			}

			if (ips.sampleIps.length > 0) {
				const logsInfo = await ReportService.getLogsOfIpsInAutoBlackList(accountKey, ips.sampleIps);
				if (logsInfo.length > 0) {
					entries = ReportService.addLogInfoIntoIpInfo(logsInfo, entries);
				}
			}

			const gclidList = entries.map(log => log.gclid).filter(ReportService.onlyUnique);
			const clickReport = await ClickReportService.getReportByGclId(gclidList);
			entries = ClickReportService.mapCLickReportIntoUserLogs(clickReport, entries);
		}

		logger.info('ReportController::getIpsInAutoBlackListOfAccount::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data    : {
				ips: entries,
				totalItems
			}
		});

	} catch (e) {
		logger.error('ReportController::getIpsInAutoBlackListOfAccount::error', e, '\n', info);
		next(e);
	}
};

const statisticsOfGoogleErrorsAndNumberOfRequests = async (req, res, next) => {
	const info = {
		userId   : req.user._id,
		from : req.query.from,
		to   : req.query.to
	};

	logger.info('ReportController::statisticsOfGoogleErrorsAndNumberOfRequests is called\n', info);
	try {
		const { error } = Joi.validate(req.query, statisticsOfGoogleErrorsAndNumberOfRequestsSchemaValidation);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { from, to, timeZone } = req.query;
		from = moment(Number(from)).startOf('day');
		to = moment(Number(to)).endOf('day');
		timeZone = timeZone || '+07:00';
		timeZone = timeZone.replace(" ", "+");

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::statisticsOfGoogleErrorsAndNumberOfRequests::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		let result = await ReportService.getStatisticOfGoogleAdsErrorsNumber(from, to, timeZone);
		let googleRequestNumber = await ReportService.getRequestsOfGoogleNumber(from, to, timeZone);

		result = ReportService.mapDateOfErrorGoogleAndDateOfRequest(result, googleRequestNumber);

		logger.info('AccountAdsController::statisticsOfGoogleErrorsAndNumberOfRequests::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công'],
			data    : {
				result
			}
		});
	} catch (e) {
		logger.error('ReportController::statisticsOfGoogleErrorsAndNumberOfRequests::error', e);
		return next(e);
	}
};

module.exports = {
	getIPClicks,
	getDetailIPClick,
	getTrafficSourceStatisticByDay,
	getTrafficSourceLogs,
	getIpsInAutoBlackListOfAccount,
	statisticsOfGoogleErrorsAndNumberOfRequests
};
