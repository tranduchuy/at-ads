const UserBehaviorLogConstant = require('../user-behavior-log/user-behavior-log.constant');
const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');

const log4js = require('log4js');
const logger = log4js.getLogger('Services');

buildStageGetIPClicks = (queryCondition) => {
	return [
		{
			"$match": {
				"accountKey": queryCondition.accountKey,
				"ip"        : queryCondition.ip,
				"type"      : UserBehaviorLogConstant.LOGGING_TYPES.CLICK
			}
		},
		{
			"$group": {
				_id      : "$createdAt",
				logClicks: {
					$push: "$$ROOT"
				}
			}
		},
		{
			$unwind: {
				path: "$logClicks"
			}
		},
		{
			$project: {
				_id      : "$logClicks._id",
				location: "$logClicks.location",
				device: "$logClicks.device",
				timestamp: "$_id"
			}
		},
		{
			"$sort": {
				"_id": -1
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

	stages.push({$match: matchStage});

	stages.push({ '$sort': { 'createdAt': -1 } });
	stages.push({ "$group": { _id: "$uuid", "count": { "$sum": 1 }, logs: { $push: "$$ROOT" } } });

	return stages;
};

const getTrafficSourceStatisticByDay = (accountKey, from, to) => {
	logger.info('ReportService::getTrafficSourceStatisticByDay::is called ', { accountKey, from , to });

	return new Promise(async (res, rej) => {
		try{
			const matchStage ={
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt: new Date(to)
					}
				}
			};

			const groupStage = {
				$group: {
					_id: "$trafficSource",
					uniqueSessions: {$addToSet: "$session"}
				} 
			};

			const projectStage = {
				$project: {
					_id: 1, 
					sessionCount: {$size: "$uniqueSessions"}
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
		}catch(e){
			logger.info('ReportService::getTrafficSourceStatisticByDay:error ', e, '\n', { accountKey, from , to });
			return rej(e);
		}
	});
};

const getTrafficSourceLogs = (accountKey, from, to, page, limit) => {
	logger.info('ReportService::getTrafficSourceLogs::is called ', { accountKey, from , to, page, limit });
	return new Promise(async (res, rej) => {
		try{
			const matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt: new Date(to)
					}
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
				  meta: [
					{$group: {_id: null, totalItems: {$sum: 1}}},
				  ],
				}
			};

			const query = [
				matchStage,
				projectStage,
				facetStage
			];

			logger.info('ReportService::getTrafficSourceLogs::query ', JSON.stringify(query));
			const result = await UserBehaviorLogModel.aggregate(query);

			logger.info('ReportService::getTrafficSourceLogs::success');
			return res(result);

		}catch(e){
			logger.info('ReportService::getTrafficSourceLogs:error ', e, '\n', { accountKey, from , to, page, limit });
			return rej(e);
		}
	});
};

const getSessionCountOfIp = (accountKey, from , to , ips) => {
	logger.info('ReportService::getSessionCountOfIp::is called ', { accountKey, from , to, ips });
	return new Promise(async (res, rej) => {
		try{
			const matchStage = {
				$match: {
					accountKey,
					createdAt: {
						$gte: new Date(from),
						$lt: new Date(to)
					},
					ip: {
						$in: ips
					}
				}
			};

			const groupStage = {
				$group: {
					_id: "$ip",
					sessionCount: {$sum: 1}
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

		}catch(e){
			logger.info('ReportService::getSessionCountOfIp:error ', e, '\n', { accountKey, from , to, ips});
			return rej(e);
		}
	});
};

const addSessionCountIntoTrafficSourceData = (trafficSourceArr, sessionsArr) => {
	trafficSourceArr.forEach(ipInfo => {
		sessionsArr.forEach(sessionInfo => {
			if(ipInfo.ip === sessionInfo._id)
			{
				ipInfo.count = sessionInfo.sessionCount;
			}
		});
	});

	return trafficSourceArr;
}

module.exports = {
	buildStageGetIPClicks,
	buildStageGetDetailIPClick,
	getTrafficSourceStatisticByDay,
	getTrafficSourceLogs,
	getSessionCountOfIp,
	addSessionCountIntoTrafficSourceData
};
