import Joi from '@hapi/joi';

const AddOneProductToCartSchema = Joi.object().keys({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required()
  }
);

export default AddOneProductToCartSchema;