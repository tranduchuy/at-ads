import Joi from '@hapi/joi';

const UpdateImage = Joi.object().keys(
  {
    image: Joi.string().required()
  }
);

export default UpdateImage;