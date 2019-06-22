import Joi from '@hapi/joi';

const item = Joi.object().keys({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

const AddManyProductsToCartSchema = Joi.object().keys({
    items: Joi.array().required().items(item)
  }
);

export default AddManyProductsToCartSchema;