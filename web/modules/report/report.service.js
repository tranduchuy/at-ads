
const UserBehaviorLogConstant = require('../user-behavior-log/user-behavior-log.constant');

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
	const matchStage = {};

	matchStage['accountKey'] = queryCondition.accountKey;
	matchStage['ip'] = queryCondition.ip;
	matchStage['type'] = UserBehaviorLogConstant.LOGGING_TYPES.TRACK;

	if (queryCondition.startTime) {
		matchStage.createdAt = {
			$gt: new Date(queryCondition.startTime)
		};
	}

	if (queryCondition.endTime) {
		matchStage.createdAt = matchStage.createdAt || {};
		matchStage.createdAt['$lte'] = new Date(queryCondition.endTime);
	}

	if (Object.keys(matchStage).length > 0) {
		stages.push({ $match: matchStage });
	}


	stages.push({ '$sort': { 'createdAt': -1 } });

	stages.push({ "$group": { _id: "$uuid", "count": { "$sum": 1 }, logs: { $push: "$$ROOT" } } });

	return stages;
};

module.exports = {
	buildStageGetIPClicks,
	buildStageGetDetailIPClick
};
