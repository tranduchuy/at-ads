import Joi from '@hapi/joi';

const AcceptShopSchema = Joi.object().keys(
  {
    shopId: Joi.string()
  }
);

export default AcceptShopSchema;