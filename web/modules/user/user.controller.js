const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const ImageService = require('../../services/image.service');
const Mailer = require('../../utils/mailer');
const randomString = require('randomstring');
const Joi = require('@hapi/joi');
const { RegisterValidationSchema } = require('./validations/register.schema');

const UserConstant = require('./user.constant');
const { Status } = require('../../constants/status');
const { LoginValidationSchema } = require('./validations/login.schema');
const { ResendConfirm } = require('./validations/resend-confirm-email.schema');
const { ResetPasswordValidationSchema } = require('./validations/reset-password.schema');
const { ForgetPasswordValidationSchema } = require('./validations/forget-password.schema');
const { LoginGoogleValidationSchema } = require('./validations/login-google.schema');
const HttpStatus = require("http-status-codes");
const UserService = require('./user.service');
const UserModel = require('./user.model');
const messages = require("../../constants/messages");

const forgetPassword = async (request, res, next) => {
  logger.info('UserController::forgetPassword is called');
  try {
    const { error } = Joi.validate(request.query, ForgetPasswordValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };
      return res.json(result);
    }

    const { email } = request.query;
    const user = await UserService.findByEmail(email);

    if (!user) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.Login.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }

    if (user.registerBy !== RegisterByTypes.NORMAL) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.ForgetPassword.INVALID_REGISTER_TYPE],
        data: {}
      };
      return res.json(result);
    }
    await UserService.generateForgetPasswordToken(user);
    await Mailer.sendResetPassword(user.email, user.name, user.passwordReminderToken);
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.ForgetPassword.FORGET_PASSWORD_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.json(result);
  } catch (e) {
    logger.error('UserController::forgetPassword error: ', e);
    return next(e);
  }
};

const resetPassword = async (request, res, next) => {
  logger.info('UserController::resetPassword is called');
  try {
    const { error } = Joi.validate(request.body, ResetPasswordValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };
      return res.json(result);
    }
    const { token, password, confirmedPassword } = request.body;
    if (password !== confirmedPassword) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return res.json(result);
    }
    const user = await UserService.findUserByPasswordReminderToken(token);
    if (!user) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }
    if (UserService.isExpiredTokenResetPassword(user.passwordReminderExpire)) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.ResetPassword.EXPIRED_TOKEN],
        data: {}
      };
      return res.json(result);
    }
    await UserService.resetPassword(password, user);
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.ResetPassword.RESET_PASSWORD_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.json(result);
  } catch (e) {
    logger.error('UserController::resetPassword error', e);
    return next(e);
  }
};

const balance = async (req, res, next) => {
  logger.info('UserController::balance is called');
  try {
    const user = req.user;
    let account = await AccountModel.findOne({ owner: user._id });

    if (!account) {
      account = new AccountModel({ owner: user._id });
      account = await account.save();
    }

    const accountInfo = {
      main: account.main,
      promo: account.promo
    };

    if (user.type === global.USER_TYPE_COMPANY) {
      let creditTransferred = 0;
      const children = await ChildModel.find({ companyId: user._id });

      if (children && children.length > 0) {
        children.forEach(child => {
          creditTransferred += (child.credit - child.creditUsed);
        });
      }

      accountInfo.creditTransferred = creditTransferred;
    }

    if (user.type === global.USER_TYPE_PERSONAL) {
      const child = await ChildModel.find({ personalId: user._id, status: global.STATUS.CHILD_ACCEPTED });
      if (child) {
        accountInfo.credit = child.credit;
        accountInfo.creditUsed = child.creditUsed;
      }
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      data: accountInfo,
      message: 'request success'
    });
  } catch (e) {
    logger.error('UserController::balance::error', e);
    return next(e);
  }
};

const confirm = async (request, res, next) => {
  logger.info('UserController::confirm is called');
  try {
    const { token } = request.query;
    const user = await UserModel.findOne({
      tokenEmailConfirm: token
    });
    if (!user) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.Confirm.INVALID_TOKEN],
        data: {}
      };
      return res.json(result);
    }
    user.status = Status.ACTIVE;
    user.tokenEmailConfirm = '';
    await user.save();
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.Confirm.CONFIRM_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.json(result);
  } catch (e) {
    logger.error('UserController::register::error', e);
    return next(e);
  }
};

