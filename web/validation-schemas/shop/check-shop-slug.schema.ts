import Joi from '@hapi/joi';

const CheckShopSlug = Joi.object().keys(
  {
    slug: Joi.string().regex(/[a-zA-Z0-9]+/).required()
  }
);

export default CheckShopSlug;