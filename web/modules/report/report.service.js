
const UserBehaviorLogConstant = require('../user-behavior-log/user-behavior-log.constant');
buildStageGetIPClicks = (queryCondition) => {
  let stages = [];
  const matchStage = {};

  matchStage['accountKey'] = queryCondition.accountKey;
  matchStage['ip'] = queryCondition.ip;

  if (Object.keys(matchStage).length > 0) {
    stages.push({$match: matchStage});
  }


  stages.push({'$sort': {'createdAt': -1}});

  stages.push({"$group":{_id : "$ip", "count":{"$sum":1}, logs: {$push: "$$ROOT"}}});

  stages.push(
    {
      $project: {
        count: 1,
        click_logs: {
          $filter: {
            input: "$logs",
            as: "item",
            cond: {$eq: ["$$item.type", 1]}
          }
        }
      }
    });
  stages.push(
    {
      $project: {
        count: 1,
        click_logs: 1,
        current_click_log: "$click_logs",
        click_count: {$size: "$click_logs"}
      }
    });
  stages.push(
    {
      $unwind: {
        path: "$current_click_log",
        includeArrayIndex: "arrayIndex"
      }
    });
  stages.push({
    "$project": {
      index: "$arrayIndex",
      current_click_log: 1,
      "next_click_log": {"$arrayElemAt": ["$click_logs", {$add: ["$arrayIndex", 1]}]}
    }
  });

  stages.push({
    "$project": {
      index: 1,
      next_click_log_id: "$current_click_log._id",
      current_click_log_id: "$next_click_log._id",
      endTime: "$current_click_log.createdAt",
      startTime: "$next_click_log.createdAt"
    }
  });
  return stages;
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
    stages.push({$match: matchStage});
  }


  stages.push({'$sort': {'createdAt': -1}});

  stages.push({"$group":{_id : "$uuid", "count":{"$sum":1}, logs: {$push: "$$ROOT"}}});

  return stages;
};

module.exports = {
  buildStageGetIPClicks,
  buildStageGetDetailIPClick
};
