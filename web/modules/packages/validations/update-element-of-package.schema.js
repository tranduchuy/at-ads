const Joi = require('@hapi/joi');

const UpdateElementOfPackageValidationSchema = Joi.object().keys({
      packageId: Joi.string().required(),
      price: Joi.number(),
      name: Joi.string(),
      interests: Joi.array().items(Joi.string()),
      isContactPrice: Joi.boolean(),
      discountMonths: Joi.array().items(Joi.number().min(0)).length(4),
      contact: Joi.string().allow('')
    }
);

module.exports = {
  UpdateElementOfPackageValidationSchema
};
