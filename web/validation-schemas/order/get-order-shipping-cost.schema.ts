import Joi from '@hapi/joi';

const GetOrderShippingCostValidationSchema = Joi.object().keys({
      orderId: Joi.string().required(),
      addressId: Joi.string().required()
    }
);

export default GetOrderShippingCostValidationSchema;