const Joi = require('@hapi/joi');

const AddCampaingsValidationSchema = Joi.object().keys({
    campaignIds: Joi.array().items(Joi.number()).min(1).required()
});

module.exports = {
    AddCampaingsValidationSchema
};
