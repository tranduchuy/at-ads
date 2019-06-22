const ChildModel = require('../../models/ChildModel');
const AccountModel = require('../../models/AccountModel');
const HTTP_CODE = require('../../config/http-code');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const NotifyController = require('./NotifyController');
const NotifyContent = require('../../config/notify-content');
const Socket = require('../../utils/Socket');
const SocketEvents = require('../../config/socket-event');
const NotifyTypes = require('../../config/notify-type');
const ImageService = require('../../services/ImageService');
const {get, post, put, del} = require('../../utils/Request');
const CDP_APIS = require('../../config/cdp-url-api.constant');
const Mailer = require('../../utils/Mailer');
const randomstring = require('randomstring');
const Joi = require('@hapi/joi');
const {RegisterValidationSchema} = require('../../validation-schemas/user/register.schema');

const UserConstant = require('../../constants/user.constant');
const {Status} = require('../../constants/status');
const {LoginValidationSchema} = require('../../validation-schemas/user/login.schema');
const {ResendConfirm} = require('../../validation-schemas/user/resend-confirm-email.schema');
const {ResetPasswordValidationSchema} = require('../../validation-schemas/user/reset-password.schema');
const {ForgetPasswordValidationSchema} = require('../../validation-schemas/user/forget-password.schema');
const {LoginGoogleValidationSchema} = require('../../validation-schemas/user/login-google.schema');
const HttpStatus = require("http-status-codes");
const UserService = require('../../services/UserService');
const UserModel = require('../../models/UserModel');

const {General}  = require ('../../constants/generals');
const UserTypes = General.UserTypes;
const UserRoles = General.UserRoles;

