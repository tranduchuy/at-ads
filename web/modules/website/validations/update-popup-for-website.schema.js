const Joi = require('@hapi/joi');

const UpdatePopupForWebsiteValidateSchema = Joi.object().keys({
    website: Joi.string().required(),
    themeColor: Joi.string(),
    supporterName: Joi.string(),
    supporterMajor: Joi.string(),
    supporterAvatar: Joi.string()
  }
);

module.exports = {
  UpdatePopupForWebsiteValidateSchema
};
