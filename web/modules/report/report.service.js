const UserBehaviorLogConstant = require('../user-behavior-log/user-behavior-log.constant');
const UserBehaviorLogModel    = require('../user-behavior-log/user-behavior-log.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const GoogleAdsErrorModel     = require('../google-ads-error/google-ads-error.model');
const CountRequestGoogleModel      = require('../count-request-google/count-request-google.model');
const Async = require('async');

const log4js = require('log4js');
const logger = log4js.getLogger('Services');

buildStageGetIPClicks = (queryCondition, page, limit) => {
	return [
		{
			"$match": {
				"accountKey": queryCondition.accountKey,
				"ip"        : queryCondition.ip
			}
		},
		{
			$project: {
				createdAt        : 1,
				browser          : 1,
				device           : 1,
				isSpam           : 1,
				reason           : 1,
				href             : 1,
				networkCompany   : 1,
				location         : 1,
				type             : 1,
				ip               : 1,
				uuid             : 1,
				os               : 1,
				isPrivateBrowsing: 1,
				pathname         : 1,
				domain           : 1
			}
		},
		{
			$sort: {
				createdAt: -1
			}
		},
		{
			$facet:
				{
					entries: [
						{ $skip: (page - 1) * limit },
						{ $limit: limit }
					],
					meta   : [
						{ $group: { _id: null, totalItems: { $sum: 1 } } },
					],
				}
		}
	];
};

buildStageGetDetailIPClick = (queryCondition) => {
	let stages = [];
	const matchStage = {
		accountKey: queryCondition.accountKey,
		ip        : queryCondition.ip,
		type      : UserBehaviorLogConstant.LOGGING_TYPES.TRACK
	};

	if (queryCondition.startTime) {
		matchStage.createdAt = {
			$gt: new Date(queryCondition.startTime)
		};
	}

	if (queryCondition.endTime) {
		matchStage.createdAt = matchStage.createdAt || {};
		matchStage.createdAt['$lt'] = new Date(queryCondition.endTime);
	}

	stages.push({ $match: matchStage });

	stages.push({ '$sort': { 'createdAt': -1 } });
	stages.push({ "$group": { _id: "$uuid", "count": { "$sum": 1 }, logs: { $push: "$$ROOT" } } });

	return stages;
};

const getTrafficSourceStatisticByDay = (accountKey, websiteInfo, from, to) => {
	logger.info('ReportService::getTrafficSourceStatisticByDay::is called ', { accountKey, from: from._d, to: to._d });

	return new Promise(async (res, rej) => {
		try {
			let matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

			if(websiteInfo)
			{
				matchStage.$match['domain'] = websiteInfo.domain;
			}

			const groupStage = {
				$group: {
					_id           : "$trafficSource",
					uniqueSessions: { $addToSet: "$session" }
				}
			};

			const projectStage = {
				$project: {
					_id         : 1,
					sessionCount: { $size: "$uniqueSessions" }
				}
			};

			const query = [
				matchStage,
				groupStage,
				projectStage
			];

			logger.info('ReportService::getTrafficSourceStatisticByDay::query ', JSON.stringify(query));
			const result = await UserBehaviorLogModel.aggregate(query);

			logger.info('ReportService::getTrafficSourceStatisticByDay::success');
			return res(result);
		} catch (e) {
			logger.info('ReportService::getTrafficSourceStatisticByDay:error ', e, '\n', { accountKey, from, to });
			return rej(e);
		}
	});
};

const getTrafficSourceLogs = (accountKey, websiteInfo, from, to, page, limit) => {
	logger.info('ReportService::getTrafficSourceLogs::is called ', { accountKey, from: from._d, to: to._d, page, limit });
	return new Promise(async (res, rej) => {
		try {
			let matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

			if(websiteInfo)
			{
				matchStage.$match['domain'] = websiteInfo.domain;
			}

			const sortStage = {
				$sort: {
					"createdAt": -1
				}
			};

			const projectStage = {
				$project: {
					info: "$$ROOT"
				}
			}

			const facetStage = {
				$facet:
					{
						entries: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit }
						],
						meta   : [
							{ $group: { _id: null, totalItems: { $sum: 1 } } },
						],
					}
			};

			const query = [
				matchStage,
				sortStage,
				projectStage,
				facetStage
			];

			logger.info('ReportService::getTrafficSourceLogs::query ', JSON.stringify(query));
			const result = await UserBehaviorLogModel.aggregate(query);

			logger.info('ReportService::getTrafficSourceLogs::success');
			return res(result);

		} catch (e) {
			logger.info('ReportService::getTrafficSourceLogs:error ', e, '\n', { accountKey, from, to, page, limit });
			return rej(e);
		}
	});
};

