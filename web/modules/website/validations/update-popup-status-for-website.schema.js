const Joi = require('@hapi/joi');

const UpdatePopupStatusForWebsiteValidateSchema = Joi.object().keys({
    website: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    popupStatus: Joi.boolean(),
    popupPosition: Joi.number().valid([1, 2]),
    autoShowPopupRepeatTime: Joi.number(),
    autoShowPopup: Joi.boolean(),
  }
);

module.exports = {
  UpdatePopupStatusForWebsiteValidateSchema
};