const RegisterByTypes = General.RegisterByTypes;
const messages_1 = require("../../constants/messages");
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
        messages: [messages_1.ResponseMessages.User.Login.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }
    if (user.registerBy !== RegisterByTypes.NORMAL) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.ForgetPassword.INVALID_REGISTER_TYPE],
        data: {}
      };
      return res.json(result);
    }
    await UserService.generateForgetPasswordToken(user);
    await Mailer.sendResetPassword(user.email, user.name, user.passwordReminderToken);
    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.ForgetPassword.FORGET_PASSWORD_SUCCESS],
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
      return  res.json(result);
    }
    const { token, password, confirmedPassword } = request.body;
    if (password !== confirmedPassword) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return  res.json(result);
    }
    const user = await UserService.findUserByPasswordReminderToken(token);
    if (!user) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }
    if (UserService.isExpiredTokenResetPassword(user.passwordReminderExpire)) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.ResetPassword.EXPIRED_TOKEN],
        data: {}
      };
      return res.json(result);
    }
    await UserService.resetPassword(password, user);
    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.ResetPassword.RESET_PASSWORD_SUCCESS],
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
    let account = await AccountModel.findOne({owner: user._id});
    
    if (!account) {
      account = new AccountModel({owner: user._id});
      account = await account.save();
    }
    
    const accountInfo = {
      main: account.main,
      promo: account.promo
    };
    
    if (user.type === global.USER_TYPE_COMPANY) {
      let creditTransferred = 0;
      const children = await ChildModel.find({companyId: user._id});
      
      if (children && children.length > 0) {
        children.forEach(child => {
          creditTransferred += (child.credit - child.creditUsed);
        });
      }
      
      accountInfo.creditTransferred = creditTransferred;
    }
    
    if (user.type === global.USER_TYPE_PERSONAL) {
      const child = await ChildModel.find({personalId: user._id, status: global.STATUS.CHILD_ACCEPTED});
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

const childDetail = async (req, res, next) => {
  logger.info('UserController::childDetail is called with child id', req.params.id);
  try {
    const childId = req.params.id;
    const url = `${CDP_APIS.RELATION_SHIP.CHILD_DETAIL}?childId=${childId}`;
    get(url, req.user.token)
      .then(r => {
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: r.data.entries[0] || {},
          message: 'Success'
        })
      })
      .catch(e => {
        logger.error('UserController::childDetail::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::childDetail::error', e);
    return next(e);
  }
};

const registerChild = async (req, res, next) => {
  logger.info('UserController::registerChild is called');
  
  try {
    const {
      username, email, password, phone, name, confirmedPassword,
      birthday, gender, city, district, ward, type
    } = req.body;
    
    const postData = {
      username, email, password, phone, name, confirmedPassword,
      birthday, gender, city, district, ward, type
    };
    
    post(CDP_APIS.RELATION_SHIP.ADD_NEW_CHILD, postData, req.user.token)
      .then(async r => {
        const newRelation = r.data.entries[0];
        // create notify
        const notifyParam = {
          fromUserId: newRelation.parentId,
          toUserId: newRelation.childId,
          title: NotifyContent.RequestChild.Title,
          content: NotifyContent.RequestChild.Content,
          type: NotifyTypes.PARENT_CHILD.REQUEST,
          params: {
            requestId: newRelation.id
          }
        };
        
        await NotifyController.createNotify(notifyParam);
        
        // send Socket
        const socketContents = {...notifyParam, toUserIds: [newRelation.childId]};
        delete socketContents.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, socketContents);
        logger.info(`UserController::registerChild::success. relation id ${newRelation.id}`);
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: newRelation,
          message: 'Success'
        });
      })
      .catch(e => {
        logger.error('UserController::registerChild::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::registerChild::error', e);
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
        messages: [messages_1.ResponseMessages.User.Confirm.INVALID_TOKEN],
        data: {}
      };
      return res.json(result);
    }
    user.status = Status.ACTIVE;
    user.tokenEmailConfirm = '';
    await user.save();
    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.Confirm.CONFIRM_SUCCESS],
      data: {
        meta: {},
        entries: []
      }
    };
    return res.json(result);
  }
  catch (e) {
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
        messages: [messages_1.ResponseMessages.User.Register.EMAIL_DUPLICATED],
        data: {}
      };
      return res.json(result);
    }
    const duplicatedPhones = await UserModel.find({ phone: phone });
    if (duplicatedPhones.length !== 0) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages_1.ResponseMessages.User.Register.PHONE_DUPLICATED],
        data: {}
      };
      return res.json(result);
    }
    if (password !== confirmedPassword) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages_1.ResponseMessages.User.Register.PASSWORD_DONT_MATCH],
        data: {}
      };
      return res.json(result);
    }
    const duplicatedUsers = await UserModel.find({ email: email });
    if (duplicatedUsers.length !== 0) {
      const result = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        messages: [messages_1.ResponseMessages.User.Register.EMAIL_DUPLICATED],
        data: {}
      };
      return res.json(result);
    }
    const otpCode = UserService.generateOTPCode();
    const newUserData = {
      email,
      name,
      password,
      type: UserTypes.TYPE_CUSTOMER,
      role: null,
      phone: phone,
      gender,
      city: city || null,
      district: district || null,
      ward: ward || null,
      registerBy: RegisterByTypes.NORMAL,
      address,
      otpCode
    };
    const newUser = await UserService.createUser(newUserData);
    if (request.user && [UserRoles.USER_ROLE_MASTER, UserRoles.USER_ROLE_ADMIN].some(request.user.role)) {
      newUser.status = Status.ACTIVE;
      newUser.tokenEmailConfirm = '';
      await newUser.save();
    }
    else {
      // Send email
       Mailer.sendConfirmEmail(email, name, newUser.tokenEmailConfirm);
      // this.smsService.sendSMS([phone], `Mã xác thục tài khoản: ${otpCode}`, '');
    }
    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.Register.REGISTER_SUCCESS],
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

const creditShare = async (req, res, next) => {
  logger.info('UserController::creditShare is called');
  try {
    let {amount, note} = req.body;
    const id = req.params.id;
    
    post(CDP_APIS.USER.SHARE_CREDIT, {amount, childId: parseInt(id)}, req.user.token)
      .then(response => {
        const data = response.data.entries[0];
        // notify
        const notifyParams = {
          fromUserId: req.user.id,
          toUserId: id,
          title: NotifyContent.CreditShare.Title,
          content: NotifyContent.CreditShare.Content,
          type: NotifyTypes.CHANGE_TRANSACTION,
          params: {
            before: data.childBalance.before,
            after: data.childBalance.after
          }
        };
        NotifyController.createNotify(notifyParams);
        
        // send Socket
        notifyParams.toUserIds = [notifyParams.toUserId];
        delete notifyParams.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
        
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: {},
          message: 'Request success'
        });
      })
      .catch(e => {
        logger.error('UserController::creditShare::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::creditShare::error', e);
    return next(e);
  }
};

