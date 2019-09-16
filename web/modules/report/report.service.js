const UserBehaviorLogConstant = require('../user-behavior-log/user-behavior-log.constant');
const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
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
				createdAt     : 1,
				browser       : 1,
				device        : 1,
				isSpam        : 1,
				href          : 1,
				networkCompany: 1,
				location      : 1,
				type          : 1,
				ip            : 1,
				uuid          : 1
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

const getTrafficSourceStatisticByDay = (accountKey, from, to) => {
	logger.info('ReportService::getTrafficSourceStatisticByDay::is called ', { accountKey, from, to });

	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

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

const getTrafficSourceLogs = (accountKey, from, to, page, limit) => {
	logger.info('ReportService::getTrafficSourceLogs::is called ', { accountKey, from, to, page, limit });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt : new Date(to)
					}
				}
			};

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

const getSessionCountOfIp = (accountKey, from, to, ips) => {
	logger.info('ReportService::getSessionCountOfIp::is called ', { accountKey, from, to, ips });
	return new Promise(async (res, rej) => {
		try {
			const matchStage = {
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
					accountId
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
					network          : "$log.networkCompany.name",
					isPrivateBrowsing: '$log.isPrivateBrowsing'
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
				ipInfo.network = logInfo.network;
				ipInfo.isPrivateBrowsing = logInfo.isPrivateBrowsing;
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
								isPrivateBrowsing: result[0].isPrivateBrowsing
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
	getInfoLogForGroupIp
};
