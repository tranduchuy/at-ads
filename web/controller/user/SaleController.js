const SaleModel = require('../../models/SaleModel');
const PostModel = require('../../models/PostModel');
const TagModel = require('../../models/TagModel');
const TokenModel = require('../../models/TokenModel');
const PostPriorityModel = require('../../models/PostPriorityModel');
const UserModel = require('../../models/UserModel');
const TransactionHistoryModel = require('../../models/TransactionHistoryModel');
const UrlParamModel = require('../../models/UrlParamModel');
const urlSlug = require('url-slug');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const NotifyController = require('./NotifyController');
const Socket = require('../../utils/Socket');
const NotifyContent = require('../../config/notify-content');
const NotifyTypes = require('../../config/notify-type');
const SocketEvents = require('../../config/socket-event');
const HTTP_CODE = require('../../config/http-code');
const ImageService = require('../../services/ImageService');
const selector = require("../../config/selector");
const postService = require("../../services/PostService");
const Request = require('../../utils/Request');
const {get, post, put, del} = require('../../utils/Request');
const CDP_APIS = require('../../config/cdp-url-api.constant');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');

const add = async (req, res, next) => {
  const user = req.user;
  const {
    title, formality, type, city, district, ward,
    street, project, area, price, unit, address,
    keywordList, description, streetWidth, frontSize,
    direction, balconyDirection, floorCount, bedroomCount,
    toiletCount, furniture, images, contactName,
    contactAddress, contactPhone, contactMobile,
    contactEmail, priorityId, from, to, captchaToken,
    createdByType, cpv, paidForm, budgetPerDay
  } = req.body;
  
  try {
    if (!priorityId || priorityId.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'priorityId : "' + priorityId + '" is invalid'
      });
    }
    
    var priority = await PostPriorityModel.findOne({_id: priorityId});
    var dateCount = (to - from) / (1000 * 60 * 60 * 24);
    
    if (!priority) {
      return res.json({
        status: 0,
        data: {},
        message: 'priority not found'
      });
    }
    
    if (paidForm == global.PAID_FORM.VIEW && !cpv){
      return res.json({
        status: 0,
        data: {},
        message: 'cpv not null'
      });
    }
  
    if (paidForm == global.PAID_FORM.VIEW && !budgetPerDay){
      return res.json({
        status: 0,
        data: {},
        message: 'budgetPerDay not null'
      });
    }
    
    if (dateCount < priority.minDay) {
      return res.json({
        status: 0,
        data: {},
        message: 'post day count <  min day '
      });
    }
    
    if (!title || title.length < 30 || title.length > 99) {
      return res.json({
        status: 0,
        data: {},
        message: 'title : "' + title + '" is invalid'
      });
    }
    
    if (!formality || formality.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'formality : "' + formality + '" is invalid'
      });
    }
    
    if (!type || type.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'type : "' + type + '" is invalid'
      });
    }
    
    if (!city || city.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'city : "' + city + '" is invalid'
      });
    }
    
    if (!district || district.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'district : "' + district + '" is invalid'
      });
    }
    
    if (!description || description.length < 30) {
      return res.json({
        status: 0,
        data: {},
        message: 'description : "' + description + '" is invalid'
      });
    }
    
    if (!contactMobile || contactMobile.length < 8 || contactMobile.length > 11) {
      return res.json({
        status: 0,
        data: {},
        message: 'contactMobile : "' + contactMobile + '" is invalid'
      });
    }
    
    if (!captchaToken || captchaToken.length == 0) {
      return res.json({
        status: 0,
        data: {},
        message: 'captchaToken : "' + captchaToken + '" is invalid'
      });
    }
    
    
    var sale = new SaleModel();
    var post = new PostModel();
    
    if (req.user) {
      post.user = req.user.id;
    }
    
    // post.paymentStatus = global.STATUS.PAYMENT_UNPAID;
    
    if (createdByType) {
      const duplicateTitle = await SaleModel.findOne({title: req.body.title});
      if (duplicateTitle) {
        return res.json({
          status: 0,
          data: {},
          message: 'Crawler duplicate title'
        });
      }
    }
    
    sale.title = title;
    
    sale.formality = formality;
    sale.type = type;
    sale.city = city;
    sale.district = district;
    sale.ward = ward;
    sale.street = street;
    sale.project = project;
    
    sale.areaData = area;
    sale.priceData = price;
    sale.area = postService.convertValueAreaToID(area);
    sale.price = postService.convertValueSalePriceToID(price, formality);
    
    sale.unit = unit;
    sale.address = address;
    
    sale.keywordList = keywordList;
    
    sale.description = description;
    
    sale.frontSize = frontSize;
    sale.streetWidth = streetWidth;
    sale.direction = direction;
    sale.balconyDirection = balconyDirection;
    sale.floorCount = floorCount;
    sale.bedroomCount = bedroomCount;
    sale.toiletCount = toiletCount;
    sale.furniture = furniture;
    
    sale.images = images;
    sale.contactName = contactName;
    sale.contactAddress = contactAddress;
    sale.contactPhone = contactPhone;
    sale.contactMobile = contactMobile;
    sale.contactEmail = contactEmail;
    
    sale.cpv = cpv;
    sale.adRank = cpv;
    sale.paidForm = paidForm;
    sale.isValidBalance = true;
    sale.budgetPerDay = budgetPerDay;
    if (paidForm == global.PAID_FORM.VIEW)
      sale.adStatus = global.STATUS.PAID_FORM_VIEW_ACTIVE;
    
    ImageService.postConfirmImage(images);
    
    if (createdByType) {
      sale.createdByType = createdByType;
      sale.status = global.STATUS.ACTIVE;
    } else {
      sale.createdByType = global.CREATED_BY.HAND;
    }
    
    sale = await sale.save();
    
    
    post.postType = global.POST_TYPE_SALE;
    post.type = sale.type;
    post.contentId = new ObjectId(sale._id);
    post.priority = priority.priority;
    post.from = from;
    post.to = to;
    post.formality = sale.formality;
    if (createdByType) {
      post.status = global.STATUS.ACTIVE;
    } else {
      post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
    }
    
    var url = urlSlug(title);
    let countDuplicate = await PostModel.countDocuments({url: url});
    if (countDuplicate > 0) url = url + "-" + countDuplicate;
    
    post.url = url;
    
    if (keywordList && keywordList.length > 0) {
      for (var i = 0; i < keywordList.length; i++) {
        var key = keywordList[i];
        
        var slug = urlSlug(key);
        
        if (!slug) {
          continue;
        }
        
        var tag = await TagModel.findOne({status: global.STATUS.ACTIVE, slug: slug});
        
        if (!tag) {
          tag = new TagModel({
            slug: slug,
            keyword: key,
          });
          tag = await tag.save();
        }
        post.tags.push(tag._id);
      }
    }
  
    if (paidForm == global.PAID_FORM.VIEW) { //tra theo view
      post.paymentStatus = global.STATUS.PAYMENT_PAID;
      post = await post.save();
      
      return res.json({
        status: HTTP_CODE.SUCCESS,
        data: post,
        message: 'request  post sale paid form for view success !'
      });
    }
    
    post = await post.save();
    
    if (paidForm == global.PAID_FORM.DAY) { // tra theo ngay
      const postData = {
        saleId: sale._id,
        cost: dateCount * priority.costByDay
      };
      
      Request.post(CDP_APIS.USER.SALE_COST, postData, req.user ? req.user.token : '')
        .then(async r => {
          post.paymentStatus = global.STATUS.PAYMENT_PAID;
          await post.save();
          logger.info(`SaleController::add success call CDP sale cost, note post id ${post._id}`);
          // notify
          const notifyParams = {
            fromUserId: null,
            toUserId: user.id,
            title: NotifyContent.PayPost.Title,
            content: NotifyContent.PayPost.Content,
            type: NotifyTypes.CHANGE_TRANSACTION,
            params: {
              cost: dateCount * priority.costByDay
            }
          };
          NotifyController.createNotify(notifyParams);
          
          // send socket
          notifyParams.toUserIds = [notifyParams.toUserId];
          delete notifyParams.toUserId;
          Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
          logger.info('SaleController::add::success. Create post sale successfully');
          
          return res.json({
            status: HTTP_CODE.SUCCESS,
            data: post,
            message: 'request  post sale paid form for date success !'
          });
        })
        .catch(e => {
          logger.error('SaleController::add::error', e);
          return next(e);
        });
    }
  } catch (e) {
    logger.error('SaleController::add::error', e);
    return next(e);
  }
};

