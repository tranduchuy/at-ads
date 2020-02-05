const Joi = require('@hapi/joi');

const UpdateElementOfPackageValidationSchema = Joi.object().keys({
      packageId: Joi.string().required(),
      price: Joi.number(),
      name: Joi.string(),
      interests: Joi.array().items(Joi.string())
    }
);

module.exports = {
  UpdateElementOfPackageValidationSchema
};
