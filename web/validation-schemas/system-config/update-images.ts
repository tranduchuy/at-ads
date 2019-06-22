import Joi from '@hapi/joi';

const UpdateImages = Joi.object().keys(
  {
    images: Joi.array().required()
  }
);

export default UpdateImages;