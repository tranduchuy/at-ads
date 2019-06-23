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
 * @param phone
 * @param address
 * @param city
 * @param district
 * @param ward
 * @param {number} gender
 * @returns {Promise<this|Errors.ValidationError>|*|void}
 */
const createUser = async ({
                            email, password, type, name, phone, address,
                            city, district, ward, registerBy, gender,
                            role, otpCode
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
    username: '',
    phone,
    tokenEmailConfirm,
    registerBy,
    status: Status.PENDING_OR_WAIT_CONFIRM,
    address: address || '',
    city: city || null,
    district: district || null,
    ward: ward || null,
    gender: gender || null,
    role: role || UserRoles.EndUser,
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

const findByEmailOrPhone = async (email, phone) => {
  const userByEmail = await findByEmail(email);
  const userByPhone = await findByPhone(phone);

  return userByEmail || userByPhone || null;
};

const findByEmail = async (email) => {
  return await UserModel.findOne({ email: email });
};

const findByGoogleId = async (googleId) => {
  return await UserModel.findOne({ googleId: googleId });
};

const findByPhone = async (phone) => {
  return await UserModel.findOne({ phone });
};

const updateGoogleId = async (user, googleId) => {
  user.googleId = googleId;
  return await user.save();
};

const createUserByGoogle = async ({ email, name, googleId }) => {
  const username = email.split('@')[0];
  const newUser = new UserModel({
    email,
    passwordHash: null,
    passwordSalt: null,
    type: UserTypes.TYPE_CUSTOMER,
    name,
    username: username,
    phone: null,
    tokenEmailConfirm: null,
    registerBy: RegisterByTypes.GOOGLE,
    status: Status.PENDING_OR_WAIT_CONFIRM,
    address: null,
    city: null,
    district: null,
    ward: null,
    gender: null,
    role: UserRoles.USER_ROLE_ENDUSER,
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

module.exports = {
  createUser,
  generateToken,
  isExpiredTokenResetPassword,
  isValidHashPassword,
  generateOTPCode,
  findByEmailOrPhone,
  findByGoogleId,
  updateGoogleId,
  findByEmail,
  createUserByGoogle,
  resetPassword,
  generateForgetPasswordToken,
  findUserByPasswordReminderToken
};
