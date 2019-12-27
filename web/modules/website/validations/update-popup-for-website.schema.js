const Joi = require('@hapi/joi');

const UpdatePopupForWebsiteValidateSchema = Joi.object().keys({
    website: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    themeColor: Joi.string(),
    supporterName: Joi.string(),
    supporterMajor: Joi.string(),
    supporterAvatar: Joi.string()
  }
);

module.exports = {
  UpdatePopupForWebsiteValidateSchema
};