const childRemove = async (req, res, next) => {
  logger.info('UserController::childRemove is called');
  try {
    const id = req.params.id;
    const url = `${CDP_APIS.RELATION_SHIP.REMOVE_CHILD}?childId=${id}`;
    del(url, req.user.token)
      .then(response => {
        const relation = response.data.entries[0];
        // notify
        const notifyParams = {
          fromUserId: req.user.id,
          toUserId: parseInt(id),
          title: NotifyContent.ReturnMoneyToCompany.Title,
          content: NotifyContent.ReturnMoneyToCompany.Content,
          type: NotifyTypes.PARENT_CHILD.REMOVE,
          params: {
            requestId: relation.id
          }
        };
        NotifyController.createNotify(notifyParams);
        
        // send socket
        notifyParams.toUserIds = [notifyParams.toUserId];
        delete notifyParams.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
        logger.info('UserController::childRemove::success');
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: relation,
          message: 'Success'
        });
      })
      .catch(err => {
        logger.error('UserController::childRemove::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::childRemove::error', e);
    return next(e);
  }
};

const childResponse = async (req, res, next) => {
  logger.info('UserController::childResponse is called');
  try {
    const postData = {
      relationId: parseInt(req.params.id),
      status: req.body.status
    };
    
    post(CDP_APIS.RELATION_SHIP.CHILD_REPLY_REQUEST, postData, req.user.token)
      .then(async r => {
        const relation = r.data.entries[0];
        const {Title, Content} = req.body.status === global.STATUS.CHILD_ACCEPTED ?
          NotifyContent.ResponseChildStatusAccepted :
          NotifyContent.ResponseChildStatusRejected;
        
        const notifyParam = {
          fromUserId: relation.childId,
          toUserId: relation.parentId,
          title: Title,
          content: Content,
          type: NotifyTypes.PARENT_CHILD.RESPONSE,
          params: {
            status: relation.status// show status of child's response
          }
        };
        await NotifyController.createNotify(notifyParam);
        
        const socketContents = {...notifyParam, toUserIds: [relation.parentId]};
        delete socketContents.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, socketContents);
        logger.info(`UserController::childResponse::success. relation id ${relation.id}, status ${relation.status}`);
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: relation,
          message: 'request success !'
        });
      })
      .catch(e => {
        logger.error('UserController::childResponse::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::childResponse::error', e);
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
      }
      else {
        const newUser = {
          name,
          email,
          googleId
        };
        user = await UserService.createUserByGoogle(newUser);
        const result = {
          status: HttpStatus.CREATED,
          messages: [messages_1.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
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
        messages: [messages_1.ResponseMessages.User.Login.NEW_USER_BY_GOOGLE],
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
      messages: [messages_1.ResponseMessages.User.Login.LOGIN_SUCCESS],
      data: {
        meta: {
          token
        },
        entries: [userInfoResponse]
      }
    };
    return res.json(result);
  }
  catch (e) {
    logger.error('UserController::loginByGoogle::error', e);
    return next(e);
  }
};

const login = async (request, res, next) => {
  logger.info('UserController::login is called');
  try {
    const {error} = Joi.validate(request.body, LoginValidationSchema);
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

    const {email, password} = request.body;
    const emailOrPhone = email;
    const user = await UserService.findByEmailOrPhone(emailOrPhone, emailOrPhone);

    if (!user) {
      const result = {
        status: HttpStatus.NOT_FOUND,
        messages: [messages_1.ResponseMessages.User.USER_NOT_FOUND],
        data: {}
      };
      return res.json(result);
    }

    console.log(JSON.stringify(user));

    if (!UserService.isValidHashPassword(user.passwordHash, password)) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.Login.WRONG_PASSWORD],
        data: {}
      };
      return res.json(result);
    }

    if (user.status !== Status.ACTIVE) {
      const result = {
        status: HttpStatus.BAD_REQUEST,
        messages: [messages_1.ResponseMessages.User.Login.INACTIVE_USER],
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
    const token = UserService.generateToken({_id: user._id});

    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.Login.LOGIN_SUCCESS],
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
        messages: [messages_1.ResponseMessages.User.USER_NOT_FOUND]
      };
      return res.json(result);
    }
    const tokenEmailConfirm = randomstring.generate({
      length: UserConstant.tokenConfirmEmailLength,
      charset: 'alphabetic'
    });
    user.tokenEmailConfirm = tokenEmailConfirm;
    await user.save();
    Mailer.sendConfirmEmail(user.email, user.name, tokenEmailConfirm);
    const result = {
      status: HttpStatus.OK,
      messages: [messages_1.ResponseMessages.User.Confirm.CONFIRM_SUCCESS]
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
    let {password, name, phone, birthday, gender, city, district, ward, type, avatar, oldPassword, confirmedPassword} = req.body;
    const postData = {password, name, phone, birthday, gender, city, district, ward, type, avatar, oldPassword, confirmedPassword};
    
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

const childRequest = async (req, res, next) => {
  logger.info(`UserController::childRequest::called`);
  
  try {
    let id = req.params.id;
    const postData = {
      userId: parseInt(id)
    };
    logger.info(`UserController::childRequest call CDP api with user id: ${id}`);
    
    post(CDP_APIS.RELATION_SHIP.ADD_REGISTERED_CHILD, postData, req.user.token)
      .then(async r => {
        
        const notifyParam = {
          fromUserId: req.user.id,
          toUserId: parseInt(id),
          title: NotifyContent.RequestChild.Title,
          content: NotifyContent.RequestChild.Content,
          type: NotifyTypes.PARENT_CHILD.REQUEST,
          params: {
            requestId: r.data.entries[0].id
          }
        };
        await NotifyController.createNotify(notifyParam);
        
        const socketContents = {...notifyParam, toUserIds: [parseInt(id)]};
        delete socketContents.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, socketContents);
        logger.info('UserController::childRequest::success', JSON.stringify(r.data.entries[0]));
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: r.data.entries[0]
        })
      })
      .catch(e => {
        logger.error('UserController::childRequest::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::childRequest::error', e);
    return next(e);
  }
};

