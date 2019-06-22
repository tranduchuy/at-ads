import Joi from '@hapi/joi';

const SubmitOrderValidationSchema = Joi.object().keys({
    address: Joi.string().required(),
    deliveryTime: Joi.date().required(),
    expectedDeliveryTime: Joi.string(),
    note: Joi.string(),
    contentOrder: Joi.string().allow('', null)
  }
);

export default SubmitOrderValidationSchema;