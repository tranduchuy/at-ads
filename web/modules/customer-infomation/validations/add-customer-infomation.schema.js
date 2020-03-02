const Joi = require('@hapi/joi');

const AddCustomerInfomationValidationSchema = Joi.object().keys({
    uuid: Joi.string().required(),
    email: Joi.string().regex(/^[a-z][a-z0-9_\.]{5,32}@[a-z0-9]{2,}(\.[a-z0-9]{2,4}){1,2}$/),
    name: Joi.string().required(),
    phoneNumber: Joi.string().required().regex(/((09|03|07|08|05)+([0-9]{8})\b)/),
    domain: Joi.string().required(),
    key: Joi.string().required(),
    gclid: Joi.string().allow('')
  }
);

module.exports = {
    AddCustomerInfomationValidationSchema
};
