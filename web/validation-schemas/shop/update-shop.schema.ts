import Joi from '@hapi/joi';

const shopShipAddress = Joi.object().keys({
  city: Joi.string().required(),
  district: Joi.number()
});


const UpdateShopSchema = Joi.object().keys(
  {
    availableShipCountry: Joi.boolean().required(),
    availableShipAddresses: Joi.array().items(shopShipAddress),
    city: Joi.string(),
    district: Joi.number(),
    ward: Joi.number(),
    address: Joi.string().required(),
    longitude: Joi.number().required(),
    latitude: Joi.number().required()
  }
);

export default UpdateShopSchema;