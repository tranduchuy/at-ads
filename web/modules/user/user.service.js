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

const createUserByGoogle = async ({ email, name, googleId }) => {
  const newUser = new UserModel({
    email,
    passwordHash: null,
    passwordSalt: null,
    name,
    tokenEmailConfirm: null,
    registerBy: UserConstant.registerByTypes.google,
    status: Status.PENDING_OR_WAIT_CONFIRM,
    role: UserConstant.role.endUser,
    googleId
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

const updateUser = async ( { password, name, phone,
                          birthday, gender, avatar, email} ) =>  {
  const updateUser = await UserModel.findOne({ email: email });
  const salt = bcrypt.genSaltSync(UserConstant.saltLength);
  return updateUser.update({
    passwordHash: bcrypt.hashSync(password, salt),
    passwordSalt: salt,
    name,
    phone,
    birthday,
    gender,
    avatar
  });
};
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
  updateUser
};