const getSessionCountOfIp = (accountKey, websiteInfo, from, to, ips) => {
	logger.info('ReportService::getSessionCountOfIp::is called ', { accountKey, from: from._d, to: to._d, ips });
	return new Promise(async (res, rej) => {
		try {
			let matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					},
					ip       : {
						$in: ips
					}
				}
			};

			if(websiteInfo)
			{
				matchStage.$match['domain'] = websiteInfo.domain;
			}

			const groupStage = {
				$group: {
					_id         : "$ip",
					sessionCount: { $sum: 1 }
				}
			};

			const query = [
				matchStage,
				groupStage
			];

			logger.info('ReportService::getSessionCountOfIp::query ', JSON.stringify(query));
			const result = await UserBehaviorLogModel.aggregate(query);

			logger.info('ReportService::getSessionCountOfIp::success');
			return res(result);

		} catch (e) {
			logger.info('ReportService::getSessionCountOfIp:error ', e, '\n', { accountKey, from, to, ips });
			return rej(e);
		}
	});
};

const addSessionCountIntoTrafficSourceData = (trafficSourceArr, sessionsArr) => {
	trafficSourceArr.forEach(ipInfo => {
		sessionsArr.forEach(sessionInfo => {
			if (ipInfo.ip === sessionInfo._id) {
				ipInfo.count = sessionInfo.sessionCount;
			}
		});
	});

	return trafficSourceArr;
};

const getInfoOfIpInAutoBlackList = (accountId, page, limit) => {
	logger.info('ReportService::getInfoOfIpInAutoBlackList::is called ', { accountId, page, limit });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					accountId,
					isDeleted: false
				}
			};

			const unwindStage = {
				$unwind: {
					path: "$autoBlackListIp"
				}
			};

			const groupStage = {
				$group: {
					_id      : "$autoBlackListIp.ip",
					campaigns: {
						$push: {
							campaignId  : "$campaignId",
							campaignName: "$campaignName"
						}
					}
				}
			};

			const projectStage = {
				$project: {
					_id              : 1,
					campaigns        : 1,
					numberOfCampaigns: { $size: "$campaigns" }
				}
			};

			const facetStage = {
				$facet:
					{
						entries: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit }
						],
						meta   : [
							{ $group: { _id: null, totalItems: { $sum: 1 } } },
						],
					}
			};

			const query = [
				matchStage,
				unwindStage,
				groupStage,
				projectStage,
				facetStage
			];

			const queryInfo = JSON.stringify(query);
			logger.info('ReportService::getInfoOfIpInAutoBlackList::query', { accountId, queryInfo });

			const result = await BlockingCriterionsModel.aggregate(query);

			logger.info('ReportService::getInfoOfIpInAutoBlackList::success ', { accountId, page, limit });
			return res(result);
		} catch (e) {
			logger.error('ReportService::getInfoOfIpInAutoBlackList::error ', e, { accountId, page, limit });
			return rej(e);
		}
	});
};

const getLogsOfIpsInAutoBlackList = (accountKey, ipsArr) => {
	logger.info('AccountAdsService::getLogsOfIpsInAutoBlackList::is called ', { accountKey, ipsArr });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					accountKey,
					ip: { $in: ipsArr }
				}
			};

			const sortStage = {
				$sort: {
					createdAt: -1
				}
			};

			const groupStage = {
				$group: {
					_id : "$ip",
					logs: {
						$push: '$$ROOT'
					}
				}
			};

			const projectStage = {
				$project: {
					_id: 1,
					log: {
						$arrayElemAt: ["$logs", 0]
					}
				}
			};

			const projectStage1 = {
				$project: {
					_id              : 1,
					network          : '$log.networkCompany.name',
					isPrivateBrowsing: '$log.isPrivateBrowsing',
					gclid            : '$log.gclid',
					keyword          : '$log.keyword',
					matchType        : '$log.matchType',
					page             : '$log.page',
					position         : '$log.position',
					campaignType     : '$log.campaignType'
 				}
			};

			const query = [
				matchStage,
				sortStage,
				groupStage,
				projectStage,
				projectStage1
			];

			const queryInfo = JSON.stringify(query);
			logger.info('ReportService::getLogsOfIpsInAutoBlackList::query', { accountKey, queryInfo });

			const result = await UserBehaviorLogModel.aggregate(query);

			logger.info('ReportService::getLogsOfIpsInAutoBlackList::success ', { accountKey, ipsArr });
			return res(result);
		} catch (e) {
			logger.error('ReportService::getLogsOfIpsInAutoBlackList::error ', e, { accountKey, ipsArr });
			return rej(e);
		}
	});
};

