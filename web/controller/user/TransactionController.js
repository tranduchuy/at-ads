const NotifyController = require('./NotifyController');
const SaleModel = require('../../models/SaleModel');
const PostModel = require('../../models/PostModel');
const LeadHistoryModel = require('../../models/LeadHistoryModel');
const _ = require('lodash');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const HTTP_CODE = require('../../config/http-code');
const Socket = require('../../utils/Socket');
const NotifyContent = require('../../config/notify-content');
const SocketEvents = require('../../config/socket-event');
const NotifyTypes = require('../../config/notify-type');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const {get, post} = require('../../utils/Request');
const CDP_APIS = require('../../config/cdp-url-api.constant');
const request = require('../../utils/Request');
const {extractPaginationCondition} = require('../../utils/RequestUtil');

const extractSearchCondition = function (req, childId) {
  const cond = {
    userId: childId || req.user.id
  };
  
  const {startDay, endDay, type} = req.query;
  
  if (startDay) {
    cond.startDay = startDay;
  }
  
  if (endDay) {
    cond.endDay = endDay;
  }
  
  if (type && !isNaN(type)) {
    cond.type = parseInt(type, 0);
  }
  
  return cond;
};

const addMain = async (req, res, next) => {
  logger.info('TransactionController::addMain is called');
  const userId = req.params.id;
  const {amount, note, info} = req.body;
  
  try {
    const postData = {
      userId: parseInt(userId),
      main1: amount
    };
    
    post(CDP_APIS.ADMIN.UPDATE_BALANCE, postData, req.user.token)
      .then(r => {
        const notifyParams = {
          fromUserId: req.user.id,
          toUserId: parseInt(userId),
          title: NotifyContent.AddMain.Title,
          content: NotifyContent.AddMain.Content,
          type: NotifyTypes.CHANGE_TRANSACTION,
          params: {
            before: r.data.meta.before,
            after: r.data.meta.after
          }
        };
        NotifyController.createNotify(notifyParams);
        
        // send socket
        notifyParams.toUserIds = [notifyParams.toUserId];
        delete notifyParams.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: {},
          message: 'Request success!'
        });
      })
      .catch(e => {
        logger.error('TransactionController::addMain::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('TransactionController::addMain::error', e);
    return next(e);
  }
};

const addPromo = async (req, res, next) => {
  logger.info('TransactionController::addPromo::called');
  const userId = req.params.id;
  const {amount, note, info} = req.body;
  
  try {
    const postData = {
      userId: parseInt(userId),
      promo: amount
    };
    
    post(CDP_APIS.ADMIN.UPDATE_BALANCE, postData, req.user.token)
      .then(r => {
        const notifyParams = {
          fromUserId: req.user.id,
          toUserId: parseInt(userId),
          title: NotifyContent.AddMain.Title,
          content: NotifyContent.AddMain.Content,
          type: NotifyTypes.CHANGE_TRANSACTION,
          params: {
            before: r.data.meta.before,
            after: r.data.meta.after
          }
        };
        NotifyController.createNotify(notifyParams);
        
        // send socket
        notifyParams.toUserIds = [notifyParams.toUserId];
        delete notifyParams.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: {},
          message: 'Request success!'
        });
      })
      .catch(e => {
        logger.error('TransactionController::addPromo::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('TransactionController::addPromo::error', e);
    return next(e);
  }
};

const childList = async (req, res) => {
  
  logger.info('TransactionController::childList is called');
  try {
    const pagination = extractPaginationCondition(req);
    const cond = extractSearchCondition(req, req.params.id);
    const queryStr = `?${request.convertObjectToQueryString(cond)}&${request.convertObjectToQueryString(pagination)}`;
    const uri = `${CDP_APIS.TRANSACTION_HISTORY.LIST_CHILD}${queryStr}`;
    
    get(uri, req.user.token)
      .then(async (r) => {
        let transactions = await Promise.all(r.data.entries.map(async transaction => {
          
          if (transaction.type === global.TRANSACTION_TYPE_PAY_POST ||
            transaction.type === global.TRANSACTION_TYPE_UP_NEW ||
            transaction.type === global.TRANSACTION_TYPE_VIEW_POST_SALE) {
            
            try {
              let note = JSON.parse(transaction.note);
              const sale = await SaleModel.findOne({_id: note.saleId});
              if (sale) {
                transaction.info = {
                  title: sale.title
                };
              }
            }
            catch (e) {
              logger.error('TransactionController::list', e);
            }
          }
          
          if (transaction.type === global.TRANSACTION_TYPE_BUY_LEAD ||
            transaction.type === global.TRANSACTION_TYPE_REFUND_LEAD) {
            try {
              let note = JSON.parse(transaction.note);
              const lead = await LeadHistoryModel.findOne({_id: note.leadId});
              if (lead) {
                transaction.info = {
                  title: lead.name
                };
              }
            }
            catch (e) {
              logger.error('TransactionController::list', e);
            }
          }
          
          return transaction;
        }));
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: {
            items: transactions,
            total: _.ceil(r.data.meta.totalRecords / 20),
            itemCount: r.data.meta.totalRecords
          }
        });
      })
      .catch((err) => {
        return next(err)
      });
  }
  catch (e) {
    return res.json({
      status: HTTP_CODE.ERROR,
      data: {},
      message: 'Unknown error : ' + e.message
    });
  }
};

const list = async (req, res, next) => {
  logger.info('TransactionController::list is called');
  try {
    const pagination = extractPaginationCondition(req);
    const cond = extractSearchCondition(req);
    const queryStr = `?${request.convertObjectToQueryString(cond)}&${request.convertObjectToQueryString(pagination)}`;
    const uri = `${CDP_APIS.TRANSACTION_HISTORY.LIST_MY}${queryStr}`;
    
    get(uri, req.user.token)
      .then(async (r) => {
        let transactions = await Promise.all(r.data.entries.map(async transaction => {
          
          if (transaction.type === global.TRANSACTION_TYPE_PAY_POST ||
            transaction.type === global.TRANSACTION_TYPE_UP_NEW ||
            transaction.type === global.TRANSACTION_TYPE_VIEW_POST_SALE) {
            
            try {
              let note = JSON.parse(transaction.note);
              const sale = await SaleModel.findOne({_id: note.saleId});
              if (sale) {
                transaction.info = {
                  title: sale.title
                };
              }
            }
            catch (e) {
              logger.error('TransactionController::list', e);
            }
          }
          
          if (transaction.type === global.TRANSACTION_TYPE_BUY_LEAD ||
            transaction.type === global.TRANSACTION_TYPE_REFUND_LEAD) {
            try {
              let note = JSON.parse(transaction.note);
              const lead = await LeadHistoryModel.findOne({_id: note.leadId});
              if (lead) {
                transaction.info = {
                  title: lead.name
                };
              }
            }
            catch (e) {
              logger.error('TransactionController::list', e);
            }
          }
          
          
          return transaction;
        }));
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: {
            items: transactions,
            total: _.ceil(r.data.meta.totalRecords / 20),
            itemCount: r.data.meta.totalRecords
          }
        });
      })
      .catch((err) => {
        return next(err)
      });
  }
  catch (e) {
    return res.json({
      status: HTTP_CODE.ERROR,
      data: {},
      message: 'Unknown error : ' + e.message
    });
  }
};

module.exports = {
  addMain,
  addPromo,
  childList,
  list
};
