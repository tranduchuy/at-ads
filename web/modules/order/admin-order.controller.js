const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const _ = require('lodash');
const mongoose = require('mongoose');

const AdminOrderService = require('../order/admin-order.service');
const OrderModel = require('../order/order.model');
const OrderConstant = require('../order/order.constant');
const requestUtil = require('../../utils/RequestUtil');
const { Paging } = require('../account-adwords/account-ads.constant');

const {
  GetOrderListValidationSchema
} = require('../order/validations/get-order-list.schema');

const getOrderList = async (req, res, next) => {
  logger.info('AdminOrder::getOrderList::Is called', {
    status: req.query.status,
    code: req.query.code,
    limit: req.query.limit,
    page: req.query.page
  });
  try {
    const { error } = Joi.validate(req.query, GetOrderListValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { code } = req.query;
    const status = Number(req.query.status);
    const limit = Number(req.query.limit) || Paging.LIMIT;
    const page = Number(req.query.page) || Paging.PAGE;
    const ordersList = await AdminOrderService.getOrderList(
      status,
      code,
      limit,
      page
    );
    let entries = [];
    let totalItems = 0;

    if (ordersList[0].entries.length > 0) {
      entries = ordersList[0].entries;
      totalItems = ordersList[0].meta[0].totalItems;
      let packageIds = entries.map(order => order.packageId.toString());
      packageIds = _.uniq(packageIds).map(order => mongoose.Types.ObjectId(order));
      let userIds = entries.map(order => order.userId.toString());
      userIds = _.uniq(userIds).map(order => mongoose.Types.ObjectId(order));
      entries = await AdminOrderService.mapPackageAndUserIntoOrder(
        entries,
        packageIds,
        userIds
      );
    }

    return res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        entries,
        totalItems
      }
    });
  } catch (e) {
    logger.error('AdminOrder::getOrderList::error', e);
    next(e);
  }
};

module.exports = {
  getOrderList
};
