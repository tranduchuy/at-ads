const Joi = require('@hapi/joi');

const UpdatePackageForUserValidationSchema = Joi.object().keys({
  userId: Joi.string().required(),
  packageId: Joi.string().required(),
  expiredAt: Joi.number().min(1),
});

module.exports = {
  UpdatePackageForUserValidationSchema
};
