const Joi = require('@hapi/joi');

const AddCampaingsValidationSchema = Joi.object().keys({
    campaignIds: Joi.array().items(Joi.number()).required()
});

module.exports = {
    AddCampaingsValidationSchema
};
