const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const requestUtil = require('../../utils/RequestUtil');

const { getActionsHistoryValidationSchema } = require('./validations/get-actions-history.schema');

const { Paging } = require('../account-adwords/account-ads.constant');

const UserActionHisToryService = require('./user-action-history.service');

const getActionsHistory = async (req, res, next) => {
    const info = {
      userId: req.user._id,
    }
    logger.info('UserActionHistoryController::getActionsHistory::is called\n', info);
    try{
        const { error } = Joi.validate(req.query, getActionsHistoryValidationSchema);
  
        if (error) {
          return requestUtil.joiValidationResponse(error, res);
        }
  
        const userId = req.user._id;
        let { page, limit } = req.query;
  
        page = !page ? Paging.PAGE : page;
        limit = !limit ? Paging.LIMIT : limit;
  
        page = Number(page);
        limit = Number(limit);
        
        const result = await UserActionHisToryService.getActionsHistory(userId, page, limit)
        let entries = [];
        let totalItems = 0;
  
        if(result[0].entries.length !== 0)
        {
          entries = result[0].entries;
          totalItems = result[0].meta[0].totalItems;
        }
  
        logger.info('UserActionHistoryController::getActionsHistory::success\n', info);
        return res.status(HttpStatus.OK).json({
          messages: ['Lấy dữ liệu thành công.'],
          data: {
            entries,
            totalItems
          }
        });
    }catch(e){
        logger.error('UserActionHistoryController::getActionsHistory::error', e, '\n', info);
        next(e);
    }
  };

module.exports = {
    getActionsHistory
};
