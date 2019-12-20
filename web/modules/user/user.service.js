/**
 * @type UserModel
 */
const UserModel = require('./user.model');
const log4js = require('log4js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');
const moment = require('moment');
const UserConstant = require('./user.constant');
const RandomString = require('randomstring');
const { Status } = require('../../constants/status');
const GlobalConstant = require('../../constants/global.constant');
const logger = log4js.getLogger(GlobalConstant.LoggerTargets.Service);
const messages = require('../../constants/messages');
const UserTokenService = require('../userToken/userToken.service');
const SendGridServices = require('../../services/send-grid.service');

/**
 * Compare hash password with input plain text
 * @param {string} hashed
 * @param plainText
 * @returns {boolean}
 * @private
 */
const isValidHashPassword = (hashed, plainText) => {
  try {
    return bcrypt.compareSync(plainText, hashed);
  } catch (e) {
    logger.error('UserService::isValidHashPassword::error', e);
    return false;
  }
};

/**
 *
 * @param {string} email
 * @param password
 * @param type
 * @param name
 * @param username
 * @returns {Promise<this|Errors.ValidationError>|*|void}
 */
const createUser = async ({
                            email, password, type,
                            name, registerBy, role, otpCode
                          }) => {
  const salt = bcrypt.genSaltSync(UserConstant.saltLength);
  const tokenEmailConfirm = RandomString.generate({
    length: UserConstant.tokenConfirmEmailLength,
    charset: 'alphabetic'
  });

  const newUser = new UserModel({
    email,
    passwordHash: bcrypt.hashSync(password, salt),
    passwordSalt: salt,
    type,
    name,
    tokenEmailConfirm,
    registerBy,
    status: Status.PENDING_OR_WAIT_CONFIRM,
    role: role || UserConstant.role.endUser,
    otpCodeConfirmAccount: otpCode
  });

  return await newUser.save();
};

/**
 * Create 4 digits of OTP
 * @return {string}
 */
const generateOTPCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generate token by data
 * @param {object} data
 * @returns {string}
 */
const generateToken = (data) => {
  const secretKey = config.get('jwt').secret;
  return jwt.sign(data, secretKey, {
    expiresIn: (60 * 60) * UserConstant.tokenExpiredInHour
  });
};

/**
 *
 * @param {Date} expiredOn
 * @returns {boolean}
 */
const isExpiredTokenResetPassword = (expiredOn) => {
  return moment(expiredOn).isBefore(moment());
};

/**
 *
 * @param email
 * @returns {Promise<*>}
 */
const findByEmail = async (email) => {
  return await UserModel.findOne({ email: email });
};

const findByGoogleId = async (googleId) => {
  return await UserModel.findOne({ googleId: googleId });
};

const updateGoogleId = async (user, googleId) => {
  user.googleId = googleId;
  return await user.save();
};

/**
 * Create new user login by Google
 * @param {{email: string, name: string, googleId: string, image: string, accessToken: string, refreshToken: string, expiryDateOfAccesstoken: Date, expiryDateOfRefreshToken: Date}} userData
 * @return {Promise<*>}
 */
const createUserByGoogle = async (userData) => {
  const {email, name, googleId, image, accessToken, refreshToken, expiryDateOfAccesstoken, expiryDateOfRefreshToken, isRefreshTokenValid} = userData;
  const newUser = new UserModel({
    email,
    passwordHash: null,
    passwordSalt: null,
    name,
    tokenEmailConfirm: null,
    registerBy: UserConstant.registerByTypes.google,
    status: Status.ACTIVE,
    role: UserConstant.role.endUser,
    googleId,
    avatar: image,
    googleAccessToken: accessToken,
    googleRefreshToken: refreshToken,
    expiryDateOfAccesstoken,
    expiryDateOfRefreshToken,
    isRefreshTokenValid
  });

  return await newUser.save();
};

const resetPassword = async (newPassword, user) => {
  user.passwordHash = bcrypt.hashSync(newPassword, user.passwordSalt);
  user.passwordReminderToken = '';
  return await user.save();
};

const generateForgetPasswordToken = async (user) => {
  const reminderToken = RandomString.generate();
  const reminderExpired = moment().add(2, 'hours');
  user.passwordReminderToken = reminderToken;
  user.passwordReminderExpire = reminderExpired;
  return await user.save();
};

/**
 * @param {string} passwordReminderToken
 * @return {Promise<*>}
 */
const findUserByPasswordReminderToken = async (passwordReminderToken) => {
  return await UserModel.findOne({
    passwordReminderToken: passwordReminderToken
  });
};

const updateUser = async ( { password, name, phone, email} ) =>  {
  const dataForUpdating = {};
  const updateUser = await UserModel.findOne({ email });
  if (password) {
    const salt = bcrypt.genSaltSync(UserConstant.saltLength);
    dataForUpdating.passwordHash = bcrypt.hashSync(password, salt);
    dataForUpdating.passwordSalt = salt;
  }
  // if (avatar) dataForUpdating.avatar = avatar;
  // if (birthday) dataForUpdating.birthday = birthday;
  // if (gender) dataForUpdating.gender = gender;
  if (name) dataForUpdating.name = name;
  if (phone) dataForUpdating.phone = phone;
  await updateUser.update(dataForUpdating);
  return await UserModel.findOne({email});
};

const getAccountInfo = async (user, message) => {
  const userInfoResponse = {
    _id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    status: user.status,
    registerBy: user.registerBy,
    googleId: user.googleId,
    usePassword: !!user.passwordHash || !!user.passwordSalt,
    avatar: user.avatar || '',
    licence: {
      type: user.userLicence.packageId ? user.userLicence.packageId.type : null, 
      name: user.userLicence.packageId ? user.userLicence.packageId.name : null,
      expiredAt: moment(user.userLicence.expiredAt)
    }
  };
  const userToken = await UserTokenService.createUserToken(user._id);

  return {
    messages: [message],
    data: {
      meta: {
        token: userToken.token
      },
      user: userInfoResponse
    }
  };
};

const sendMailWhenRefreshTokenExpired = async (user) => {
  logger.info('UserService::sendMailWhenRefreshTokenExpired::is called', {userId: user._id});
  try{
    const dateOfMailing = user.dateOfMailing ? moment(user.dateOfMailing) : null;
    const now = moment();

    if(!dateOfMailing || now.isAfter(dateOfMailing))
    {
      logger.info('UserService::sendMailWhenRefreshTokenExpired::sending...');
      user.dateOfMailing = moment().add(3, 'days').endOf('day');
      await user.save();
      await SendGridServices.sendRefreshTokenExpiredMessage(user.email);
    }

    logger.info('UserService::sendMailWhenRefreshTokenExpired::success');
    return;
  }catch(e){
    logger.error('UserService::sendMailWhenRefreshTokenExpired::error', e);
    throw new Error(e)
  }
}

module.exports = {
  createUser,
  generateToken,
  isExpiredTokenResetPassword,
  isValidHashPassword,
  generateOTPCode,
  findByGoogleId,
  updateGoogleId,
  findByEmail,
  createUserByGoogle,
  resetPassword,
  generateForgetPasswordToken,
  findUserByPasswordReminderToken,
  updateUser,
  getAccountInfo,
  sendMailWhenRefreshTokenExpired
};
