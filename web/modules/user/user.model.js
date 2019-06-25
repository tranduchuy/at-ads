const mongoose = require('mongoose');
const UserConstant = require('./user.constant');
const StatusConstant = require('../../constants/status');
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
  email: String,
  passwordHash: String,
  passwordSalt: String,
  phone: String,
  name: String,
  birthday: Date,
  gender: {type: Number, default: UserConstant.gender.male},
  role: {type: Number, default: UserConstant.role.endUser},
  status: {type: Number, default: StatusConstant.status.PENDING_OR_WAIT_CONFIRM},
  date: {type: Number, default: Date.now},
  resetPasswordToken: String,
  expirationDate: {type: Number, default: Date.now()},
  tokenEmailConfirm: String,
  passwordReminderToken: String,
  passwordReminderExpire: Date,
  googleId: String
}, {timestamps: true});

const UserModel = mongoose.model('User', userSchema, 'Users');
module.exports = UserModel;
module.exports.Model = userSchema;

