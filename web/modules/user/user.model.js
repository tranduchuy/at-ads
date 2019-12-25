const mongoose = require('mongoose');
const UserConstant = require('./user.constant');
const StatusConstant = require('../../constants/status');
const Schema = mongoose.Schema;
const userSchema = new Schema({
  email: String,
  passwordHash: String,
  passwordSalt: String,
  name: String,
  role: {type: Number, default: UserConstant.role.endUser},
  status: {type: Number, default: StatusConstant.Status.PENDING_OR_WAIT_CONFIRM},
  date: {type: Number, default: Date.now},
  resetPasswordToken: String,
  expirationDate: {type: Number, default: Date.now()},
  tokenEmailConfirm: String,
  registerBy: Number,
  passwordReminderToken: String,
  dateOfMailing: {type: Date, default: null},
  passwordReminderExpire: Date,
  googleId: String,
  googleRefreshToken: {
    type: String,
    default: ''
  },
  googleAccessToken: {
    type: String,
    default: ''
  },
  avatar: String,
  expiryDateOfAccesstoken: {type: Date, default: null},
  expiryDateOfRefreshToken: {type: Date, default: null},
  phone: {type: String, default:null},
  isRefreshTokenValid: { type: Boolean }
}, {timestamps: true});

const UserModel = mongoose.model('User', userSchema, 'Users');
module.exports = UserModel;
module.exports.Model = userSchema;

