const UserActionHistoryModel = require('./user-action-history.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const createUserActionHistory = async ({
                                       userId, content, param
                                     }) => {
  try {
    const newUserActionHistory = new UserActionHistoryModel({
      userId,
      content: content || null,
      param: param || null
    });
    await newUserActionHistory.save();
    return;

  } catch (e) {
    console.log(e);
    return;
  }
};

const getActionsHistory =  (userId, page, limit) => {
  logger.info('UserActionHistoryService::getActionsHistory::is called ', {userId, page, limit});
  return new Promise(async (res, rej)=> {
    try{
      const matchStage = {
          $match: {
            userId
        }
      };

      const sortStage = {
          $sort: {
              createdAt: -1
          }  
      };

      const projectStage = {
          $project: {
              actionInfo : '$$ROOT'
          }
      };

      const facetStage = {
          $facet: {
               entries: [
                  { $skip: (1 - 1) * 20 },
                  { $limit: 20 }
              ],
              meta: [
               {$group: {_id: null, totalItems: {$sum: 1}}},
               ],
          }
      };

      let query = [
          matchStage,
          sortStage,
          projectStage,
          facetStage
      ];

      const queryInfo =  JSON.stringify(query);
      logger.info('UserActionHistoryService::getActionsHistory::query', {queryInfo});

      const result = await UserActionHistoryModel.aggregate(query);

      logger.info('UserActionHistoryService::getActionsHistory::success ', {userId, page, limit});
      return res(result);
    }catch(e){
      logger.error('UserActionHistoryService::getActionsHistory::error ', e, {userId, page, limit});
      return rej(e);
    }
  });
};


module.exports = {
  createUserActionHistory,
  getActionsHistory
};
