const Joi = require('@hapi/joi');

const ObjectValidationSchema = Joi.object().keys({
    campaignId   : Joi.number().required(),
    campaignName : Joi.string().required()
});

const AddCampaingsValidationSchema = Joi.object().keys({
    campaigns: Joi.array().items(ObjectValidationSchema).required(),
});

module.exports = {
    AddCampaingsValidationSchema
};