const addLogInfoIntoIpInfo = (logsInfo, ipsInfo) => {
	ipsInfo.forEach(ipInfo => {
		logsInfo.forEach(logInfo => {
			if (ipInfo._id === logInfo._id) {
				ipInfo.network           = logInfo.network;
				ipInfo.isPrivateBrowsing = logInfo.isPrivateBrowsing;
				ipInfo.gclid             = logInfo.gclid;
				ipInfo.keyword           = logInfo.keyword;
				ipInfo.matchType         = logInfo.matchType;
				ipInfo.page              = logInfo.page;
				ipInfo.position          = logInfo.position;
				ipInfo.campaignType      = logInfo.campaignType;
			}
		});
	});

	return ipsInfo;
}

const filterGroupIpAndSampleIp = (ips) => {
	let sampleIps = [];
	let groupIps = [];
	const regex = new RegExp(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/);

	ips.forEach(ip => {
		regex.test(ip) ? sampleIps.push(ip) : groupIps.push(ip);
	});

	return { sampleIps, groupIps };
};

const getInfoLogForGroupIp = async (groupIps, ipsInfo) => {
	logger.info('ReportService::getInfoLogForGroupIp::is called ', { groupIps, ipsInfo });
	return new Promise((res, rej) => {
		try {
			let logsArr = [];
			Async.eachSeries(groupIps, (ip, callback) => {
				const ipClass = splitIp(ip);

				if (!ip) {
					return callback(null);
				}

				UserBehaviorLogModel.find({ 'ip': { $regex: ipClass } })
					.sort({ createdAt: -1 })
					.limit(1)
					.exec((err, result) => {
						if (err) {
							logger.error('ReportService::getInfoLogForGroupIp::error', err, '\n', { groupIps, ipsInfo });
							return callback(err);
						}

						if (result.length > 0) {
							const data = {
								_id              : ip,
								network          : result[0].networkCompany.name,
								isPrivateBrowsing: result[0].isPrivateBrowsing,
								gclid            : result[0].gclid,
								keyword          : result[0].keyword,
								matchType        : result[0].matchType,
								page             : result[0].page,
								position         : result[0].position,
								campaignType     : result[0].campaignType
							}

							logsArr.push(data);
							return callback();
						}

						return callback(null);
					});
			}, err => {
				if (err) {
					logger.error('ReportService::getInfoLogForGroupIp::error', err, '\n', { groupIps, ipsInfo });
					return rej(err);
				}

				return res(addLogInfoIntoIpInfo(logsArr, ipsInfo));
			});
		} catch (e) {
			logger.error('ReportService::getInfoLogForGroupIp::error', e, '\n', { groupIps, ipsInfo });
			return rej(e);
		}
	});
};

const splitIp = (ip) => {
	const splitIp = ip.split('.');
	const splitIpClassD = splitIp[3].split('/');
	let ipClass = null;

	switch (splitIpClassD[1]) {
		case '16':
			ipClass = new RegExp(`^${splitIp.slice(0, 2).join('.')}`);
			break;
		case '24':
			ipClass = new RegExp(`^${splitIp.slice(0, 3).join('.')}`);
			break;
		default :
			ipClass = null;
	}

	return ipClass;
};

