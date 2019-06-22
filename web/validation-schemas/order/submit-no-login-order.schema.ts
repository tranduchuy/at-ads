import Joi from '@hapi/joi';

const receiverInfoSchema = Joi.object().keys({
  name: Joi.string().required().min(3),
  phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/),
  address: Joi.string().required(),
  longitude: Joi.number().required(),
  latitude: Joi.number().required(),
}).required();

const orderItemSchema = Joi.object().keys({
  productId: Joi.string().required(),
  quantity: Joi.number().required()
});

const buyerInfoSchema = Joi.object().keys({
  name: Joi.string().required().min(3),
  phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/),
  email: Joi.string().email().allow('', null)
});

const SubmitNoLoginOrderValidationSchema = Joi.object().keys({
  receiverInfo: receiverInfoSchema,
  buyerInfo: buyerInfoSchema,
  items: Joi.array().items(orderItemSchema).required(),
  deliveryTime: Joi.date().required(),
  expectedDeliveryTime: Joi.string(),
  contentOrder: Joi.string().allow('', null)
});

export default SubmitNoLoginOrderValidationSchema;