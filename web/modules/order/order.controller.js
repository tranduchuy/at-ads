const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');

const OrderService = require('../order/order.service');
const OrderModel = require('../order/order.model');
const OrderConstant = require('../order/order.constant');
const PackagesModel = require('../packages/packages.model');
const requestUtil = require('../../utils/RequestUtil');
const PackagesConstant = require('../packages/packages.constant');

const {
  CreatedOrderWhenRegisterPackageValidationSchema
} = require('./validations/created-order-when-register.schema');

const createdOrderWhenRegisterPackage = async (req, res, next) => {
  logger.info('OrderService::createdOrderWhenRegisterPackage::Is called', {
    userId: req.user._id,
    type: req.body.packageType
  });
  try {
    const { error } = Joi.validate(
      req.body,
      CreatedOrderWhenRegisterPackageValidationSchema
    );

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }
    const { packageType, numOfMonths } = req.body;
    const package = await PackagesModel.findOne({ type: packageType });

    if (!package) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy package.']
      });
    }

    const query = {
      userId: req.user._id,
      status: OrderConstant.status.NEW,
      packageId: package._id
    };
    let order = await OrderModel.findOne(query);
    let isDiscount = package.isDiscount || false;
    let discount = package.discountMonths || PackagesConstant.discountArray;

    if (!order) {
      const code = await OrderService.createCode();
      order = new OrderModel({
        userId: req.user._id,
        status: OrderConstant.status.NEW,
        code,
        packageId: package._id,
        numOfMonths,
        price: OrderService.discount(numOfMonths, package.price, isDiscount, discount)
      });
    } else {
      order.numOfMonths =
      order.numOfMonths != numOfMonths
        ? Number(numOfMonths)
        : order.numOfMonths;
      order.price = OrderService.discount(numOfMonths, package.price, isDiscount, discount)
    }

    await order.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Thành công'],
      data: {
        code: order.code,
        price: order.price,
        numOfMonths: order.numOfMonths,
        packageType
      }
    });
  } catch (e) {
    console.log(e);
    logger.error('OrderService::createdOrderWhenRegisterPackage::Error', e);
    next(e);
  }
};

module.exports = {
  createdOrderWhenRegisterPackage
};
