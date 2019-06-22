import Joi from '@hapi/joi';

const BoxSchema = Joi.object().keys({
    topic: Joi.number(),
    specialOccasion: Joi.number(),
    floret: Joi.number(),
    design: Joi.number(),
    color: Joi.number(),
    priceRange: Joi.number(),
    city: Joi.string(),
    district: Joi.number()
  }
);

export default BoxSchema;