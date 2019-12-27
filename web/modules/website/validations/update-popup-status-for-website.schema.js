const Joi = require('@hapi/joi');

const UpdatePopupStatusForWebsiteValidateSchema = Joi.object().keys({
    website: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    popupStatus: Joi.boolean().required(),
  }
);

module.exports = {
  UpdatePopupStatusForWebsiteValidateSchema
};
