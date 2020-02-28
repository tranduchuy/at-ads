const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const _ = require('lodash');
const mongoose = require('mongoose');
const moment = require('moment');

const AdminOrderService = require('../order/admin-order.service');
const OrderModel = require('../order/order.model');
const UserLicenceModel = require('../user-licences/user-licences.model');
const PackageModel = require('../packages/packages.model');
const OrderConstant = require('../order/order.constant');
const requestUtil = require('../../utils/RequestUtil');
const { Paging } = require('../account-adwords/account-ads.constant');
const PackageConstant = require('../packages/packages.constant');
const AdsAccountModel = require('../account-adwords/account-ads.model');

const {
  GetOrderListValidationSchema
} = require('../order/validations/get-order-list.schema');
const {
  UpdateOrderValidationSchema
} = require('./validations/update-order.schema');

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

const updateOrder = async (req, res, next) => {
  logger.info('AdminOrder::getOrderList::id called', { code: req.params.code });
  try {
    const { error } = Joi.validate(req.params, UpdateOrderValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { code } = req.params;
    const order = await OrderModel.findOne({ code });

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy order.']
      });
    }

    if (order.status == OrderConstant.status.SUCCESS) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ['Mã code này đã được cập nhật.']
      });
    }

    const userLicence = await UserLicenceModel.findOne({
      userId: order.userId
    }).populate('packageId');

    if (!userLicence) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy userLicence.']
      });
    }

    const package = await PackageModel.findOne({ _id: order.packageId });

    if (!package) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy package.']
      });
    }

    const accounts = await AdsAccountModel.find({'user': userLicence.userId});
    const accountEnabled = accounts.filter(account => !account.isDisabled);
console.log(accounts.length);
console.log(accountEnabled.length);
console.log(userLicence.packageId._id);
    if(package.type == PackageConstant.packageTypes.FREE)
    {
      userLicence.expiredAt = null;

      if(userLicence.packageId.type == PackageConstant.packageTypes.VIP1 || userLicence.packageId.type == PackageConstant.packageTypes.FREE)
      {
        if(accountEnabled.length != 1)
        {
          await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
        }
      }
      else
      {
        await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
      }
    }
    else
    {
      const packageType = userLicence.packageId ? userLicence.packageId.type : '';
      let expiredAt = userLicence.expiredAt
        ? moment(userLicence.expiredAt)
        : moment();

      if (
        !userLicence.packageId ||
        packageType != package.type ||
        expiredAt.isBefore(moment())
      ) {
        expiredAt = order.numOfMonths
          ? moment()
              .add(order.numOfMonths, 'M')
              .endOf('day')
          : moment()
              .add(package.numOfMonths, 'M')
              .endOf('day');
      } else {
        expiredAt = order.numOfMonths
          ? expiredAt.add(order.numOfMonths, 'M').endOf('day')
          : expiredAt.add(package.numOfMonths, 'M').endOf('day');
      }

      userLicence.expiredAt = expiredAt;

      if(package.type == PackageConstant.packageTypes.VIP1)
      {
        if(userLicence.packageId.type == PackageConstant.packageTypes.FREE || userLicence.packageId.type == PackageConstant.packageTypes.VIP1)
        {
          if(accountEnabled.length != 1){
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
          }
        }
        else
        {
          if(accounts.length > 1 )
          {
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
          }
          else
          {
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': false}});
          }
        }
      }
      else
      {
        await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': false}});
      }
    }

    let history = userLicence.histories || [];
    history.push({
      packageId: package._id,
      name: package.name,
      type: package.type,
      price: order.price,
      createdAt: new Date()
    });
    userLicence.packageId = package._id;
    await userLicence.save();
    order.status = OrderConstant.status.SUCCESS;
    await order.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Cập nhật thành công.'],
      data: {
        userLicence,
        order
      }
    });
  } catch (e) {
    logger.error('AdminOrder::getOrderList::error', e);
    next(e);
  }
};

module.exports = {
  getOrderList,
  updateOrder
};
