const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const UserTokenModel = require('../userToken/userToken.model');
const UserTokenConstant = require('./userToken.constant');

const randomString = (length) => {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

const createUserToken = async (userId) => {
  logger.info('UserTokenService::createUserToken::success\n', {userId});
  const token = randomString(UserTokenConstant.randomStringNumber);
  const newTokenModel = new UserTokenModel({
    userId,
    token
  });

  return await newTokenModel.save();
};

module.exports = {
    createUserToken
}