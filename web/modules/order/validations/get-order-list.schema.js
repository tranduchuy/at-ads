const Joi = require('@hapi/joi');
const OrderStatus = require('../order.constant');

const GetOrderListValidationSchema = Joi.object().keys({
  status: Joi.valid([
    OrderStatus.status.NEW.toString(),
    OrderStatus.status.NOT_ENOUGH_MONEY.toString(),
    OrderStatus.status.PAYING.toString(),
    OrderStatus.status.SUCCESS.toString()
  ]),
  code: Joi.string(),
  page: Joi.number().min(1),
  limit: Joi.number().min(1)
});

module.exports = {
  GetOrderListValidationSchema
};
