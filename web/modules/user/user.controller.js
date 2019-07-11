const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
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
const { CheckValidationSchema } = require("./validations/check.schema");
const { UpdateValidationSchema } = require("./validations/update.schema");
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
        messages: messages,
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const { email } = request.query;
    const user = await UserService.findByEmail(email);

    if (!user) {
      const result = {
        messages: [messages.ResponseMessages.User.Login.USER_NOT_FOUND],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    if (user.registerBy !== UserConstant.registerByTypes.normal) {
      const result = {
        messages: [messages.ResponseMessages.User.ForgetPassword.INVALID_REGISTER_TYPE],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    await UserService.generateForgetPasswordToken(user);
    await Mailer.sendResetPassword(user.email, user.name, user.passwordReminderToken);
    const result = {
      messages: [messages.ResponseMessages.User.ForgetPassword.FORGET_PASSWORD_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.status(HttpStatus.OK).json(result);
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
        messages: messages,
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const { token, password, confirmedPassword } = request.body;
    if (password !== confirmedPassword) {
      const result = {
        messages: [messages.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    const user = await UserService.findUserByPasswordReminderToken(token);
    if (!user) {
      const result = {
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    if (UserService.isExpiredTokenResetPassword(user.passwordReminderExpire)) {
      const result = {
        messages: [messages.ResponseMessages.User.ResetPassword.EXPIRED_TOKEN],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    await UserService.resetPassword(password, user);
    const result = {
      messages: [messages.ResponseMessages.User.ResetPassword.RESET_PASSWORD_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.status(HttpStatus.OK).json(result);
  } catch (e) {
    logger.error('UserController::resetPassword error', e);
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
        messages: [messages.ResponseMessages.User.Confirm.INVALID_TOKEN],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
    user.status = Status.ACTIVE;
    user.tokenEmailConfirm = '';
    await user.save();
    const result = {
      messages: [messages.ResponseMessages.User.Confirm.CONFIRM_SUCCESS],
      data: {}
    };
    logger.info('UserController::confirm::success', JSON.stringify(user));

    return res.status(HttpStatus.OK).json(result);
  } catch (e) {
    logger.error('UserController::confirm::error', e);
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
        messages: messages,
        data: {}
      };

      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const { email, password, confirmedPassword, name} = request.body;
    const duplicatedEmail = await UserModel.find({ email: email });
    if (duplicatedEmail.length !== 0) {
      const result = {
        messages: [messages.ResponseMessages.User.Register.EMAIL_DUPLICATED],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    if (password !== confirmedPassword) {
      const result = {
        messages: [messages.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const newUserData = {
      email,
      name,
      password,
      role: null,
      registerBy: UserConstant.registerByTypes.normal
    };
    const newUser = await UserService.createUser(newUserData);
    Mailer.sendConfirmEmail(email, name, newUser.tokenEmailConfirm);

    const result = {
      messages: [messages.ResponseMessages.User.Register.REGISTER_SUCCESS],
      data: { email, name }
    };

    logger.info('UserController:;register::success', JSON.stringify(newUser));
    return res.status(HttpStatus.OK).json(result);
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
        messages: messages,
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
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
          messages: [messages.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
          data: {
            meta: {},
            entries: []
          }
        };
        return res.status(HttpStatus.CREATED).json(result);
      }
    }
    if (user.status === Status.PENDING_OR_WAIT_CONFIRM) {
      const result = {
        messages: [messages.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
        data: {
          meta: {},
          entries: []
        }
      };
      return res.status(HttpStatus.CREATED).json(result);
    }
    const userInfoResponse = {
      _id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      status: user.status,
      registerBy: user.registerBy,
      googleId: user.googleId
    };
    const token = UserService.generateToken({ _id: user._id });
    const result = {
      messages: [messages.ResponseMessages.User.Login.LOGIN_SUCCESS],
      data: {
        meta: {
          token
        },
        entries: [userInfoResponse]
      }
    };
    return res.status(HttpStatus.OK).json(result);
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
        messages: messages,
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const { email, password } = request.body;
    const user = await UserService.findByEmail(email);

    if (!user) {
      const result = {
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.status(HttpStatus.NOT_FOUND).json(result);
    }

    if (!UserService.isValidHashPassword(user.passwordHash, password)) {
      const result = {
        messages: [messages.ResponseMessages.User.Login.WRONG_PASSWORD],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    if (user.status !== Status.ACTIVE) {
      const result = {
        messages: [messages.ResponseMessages.User.Login.INACTIVE_USER],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const userInfoResponse = {
        _id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
        type: user.type,
        status: user.status,
        registerBy: user.registerBy
      }
    ;
    const token = UserService.generateToken({ _id: user._id });

    const result = {
      messages: [messages.ResponseMessages.User.Login.LOGIN_SUCCESS],
      data: {
        meta: {
          token
        },
        user: userInfoResponse
      }
    };

    return res.status(HttpStatus.OK).json(result);
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
        messages: messages
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const user = await UserService.findByEmail(req.body.email);
    if (!user || user.status !== Status.PENDING_OR_WAIT_CONFIRM) {
      const result = {
        messages: [messages.ResponseMessages.User.USER_NOT_FOUND]
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const tokenEmailConfirm = randomString.generate({
      length: UserConstant.tokenConfirmEmailLength,
      charset: 'alphabetic'
    });
    user.tokenEmailConfirm = tokenEmailConfirm;
    await user.save();
    Mailer.sendConfirmEmail(user.email, user.name, tokenEmailConfirm);
    const result = {
      messages: [messages.ResponseMessages.User.RESEND_CONFIRM_EMAIL]
    };
    logger.error('UserController::resendConfirm::success', JSON.stringify({email: req.body.email}));

    return res.status(HttpStatus.OK).json(result);
  } catch (e) {
    logger.error('UserController::resendConfirm::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('UserController::update::called');

  try {
    const user = req.user;
    const { error } = Joi.validate(req.body, UpdateValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        messages: messages
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    let { password, name, phone, birthday, gender, oldPassword, confirmedPassword } = req.body;
    const updateData = { email: user.email};
    if (oldPassword && password && confirmedPassword) {
      const isCorrectPassword = await UserService.isValidHashPassword(user.passwordHash, oldPassword);

      if (!isCorrectPassword) {
        const result = {
          messages: [messages.ResponseMessages.User.Login.WRONG_PASSWORD],
          data: {}
        };
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }

      if (password !== confirmedPassword) {
        const result = {
          messages: [messages.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
          data: {}
        };
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
      updateData.password = password;
    }

    if (req.file) updateData.avatar = req.file.path;
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (birthday) updateData.birthday = birthday;
    if (gender) updateData.gender = gender;

    await UserService.updateUser(updateData);

    const result = {
      messages: [messages.ResponseMessages.SUCCESS],
      data: {
        meta: {},
        entries: [req.body]
      }
    };

    res.status(HttpStatus.OK).json(result);
  } catch (e) {
    logger.error('UserController::update::error', e);
    return next(e);
  }
};

const check = async (req, res, next) => {
  logger.info('UserController::check::called');

  try {
    const { error } = Joi.validate(req.body, CheckValidationSchema);
    if (error) {
      const messages = error.details.map(detail => {
        return detail.message;
      });
      const result = {
        messages: messages
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    const user = await UserService.findByEmail(req.body.email);

    if (!user) {
      const result = {
        messages: [messages.ResponseMessages.SUCCESS],
        data: {}
      };
      return res.status(HttpStatus.OK).json(result);
    }
    const result = {
      messages: [messages.ResponseMessages.User.Register.EMAIL_DUPLICATED],
    };
    return res.status(HttpStatus.BAD_REQUEST).json(result);
  } catch (e) {
    logger.error('UserController::check:error', e);
    return next(e);
  }
};

const getLoggedInInfo = async (req, res, next) => {
  logger.info('UserController::getLoggedInInfo::called');
  try {
    const { _id, name, email, phone, birthday, gender, avatar } = req.user;
    const userInfoResponse = {
      _id,
      name,
      email,
      phone,
      birthday,
      gender,
      avatar
    };
    const result = {
      messages: [messages.ResponseMessages.SUCCESS],
      data: {
        meta: {},
        entries: [userInfoResponse]
      }
    };
    return res.status(HttpStatus.OK).json(result);
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