const register = async (request, res, next) => {
  logger.info('UserController::register is called');

  try {
    const { error } = Joi.validate(request.body, RegisterValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });

      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };

      return res.json(result);
    }

    const { email, password, confirmedPassword, name, username, phone, address, gender, city, district, ward } = request.body;
    const duplicatedEmail = await UserModel.find({ email: email });
    if (duplicatedEmail.length !== 0) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages.ResponseMessages.User.Register.EMAIL_DUPLICATED],
        data: {}
      };
      return res.json(result);
    }

    if (password !== confirmedPassword) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return res.json(result);
    }

    const duplicatedUsers = await UserModel.find({ email: email });
    if (duplicatedUsers.length !== 0) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages.ResponseMessages.User.Register.EMAIL_DUPLICATED],
        data: {}
      };
      return res.json(result);
    }

    const newUserData = {
      email,
      name,
      password,
      role: null,
      phone: phone,
      gender,
      city: city || null,
      district: district || null,
      ward: ward || null,
      address,
    };
    const newUser = await UserService.createUser(newUserData);
    if (request.user && [UserRoles.USER_ROLE_MASTER, UserRoles.USER_ROLE_ADMIN].some(request.user.role)) {
      newUser.status = Status.ACTIVE;
      newUser.tokenEmailConfirm = '';
      await newUser.save();
    } else {
      // Send email
      Mailer.sendConfirmEmail(email, name, newUser.tokenEmailConfirm);
      // this.smsService.sendSMS([phone], `Mã xác thục tài khoản: ${otpCode}`, '');
    }
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.Register.REGISTER_SUCCESS],
      data: {
        meta: {},
        entries: [{ email, name, username, phone, address, gender, city, district, ward }]
      }
    };
    res.json(result);
  } catch (e) {
    logger.error('UserController::register::error', e);
    return next(e);
  }
};

const loginByGoogle = async (request, res, next) => {
  try {
    const { error } = Joi.validate(request.body, LoginGoogleValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };
      return res.json(result);
    }
    const { email, googleId, name } = request.body;
    let user = await UserService.findByGoogleId(googleId);
    if (!user) {
      user = await UserService.findByEmail(email);
      if (user) {
        user = await UserService.updateGoogleId(user, googleId);
      } else {
        const newUser = {
          name,
          email,
          googleId
        };
        user = await UserService.createUserByGoogle(newUser);
        const result = {
          status: HttpStatus.CREATED,
          messages: [messages.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
          data: {
            meta: {},
            entries: []
          }
        };
        return res.json(result);
      }
    }
    if (user.status === Status.PENDING_OR_WAIT_CONFIRM) {
      const result = {
        status: HttpStatus.CREATED,
        messages: [messages.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
        data: {
          meta: {},
          entries: []
        }
      };
      return res.json(result);
    }
    const userInfoResponse = {
      _id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      address: user.address,
      type: user.type,
      status: user.status,
      avatar: user.avatar,
      gender: user.gender,
      city: user.city,
      district: user.district,
      ward: user.ward,
      registerBy: user.registerBy,
      googleId: user.googleId
    };
    const token = UserService.generateToken({ _id: user._id });
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.Login.LOGIN_SUCCESS],
      data: {
        meta: {
          token
        },
        entries: [userInfoResponse]
      }
    };
    return res.json(result);
  } catch (e) {
    logger.error('UserController::loginByGoogle::error', e);
    return next(e);
  }
};