const requestList = async (req, res, next) => {
  logger.info('UserController::requestList::called');
  
  try {
    get(CDP_APIS.RELATION_SHIP.REQUEST_LIST, req.user.token)
      .then((r) => {
        const results = r.data.entries.map(r => {
          r.parent = r.parentInfo;
          delete r.parentInfo;
          return r;
        });
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: results
        })
      })
      .catch(err => {
        logger.error('UserController::requestList::error', err);
        
        return next(err);
      });
  } catch (e) {
    logger.error('UserController::requestList::error', err);
    
    return next(e);
  }
};

const childList = async (req, res, next) => {
  logger.info('UserController::childList::called');
  
  try {
    get(CDP_APIS.RELATION_SHIP.LIST_CHILD, req.user.token)
      .then((r) => {
        const childs = r.data.entries.map(child => {
          const accountInfo = {
            credit: child.credit,
            creditUsed: child.usedCredit
          };
          
          return {
            id: child.childId,
            username: child.childInfo.username,
            email: child.childInfo.email,
            name: child.childInfo.name,
            status: child.status,
            balance: accountInfo
          };
        });
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: childs,
          message: 'request success !'
        });
      })
      .catch((err) => {
        return next(err)
      });
    
  } catch (e) {
    logger.error('UserController::childList::error', e);
    return next(e);
  }
};

const findUserByEmail = async (req, res, next) => {
  logger.info('UserController::findUserByEmail::called');
  
  try {
    const email = req.params.email;
    
    get(`${CDP_APIS.USER.FIND_USER_BY_EMAIL}?email=${email}`, req.user.token)
      .then(r => {
        return res.json({
          status: 1,
          data: r.data.entries[0],
          message: 'request success'
        });
      })
      .catch(err => {
        return next(err);
      });
  } catch (e) {
    logger.error('UserController::findUserByEmail::error', e);
    return next(e);
  }
};

const highlight = async (req, res, next) => {
  logger.info('UserController::highlight::called');
  
  try {
    get(CDP_APIS.USER.HIGHLIGHT)
      .then((body) => {
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: 'Success',
          data: body.data.entries
        })
      })
      .catch(err => {
        return next(err);
      });
  } catch (e) {
    return res.json({
      status: 0,
      data: {},
      message: 'unknown error : ' + e.message
    });
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
  balance,
  childDetail,
  registerChild,
  confirm,
  register,
  forgetPassword,
  getLoggedInInfo,
  resetPassword,
  creditShare,
  childRemove,
  childResponse,
  childRequest,
  requestList,
  childList,
  findUserByEmail,
  highlight,
  check,
  resendConfirm,
  update,
  loginByGoogle
};
