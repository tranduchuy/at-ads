const BaseJoi = require('@hapi/joi');
const Extension = require('@hapi/joi-date');
const Joi = BaseJoi.extend(Extension);

const UpdatePackageForUserValidationSchema = Joi.object().keys({
  userId: BaseJoi.string().required(),
  packageId: BaseJoi.string().required(),
  expiredAt: Joi.date().format('DD-MM-YYYY'),
});

module.exports = {
  UpdatePackageForUserValidationSchema
};
