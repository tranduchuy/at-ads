const Joi = require('@hapi/joi');

const UpdatePopupForWebsiteValidateSchema = Joi.object().keys({
    website: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    themeColor: Joi.string().required(),
    supporterName: Joi.string().required().max(30),
    supporterMajor: Joi.string().max(30),
    supporterAvatar: Joi.string().required(),
    supporterPhone: Joi.string().regex(/((09|03|07|08|05)+([0-9]{8})\b)/),
  }
);

module.exports = {
  UpdatePopupForWebsiteValidateSchema
};