const getStatisticOfGoogleAdsErrorsNumber = (from, to, timeZone) => {
	logger.info('AccountAdsService::getStatisticOfGoogleAdsErrorsNumber::is called\n', { from: from._d, to: to._d, timeZone });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

			const projectStage = {
				$project: {
					'date': { 
						$dateToString: 
						{ 
							format: "%d-%m-%Y",
							date: "$createdAt",
							timezone: timeZone 
						} 
					}
				}
			};

			const groupStage = {
				$group: {
					'_id': '$date',
					'googleAdsErrorsNumber': {
						$sum: 1
					}
				}
			};

			const sortStage = {
				$sort: {
					_id: -1
				}
			};

			const query = [
				matchStage,
				projectStage,
				groupStage,
				sortStage
			];

			const queryInfo = JSON.stringify(query);
			logger.info('ReportService::getStatisticOfGoogleAdsErrorsNumber::query\n', { from: from._d, to: to._d, queryInfo });

			const result = await GoogleAdsErrorModel.aggregate(query);

			logger.info('ReportService::getStatisticOfGoogleAdsErrorsNumber::success\n', { from: from._d, to: to._d });
			return res(result);
		} catch (e) {
			logger.error('ReportService::getStatisticOfGoogleAdsErrorsNumber::error\n', e, { from: from._d, to: to._d });
			return rej(e);
		}
	});
};

const getRequestsOfGoogleNumber = (from, to, timeZone) => {
	logger.info('AccountAdsService::getRequestsOfGoogleNumber::is called\n', { from: from._d, to: to._d, timeZone });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

			const projectStage = {
				$project: {
					'date': { 
						$dateToString: 
						{ 
							format: "%d-%m-%Y",
							date: "$createdAt",
							timezone: timeZone 
						} 
					},
					'count': {$add: ['$count', '$countReport']}
				}
			};

			const groupStage = {
				$group: {
					'_id': '$date',
					'requestsNumber': {
						$push: {
							count: '$count'
						}
					}
				}
			};

			const sortStage = {
				$sort: {
					_id: -1
				}
			};

			const query = [
				matchStage,
				projectStage,
				groupStage,
				sortStage
			];

			const queryInfo = JSON.stringify(query);
			logger.info('ReportService::getRequestsOfGoogleNumber::query\n', { from: from._d, to: to._d, queryInfo });

			const result = await CountRequestGoogleModel.aggregate(query);

			logger.info('ReportService::getRequestsOfGoogleNumber::success\n', { from: from._d, to: to._d });
			return res(result);
		} catch (e) {
			logger.error('ReportService::getRequestsOfGoogleNumber::error\n', e, { from: from._d, to: to._d });
			return rej(e);
		}
	});
};

const mapDateOfErrorGoogleAndDateOfRequest = (googleErrorList, requestList) => {
	const dateOfGoogleErrorArr = googleErrorList.map(e => e._id);
	const dateOfRequestArr     = requestList.map(e => e._id);
	const dateArr = dateOfGoogleErrorArr.concat(dateOfRequestArr);
	const uniqueDateArr = dateArr.filter(onlyUnique);
	let result          = [];

	uniqueDateArr.forEach(e => {
		let log = {
			date: e
		};
		
		googleErrorList.forEach(googleErrorInfo => {
			if(googleErrorInfo._id === e)
			{
				log.googleAdsErrorsNumber = googleErrorInfo.googleAdsErrorsNumber;
			}
		});

		requestList.forEach(requestInfo => {
			if(requestInfo._id === e)
			{
				log.requestsNumber = requestInfo.requestsNumber.length !== 0 ? requestInfo.requestsNumber[0].count : 0;
			}
		});

		result.push(log);
	});
	
	return result;
};

const onlyUnique = (value, index, self) => { 
	return self.indexOf(value) === index;
};

module.exports = {
	buildStageGetIPClicks,
	buildStageGetDetailIPClick,
	getTrafficSourceStatisticByDay,
	getTrafficSourceLogs,
	getSessionCountOfIp,
	addSessionCountIntoTrafficSourceData,
	getInfoOfIpInAutoBlackList,
	getLogsOfIpsInAutoBlackList,
	addLogInfoIntoIpInfo,
	filterGroupIpAndSampleIp,
	getInfoLogForGroupIp,
	getStatisticOfGoogleAdsErrorsNumber,
	getRequestsOfGoogleNumber,
	mapDateOfErrorGoogleAndDateOfRequest,
	onlyUnique
};
