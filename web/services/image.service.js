const request = require('request');
const _ = require('lodash');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const postConfirmImage = function (paths) {
  logger.info('ImageService::postConfirmImage was called with: ' + JSON.stringify(paths));

  const option = {
    "rejectUnauthorized": false,
    uri: global.API_COMFIRM_IMAGE,
    json: { paths },
    method: 'POST'
  };
  try {
    request(option, (err) => {
      if (err) {
        logger.error(`POST CONFIRM IMAGE error: ${JSON.stringify(err)}. Params: ${JSON.stringify(option)}`);
      } else {
        logger.info('POST CONFIRM IMAGE info' + JSON.stringify(option));
      }
    });
  } catch (e) {
    logger.error(`POST CONFIRM IMAGE error: ${JSON.stringify(e)}. Params: ${JSON.stringify(option)}`);
  }
};

const putUpdateImage = (oldImages, newImages) => {

  if (oldImages.constructor !== Array || newImages.constructor !== Array) {
    logger.error('oldImages or newImages is not Array', oldImages, newImages);
    throw new Error('oldImages or newImages is not Array');
  }

  logger.info('ImageService::putUpdateImage was called with: ' + JSON.stringify({ oldImages, newImages }));

  const imagesDelete = _.difference(oldImages, newImages);
  const imagesAdd = _.difference(newImages, oldImages);

  const option = {
    "rejectUnauthorized": false,
    uri: global.API_COMFIRM_IMAGE,
    method: 'PUT',
    json: { oldImages: imagesDelete, newImages: imagesAdd }
  };

  try {
    request.put(option, (err) => {
      if (err) {
        logger.error(`POST CONFIRM IMAGE error: ${JSON.stringify(err)}. Params: ${JSON.stringify(option)}`);
      } else {
        logger.info(['PUST UPDATE IMAGE info', global.API_COMFIRM_IMAGE, option]);
      }
    })
  } catch (e) {
    logger.error(`POST CONFIRM IMAGE error: ${JSON.stringify(e)}. Params: ${JSON.stringify(option)}`);
  }
};

module.exports = {
  postConfirmImage,
  putUpdateImage
};