const login = async (request, res, next) => {
  logger.info('UserController::login is called');
  try {
    const { error } = Joi.validate(request.body, LoginValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages,
        data: {}
      };
      return res.json(result);
    }

    const { email, password } = request.body;
    const emailOrPhone = email;
    const user = await UserService.findByEmailOrPhone(emailOrPhone, emailOrPhone);

    if (!user) {
      const result = {
        status: HttpStatus.NOT_FOUND,
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }

    console.log(JSON.stringify(user));

    if (!UserService.isValidHashPassword(user.passwordHash, password)) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.Login.WRONG_PASSWORD],
        data: {}
      };
      return res.json(result);
    }

    if (user.status !== Status.ACTIVE) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.Login.INACTIVE_USER],
        data: {}
      };
      return res.json(result);
    }

    const userInfoResponse = {
        _id: user._id,
        role: user.role,
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        address: user.address,
        type: user.type,
        status: user.status,
        avatar: user.avatar,
        gender: user.gender,
        city: user.city,
        district: user.district,
        ward: user.ward,
        registerBy: user.registerBy
      }
    ;
    const token = UserService.generateToken({ _id: user._id });

    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.Login.LOGIN_SUCCESS],
      data: {
        meta: {
          token
        },
        entries: [userInfoResponse]
      }
    };

    return res.json(result);
  } catch (e) {
    logger.error('UserController::login::error', e);
    return next(e);
  }
};

const resendConfirm = async (req, res, next) => {
  logger.info('UserController::resendConfirm is called');

  try {
    const { error } = Joi.validate(req.body, ResendConfirm);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: messages
      };
      return res.json(result);
    }
    const user = await UserService.findByEmail(req.body.email);
    if (!user || user.status !== Status.PENDING_OR_WAIT_CONFIRM) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND]
      };
      return res.json(result);
    }
    const tokenEmailConfirm = randomString.generate({
      length: UserConstant.tokenConfirmEmailLength,
      charset: 'alphabetic'
    });
    user.tokenEmailConfirm = tokenEmailConfirm;
    await user.save();
    Mailer.sendConfirmEmail(user.email, user.name, tokenEmailConfirm);
    const result = {
      status: HttpStatus.OK,
      messages: [messages.ResponseMessages.User.Confirm.CONFIRM_SUCCESS]
    };
    return res.json(result);
  } catch (e) {
    logger.error('UserController::resendConfirm::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('UserController::update::called');

  try {
    const user = req.user;
    let { password, name, phone, birthday, gender, city, district, ward, type, avatar, oldPassword, confirmedPassword } = req.body;
    const postData = {
      password,
      name,
      phone,
      birthday,
      gender,
      city,
      district,
      ward,
      type,
      avatar,
      oldPassword,
      confirmedPassword
    };

    if (avatar)
      ImageService.postConfirmImage([avatar]);

    const apiUrl = CDP_APIS.USER.UPDATE_USER_INFO.replace(':id', req.user.id);
    put(apiUrl, postData, req.user.token)
      .then((r) => {
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: r.data.entries[0],
          message: 'Success'
        });
      })
      .catch(err => {
        logger.error('UserController::update::error', err);
        return next(err);
      });
  } catch (e) {
    logger.error('UserController::update::error', e);
    return next(e);
  }
};

const check = async (req, res, next) => {
  logger.info('UserController::check::called');
  const username = req.body.username || '';
  const email = req.body.email || '';

  try {
    get(`${CDP_APIS.USER.CHECK_DUP_USERNAME_EMAIL}?email=${email}&username=${username}`)
      .then(r => {
        if (r.data.meta.isDuplicate) {
          return res.json({
            status: HTTP_CODE.SUCCESS,
            data: false,
            message: (username ? 'username' : 'email') + ' duplicated'
          });
        }

        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: true,
          message: (username ? 'username' : 'email') + ' available'
        });
      })
      .catch(err => {
        return next(err);
      });
  } catch (e) {
    logger.error('UserController::check:error', e);
    return next(e);
  }
};

const getLoggedInInfo = async (req, res, next) => {
  logger.info('UserController::getLoggedInInfo::called');
  try {
    get(CDP_APIS.USER.INFO, req.user.token)
      .then((response) => {
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: {
            user: response.data.entries[0]
          }
        })
      })
      .catch(e => {
        logger.error('UserController::getLoggedInInfo::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::getLoggedInInfo::error', e);
    return next(e);
  }
};

module.exports = {
  login,
  confirm,
  register,
  forgetPassword,
  getLoggedInInfo,
  resetPassword,
  check,
  resendConfirm,
  update,
  loginByGoogle
};
