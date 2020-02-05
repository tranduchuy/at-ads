const Joi = require('@hapi/joi');

const UpdateFakeCustomerForWebsiteValidationSchema = Joi.object().keys({
    website: Joi.string().required(),
    isEnable: Joi.boolean(),
    runningDevices: Joi.array().items(Joi.number().valid([1, 2, 3])).unique(),
    positionOnPage: Joi.number().valid([1,2,3,4]),
    autoDisplayTime: Joi.array().items(Joi.number().min(10).max(90)).length(2),
    avatarType: Joi.number().valid([1,2,3,4]),
    title: Joi.string().allow(""),
    body: Joi.string().allow(""),
    pageUrl: Joi.string().allow("").regex(/^(?:http(s)?:\/\/)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/),
    themeColor: Joi.string(),
    shape: Joi.number().valid([1,2])
  }
);

module.exports = {
  UpdateFakeCustomerForWebsiteValidationSchema
};