const upNew = async (req, res, next) => {
  logger.info('UserController::upNew::called');
  
  try {
    let id = req.params.id;
    let post = await PostModel.findOne({_id: id});
    
    if (!post || post.postType !== global.POST_TYPE_SALE) {
      return next(new Error('post not exist'));
    }
    
    if (post.user.toString() !== req.user.id.toString()) {
      return next(new Error('Permission denied'));
    }
    
    const priority = await PostPriorityModel.findOne({priority: post.priority});
    let price = 0;
    if (priority) {
      price = priority.costByDay;
    }
    
    const postData = {
      cost: price,
      saleId: post.contentId.toString()
    };
    Request.post(CDP_APIS.USER.UP_NEW, postData, req.user.token)
      .then(async r => {
        logger.info('UserController::upNew call CDP up new successfully', postData);
        post.refresh = Date.now();
        await post.save();
        // notify
        const notifyParams = {
          fromUserId: null,
          toUserId: req.user.id,
          title: NotifyContent.UpNew.Title,
          content: NotifyContent.UpNew.Content,
          type: NotifyTypes.CHANGE_TRANSACTION,
          params: {
            price
          }
        };
        NotifyController.createNotify(notifyParams);
        
        // send socket
        notifyParams.toUserIds = [notifyParams.toUserId];
        delete notifyParams.toUserId;
        Socket.broadcast(SocketEvents.NOTIFY, notifyParams);
        logger.info(`UserController::upNew::success. Purchase up new successfully, post id ${post._id.toString()}, price = ${price}`);
        
        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: {},
          message: 'Success'
        });
      })
      .catch(e => {
        logger.error('UserController::upNew::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('UserController::upNew::error', e);
    return next(e);
  }
};


const SaleController = {
  add,
  
  upNew,
  
  update: async function (req, res, next) {
    try {
      
      //TODO: implement check token user
      // var token = req.user.token;
      // var accessToken = await TokenModel.findOne({token: token});
      
      let id = req.params.id;
      
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid '
        });
      }
      
      
      let post = await PostModel.findOne({_id: id});
      
      if (!post || post.postType != global.POST_TYPE_SALE) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist '
        });
      }
      
      if (post.user != req.user.id) {
        return res.json({
          status: 0,
          data: {},
          message: 'user does not have permission !'
        });
      }
      
      
      var sale = await SaleModel.findOne({_id: post.contentId});
      
      
      if (!sale) {
        return res.json({
          status: 0,
          data: {},
          message: 'sale not exist '
        });
      }
      
      
      var title = req.body.title;
      
      var formality = req.body.formality;
      var type = req.body.type;
      var city = req.body.city;
      var district = req.body.district;
      var ward = req.body.ward;
      var street = req.body.street;
      var project = req.body.project;
      var area = req.body.area;
      var price = req.body.price;
      var unit = req.body.unit;
      var address = req.body.address;
      
      var keywordList = req.body.keywordList;
      
      var description = req.body.description;
      
      var streetWidth = req.body.streetWidth;
      var frontSize = req.body.frontSize;
      var direction = req.body.direction;
      var balconyDirection = req.body.balconyDirection;
      var floorCount = req.body.floorCount;
      var bedroomCount = req.body.bedroomCount;
      var toiletCount = req.body.toiletCount;
      var furniture = req.body.furniture;
      
      var images = req.body.images;
      ImageService.putUpdateImage(sale.images, images);
      
      var contactName = req.body.contactName;
      var contactAddress = req.body.contactAddress;
      var contactPhone = req.body.contactPhone;
      var contactMobile = req.body.contactMobile;
      var contactEmail = req.body.contactEmail;
      
      var priority = req.body.priority;
      
      var status = req.body.status;
      
      var from = req.body.from;
      var to = req.body.to;
      
      var cpv = req.body.cpv;
      var paidForm = req.body.paidForm;
      var budgetPerDay = req.body.budgetPerDay;
      
      if (paidForm && paidForm != sale.paidForm){
        return res.json({
          status: 0,
          data: {},
          message: 'not update paidForm post '
        });
      }
      
      if (title && (sale.title != title)) {
        sale.title = title;
        
        var url = urlSlug(title);
        
        let countDuplicate = await PostModel.countDocuments({url: url});
        if (countDuplicate > 0) url = url + "-" + countDuplicate;
        
        post.url = url;
      }
      
      if (formality) {
        sale.formality = formality;
      }
      if (type) {
        sale.type = type;
      }
      if (city) {
        sale.city = city;
      }
      if (district) {
        sale.district = district;
      }
      if (ward) {
        sale.ward = ward;
      }
      if (street) {
        sale.street = street;
      }
      if (project) {
        sale.project = project;
      }
      if (area) {
        sale.areaData = area;
        sale.area = postService.convertValueAreaToID(area);
      }
      if (price) {
        sale.priceData = price;
        sale.price = postService.convertValueSalePriceToID(price, formality);
      }
      if (unit) {
        sale.unit = unit;
      }
      if (address) {
        sale.address = address;
      }
      
      if (keywordList) {
        sale.keywordList = keywordList;
      }
      
      if (description) {
        sale.description = description;
      }
      
      if (streetWidth) {
        sale.streetWidth = streetWidth;
      }
      if (frontSize) {
        sale.frontSize = frontSize;
      }
      if (direction) {
        sale.direction = direction;
      }
      if (balconyDirection) {
        sale.balconyDirection = balconyDirection;
      }
      if (floorCount) {
        sale.floorCount = floorCount;
      }
      if (bedroomCount) {
        sale.bedroomCount = bedroomCount;
      }
      if (toiletCount) {
        sale.toiletCount = toiletCount;
      }
      if (furniture) {
        sale.furniture = furniture;
      }
      
      if (images) {
        sale.images = images;
      }
      
      if (contactName) {
        sale.contactName = contactName;
      }
      if (contactAddress) {
        sale.contactAddress = contactAddress;
      }
      if (contactPhone) {
        sale.contactPhone = contactPhone;
      }
      if (contactMobile) {
        sale.contactMobile = contactMobile;
      }
      if (contactEmail) {
        sale.contactEmail = contactEmail;
      }
      if (status == global.STATUS.DELETE) {
        sale.status = status;
      }
  
      sale.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
      
      if (sale.paidForm == global.PAID_FORM.VIEW) {
        if (cpv)
          sale.cpv = cpv;
        if (budgetPerDay)
          sale.budgetPerDay = budgetPerDay;
      }
      
      sale = await sale.save();
      
      post.type = sale.type;
      post.priority = sale.priority;
      
      if (from) {
        post.from = from;
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.paymentStatus = global.STATUS.PAYMENT_UNPAID;
        post.refresh = Date.now();
        
      }
      
      if (to) {
        post.to = to;
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.paymentStatus = global.STATUS.PAYMENT_UNPAID;
      }
      
      if (status == global.STATUS.DELETE) {
        post.status = status;
      }
      
      if (priority) {
        post.priority = priority;
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.paymentStatus = global.STATUS.PAYMENT_UNPAID;
      }
      
      if (keywordList && keywordList.length > 0) {
        for (var i = 0; i < keywordList.length; i++) {
          var key = keywordList[i];
          
          var slug = urlSlug(key);
          
          if (!slug) {
            continue;
          }
          
          var tag = await TagModel.findOne({status: global.STATUS.ACTIVE, slug: slug});
          
          if (!tag) {
            tag = new TagModel({
              slug: slug,
              keyword: key,
            });
            tag = await tag.save();
            
          }
          
          post.tags.push(tag._id);
        }
      }
      
      await post.save();
      return res.json({
        status: 1,
        data: sale,
        message: 'update success'
      });
    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  updateAdStatus: async function (req, res, next) {
    try {
      //TODO: implement check token user
      // var token = req.user.token;
      // var accessToken = await TokenModel.findOne({token: token});
      
      let id = req.params.id;
      
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid '
        });
      }
      
      let post = await PostModel.findOne({_id: id});
      
      if (!post || post.postType != global.POST_TYPE_SALE) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist '
        });
      }
      
      if (post.user != req.user.id) {
        return res.json({
          status: 0,
          data: {},
          message: 'user does not have permission !'
        });
      }
      
      var sale = await SaleModel.findOne({_id: post.contentId});
      
      if (!sale) {
        return res.json({
          status: 0,
          data: {},
          message: 'sale not exist '
        });
      }
  
      if (sale.paidForm != global.PAID_FORM.VIEW) {
        return res.json({
          status: 0,
          data: {},
          message: 'paidForm is not view'
        });
      }
      
      var adStatus = req.body.adStatus;
      
      if (adStatus == global.STATUS.PAID_FORM_VIEW_ACTIVE)
        sale.adStatus = global.STATUS.PAID_FORM_VIEW_ACTIVE;
      
      if (adStatus == global.STATUS.PAID_FORM_VIEW_STOP)
        sale.adStatus = global.STATUS.PAID_FORM_VIEW_STOP;
      
      sale = await sale.save();
      
      return res.json({
        status: 1,
        data: sale,
        message: 'update adStatus success'
      });
    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  updateAdStatus: async function (req, res, next) {
    try {
      //TODO: implement check token user
      // var token = req.user.token;
      // var accessToken = await TokenModel.findOne({token: token});
      
      let id = req.params.id;
      
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid '
        });
      }
      
      let post = await PostModel.findOne({_id: id});
      
      if (!post || post.postType != global.POST_TYPE_SALE) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist '
        });
      }
      
      if (post.user != req.user.id) {
        return res.json({
          status: 0,
          data: {},
          message: 'user does not have permission !'
        });
      }
      
      var sale = await SaleModel.findOne({_id: post.contentId});
      
      if (!sale) {
        return res.json({
          status: 0,
          data: {},
          message: 'sale not exist '
        });
      }
  
      if (sale.paidForm != global.PAID_FORM.VIEW) {
        return res.json({
          status: 0,
          data: {},
          message: 'paidForm is not view'
        });
      }
      
      var adStatus = req.body.adStatus;
      
      if (adStatus == global.STATUS.PAID_FORM_VIEW_ACTIVE)
        sale.adStatus = global.STATUS.PAID_FORM_VIEW_ACTIVE;
      
      if (adStatus == global.STATUS.PAID_FORM_VIEW_STOP)
        sale.adStatus = global.STATUS.PAID_FORM_VIEW_STOP;
      
      sale = await sale.save();
      
      return res.json({
        status: 1,
        data: sale,
        message: 'update adStatus success'
      });
    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  updateCPV: async function (req, res, next) {
    try {
      //TODO: implement check token user
      // var token = req.user.token;
      // var accessToken = await TokenModel.findOne({token: token});
      
      let id = req.params.id;
      
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid '
        });
      }
      
      let post = await PostModel.findOne({_id: id});
      
      if (!post || post.postType != global.POST_TYPE_SALE) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist '
        });
      }
      
      if (post.user != req.user.id) {
        return res.json({
          status: 0,
          data: {},
          message: 'user does not have permission !'
        });
      }
      
      var sale = await SaleModel.findOne({_id: post.contentId});
      
      if (!sale) {
        return res.json({
          status: 0,
          data: {},
          message: 'sale not exist '
        });
      }
  
      if (sale.paidForm != global.PAID_FORM.VIEW) {
        return res.json({
          status: 0,
          data: {},
          message: 'paidForm is not view'
        });
      }
      
      var cpv = req.body.cpv;
      
      if (!cpv){
        return res.json({
          status: 0,
          data: {},
          message: 'cpv is not available'
        });
      }
      
      sale.cpv = cpv;
      
      sale = await sale.save();
      
      return res.json({
        status: 1,
        data: sale,
        message: 'update cpv success'
      });
    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  updateBudgetPerDay: async function (req, res, next) {
    try {
      //TODO: implement check token user
      // var token = req.user.token;
      // var accessToken = await TokenModel.findOne({token: token});
      
      let id = req.params.id;
      
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid '
        });
      }
      
      let post = await PostModel.findOne({_id: id});
      
      if (!post || post.postType != global.POST_TYPE_SALE) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist '
        });
      }
      
      if (post.user != req.user.id) {
        return res.json({
          status: 0,
          data: {},
          message: 'user does not have permission !'
        });
      }
      
      var sale = await SaleModel.findOne({_id: post.contentId});
      
      if (!sale) {
        return res.json({
          status: 0,
          data: {},
          message: 'sale not exist '
        });
      }
  
      if (sale.paidForm != global.PAID_FORM.VIEW) {
        return res.json({
          status: 0,
          data: {},
          message: 'paidForm is not view'
        });
      }
      
      var budgetPerDay = req.body.budgetPerDay;
      
      if (!budgetPerDay){
        return res.json({
          status: 0,
          data: {},
          message: 'budgetPerDay is not available'
        });
      }
      
      sale.budgetPerDay = budgetPerDay;
      
      sale = await sale.save();
      
      return res.json({
        status: 1,
        data: sale,
        message: 'update budgetPerDay success'
      });
    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
};

module.exports = SaleController;
