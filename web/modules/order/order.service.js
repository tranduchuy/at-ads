const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const crypto = require('crypto');

const OrderModel = require('../order/order.model');
const PackageConstant = require('../packages/packages.constant');

const createCode = async () => {
  logger.info('OrdersServices::createdCode::created:: is called');
  try {
    let flag = true;
    while (flag) {
      const code = crypto.randomBytes(4).toString('hex');
      const order = await OrderModel.findOne({ code }).lean();
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

const discount = (month, price) => {
  logger.info('OrdersServices::discount::created:: is called', { month, price });
  try {
    month = Number(month);
    price = Number(price);
   if(month >= PackageConstant.month.TWELVE)
   {
     return (month * price) - ((month * price) * PackageConstant.discount.A_YEAR);
   }

   if(month < PackageConstant.month.TWELVE && month >= PackageConstant.month.SIX)
   {
     return (month * price) - ((month * price) * PackageConstant.discount.SIX_MONTH);
   }

   if(month < PackageConstant.month.SIX && month >= PackageConstant.month.THREE)
   {
     return (month * price) - ((month * price) * PackageConstant.discount.THREE_MONTH);
   }

   else
   {
    return month * price;
   }
  } catch (e) {
    logger.error('OrdersServices::discount::error', e);
    throw e;
  }
}

module.exports = {
  createCode,
  discount
};
