const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const crypto = require('crypto');

const OrderModel = require('../order/order.model');

const createCode = async () => {
  logger.info('OrdersServices::createdCode::created:: is called');
  try {
    let flag = true;
    while (flag) {
      const code = crypto.randomBytes(4).toString('hex');
      const order = await OrderModel.findOne({ code });
      if (!order) {
        flag = false;
        return code;
      }
    }
  } catch (e) {
    logger.error('OrdersServices::createdCode::error', e);
    throw e;
  }
};

module.exports = {
  createCode
};
