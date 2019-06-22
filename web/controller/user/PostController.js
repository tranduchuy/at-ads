var SaleModel = require('../../models/SaleModel');
var BuyModel = require('../../models/BuyModel');
var PostModel = require('../../models/PostModel');
var _ = require('lodash');
var UrlParamModel = require('../../models/UrlParamModel');

var urlSlug = require('url-slug');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const {get, post, del, put} = require('../../utils/Request');
const CDP_APIS = require('../../config/cdp-url-api.constant');
const HTTP_CODE = require('../../config/http-code');
const EU = require('express-useragent');
const AdStatModel = require('../../models/ad-stat-history');

//service
const RabbitMQService = require('../../services/RabbitMqService');

var PostController = {
  child: async function (req, res, next) {
    logger.info('TransactionController::childList is called');
    try {
      
      const childId = '?childId=' + req.params.id;
      let child = null;
      
      get(CDP_APIS.RELATION_SHIP.CHILD_DETAIL + childId, req.user.token)
        .then(async (r) => {
          if (r.status != 1) {
            return res.json({
              status: HTTP_CODE.ERROR,
              data: {},
              message: 'relation invalid'
            });
          }
          else {
            var page = req.query.page;
            var limit = req.query.limit;
            var postType = req.query.postType;
            var toDate = req.query.toDate;
            var fromDate = req.query.fromDate;
            
            if (!page || page < 1) {
              page = 1;
            }
            
            if (!limit || limit < 0) {
              limit = global.PAGE_SIZE;
            }
            
            var query = {user: req.params.id, status: {$ne: global.STATUS.DELETE}};
            
            
            if (postType == global.POST_TYPE_SALE || postType == global.POST_TYPE_BUY) {
              query.postType = postType;
            }
            
            if (toDate && fromDate) {
              query.date = {
                $gt: fromDate,
                $lt: toDate
              };
            }
            
            let posts = await PostModel.find(query).sort({date: -1}).skip((page - 1) * limit).limit(limit);
            
            let results = await Promise.all(posts.map(async post => {
              
              
              if (post.postType == global.POST_TYPE_SALE) {
                
                let sale = await SaleModel.findOne({_id: post.contentId});
                
                return {
                  
                  title: sale.title,
                  formality: sale.formality,
                  type: sale.type,
                  city: sale.city,
                  district: sale.district,
                  ward: sale.ward,
                  street: sale.street,
                  project: sale.project,
                  area: sale.area,
                  price: sale.price,
                  unit: sale.unit,
                  address: sale.address,
                  keywordList: sale.keywordList,
                  description: sale.description,
                  streetWidth: sale.streetWidth,
                  frontSize: sale.frontSize,
                  direction: sale.direction,
                  balconyDirection: sale.balconyDirection,
                  floorCount: sale.floorCount,
                  bedroomCount: sale.bedroomCount,
                  toiletCount: sale.toiletCount,
                  furniture: sale.furniture,
                  images: sale.images,
                  contactName: sale.contactName,
                  contactAddress: sale.contactAddress,
                  contactPhone: sale.contactPhone,
                  contactMobile: sale.contactMobile,
                  contactEmail: sale.contactEmail,
                  date: sale.date,
                  
                  id: post._id,
                  url: post.url,
                  to: post.to,
                  from: post.from,
                  priority: post.priority,
                  postType: post.postType,
                  status: post.status,
                  paymentStatus: post.paymentStatus,
                  refresh: post.refresh
                };
              } else {
                
                let buy = await BuyModel.findOne({_id: post.contentId});
                
                
                return {
                  
                  title: buy.title,
                  description: buy.description,
                  keywordList: buy.keywordList,
                  formality: buy.formality,
                  type: buy.type,
                  city: buy.city,
                  district: buy.district,
                  ward: buy.ward,
                  street: buy.street,
                  project: buy.project,
                  area: buy.area,
                  price: buy.price,
                  unit: buy.unit,
                  address: buy.address,
                  images: buy.images,
                  contactName: buy.contactName,
                  contactAddress: buy.contactAddress,
                  contactPhone: buy.contactPhone,
                  contactMobile: buy.contactMobile,
                  contactEmail: buy.contactEmail,
                  receiveMail: buy.receiveMail,
                  date: buy.date,
                  
                  id: post._id,
                  url: post.url,
                  to: post.to,
                  from: post.from,
                  priority: post.priority,
                  postType: post.postType,
                  status: post.status,
                  paymentStatus: post.paymentStatus,
                  refresh: post.refresh
                };
              }
            }));
            
            let count = await PostModel.count(query);
            
            return res.json({
              status: 1,
              data: {
                items: results,
                page: page,
                total: _.ceil(count / limit)
              },
              message: 'request success '
            });
          }
        });
    } catch
      (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  }
  ,
  
  topCity: async function (req, res, next) {
    try {
      
      var agg = [
        {
          $group: {
            _id: '$city',
            cityId: {$first: '$city'},
            count: {$sum: 1}
          }
        }, {$project: {_id: 0, cityId: 1, count: 1}}
      ];
      
      let cities = await SaleModel.aggregate(agg).sort({count: -1});
      
      let results = await Promise.all(cities.map(async city => {
          
          var query = {
            postType: global.POST_TYPE_SALE,
            
            formality: undefined,
            type: undefined,
            city: city.cityId,
            district: undefined,
            ward: undefined,
            street: undefined,
            project: undefined,
            balconyDirection: undefined,
            bedroomCount: undefined,
            area: undefined,
            price: undefined,
          }
          
          var url = await UrlParamModel.findOne(query);
          return {
            city: city.cityId,
            count: city.count,
            url: url ? url.param : 'not found'
          }
          
        }
      ));
      return res.json({
        status: 1,
        data: results,
        message: 'success'
      });
    } catch
      (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
    
  },
  
  latest: async function (req, res, next) {
    try {
      var query = {
        status: global.STATUS.ACTIVE,
        postType: {'$in': [global.POST_TYPE_BUY, global.POST_TYPE_SALE]}
      };
      
      let posts = await PostModel.find(query).sort({date: -1}).limit(10);
      let results = await Promise.all(posts.map(async post => {
          if (post.postType == global.POST_TYPE_SALE) {
            let sale = await SaleModel.findOne({_id: post.contentId});
            let keys;
            if (!sale.keywordList) {
              keys = [];
            } else {
              keys = await Promise.all(sale.keywordList.map(async key => {
                  
                  return {
                    keyword: key,
                    slug: urlSlug(key)
                  }
                }
              ));
            }
            
            return await
              // {sale, post};
              {
                title: sale.title,
                formality: sale.formality,
                type: sale.type,
                city: sale.city,
                district: sale.district,
                ward: sale.ward,
                street: sale.street,
                project: sale.project,
                areaData: sale.areaData,
                area: sale.area,
                priceData: sale.priceData,
                price: sale.price,
                unit: sale.unit,
                address: sale.address,
                keywordList: keys,
                description: sale.description,
                streetWidth: sale.streetWidth,
                frontSize: sale.frontSize,
                direction: sale.direction,
                balconyDirection: sale.balconyDirection,
                floorCount: sale.floorCount,
                bedroomCount: sale.bedroomCount,
                toiletCount: sale.toiletCount,
                furniture: sale.furniture,
                images: sale.images,
                contactName: sale.contactName,
                contactAddress: sale.contactAddress,
                contactPhone: sale.contactPhone,
                contactMobile: sale.contactMobile,
                contactEmail: sale.contactEmail,
                date: sale.date,
                
                id: post._id,
                url: post.url,
                to: post.to,
                from: post.from,
                priority: post.priority,
                postType: post.postType,
                status: post.status,
                paymentStatus: post.paymentStatus,
                refresh: post.refresh
              };
          } else {
            let buy = await BuyModel.findOne({_id: post.contentId});
            let keys;
            if (!buy.keywordList) {
              keys = [];
            } else {
              keys = await Promise.all(buy.keywordList.map(async key => {
                  return {
                    keyword: key,
                    slug: urlSlug(key)
                  }
                }
              ));
            }
            
            return await {
              title: buy.title,
              description: buy.description,
              keywordList: keys,
              formality: buy.formality,
              type: buy.type,
              city: buy.city,
              district: buy.district,
              ward: buy.ward,
              street: buy.street,
              project: buy.project,
              area: buy.area,
              price: buy.price,
              unit: buy.unit,
              address: buy.address,
              images: buy.images,
              contactName: buy.contactName,
              contactAddress: buy.contactAddress,
              contactPhone: buy.contactPhone,
              contactMobile: buy.contactMobile,
              contactEmail: buy.contactEmail,
              receiveMail: buy.receiveMail,
              date: buy.date,
              
              id: post._id,
              url: post.url,
              to: post.to,
              from: post.from,
              priority: post.priority,
              postType: post.postType,
              status: post.status,
              paymentStatus: post.paymentStatus,
              refresh: post.refresh
            };
          }
        }
      ));
      
      return res.json({
        status: 1,
        data: results,
        message: 'request success '
      });
    } catch
      (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  detail: async function (req, res, next) {
    let id = req.params.id;
    
    try {
      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id null error'
        });
      }
      
      let post = await PostModel.findOne({_id: id});
      if (!post) {
        return res.json({
          status: 0,
          data: {},
          message: 'post not exist'
        });
      }
      
      let model = post.postType == global.POST_TYPE_SALE ? SaleModel : BuyModel;
      let content = await model.findOne({_id: post.contentId});
      if (!content) {
        return res.json({
          status: 0,
          data: {},
          message: 'data not exist'
        });
      }
      
      if (post.postType == global.POST_TYPE_SALE) {
        let keys;
        if (!content.keywordList) {
          keys = [];
        } else {
          keys = await Promise.all(content.keywordList.map(async key => {
              return {
                keyword: key,
                slug: urlSlug(key)
              }
            }
          ));
        }
        
        return res.json({
          status: 1,
          data: {
            title: content.title,
            formality: content.formality,
            type: content.type,
            city: content.city,
            district: content.district,
            ward: content.ward,
            street: content.street,
            project: content.project,
            area: content.area,
            areaData: content.areaData,
            price: content.price,
            priceData: content.priceData,
            unit: content.unit,
            address: content.address,
            keywordList: keys,
            description: content.description,
            streetWidth: content.streetWidth,
            frontSize: content.frontSize,
            direction: content.direction,
            balconyDirection: content.balconyDirection,
            floorCount: content.floorCount,
            bedroomCount: content.bedroomCount,
            toiletCount: content.toiletCount,
            furniture: content.furniture,
            images: content.images,
            contactName: content.contactName,
            contactAddress: content.contactAddress,
            contactPhone: content.contactPhone,
            contactMobile: content.contactMobile,
            contactEmail: content.contactEmail,
            date: content.date,
            
            id: post._id,
            url: post.url,
            to: post.to,
            from: post.from,
            priority: post.priority,
            postType: post.postType,
            status: post.status,
            paymentStatus: post.paymentStatus,
            
            cpv: content.cpv,
            paidForm: content.paidForm,
            budgetPerDay: content.budgetPerDay,
            
            refresh: post.refresh
          },
          message: 'request success'
        });
      } else {
        let keys;
        if (!content.keywordList) {
          keys = [];
        } else {
          keys = await Promise.all(content.keywordList.map(async key => {
              return {
                keyword: key,
                slug: urlSlug(key)
              }
            }
          ));
        }
        
        return res.json({
          status: 1,
          data: {
            
            title: content.title,
            description: content.description,
            keywordList: keys,
            formality: content.formality,
            type: content.type,
            city: content.city,
            district: content.district,
            ward: content.ward,
            street: content.street,
            project: content.project,
            area: content.area,
            price: content.price,
            unit: content.unit,
            address: content.address,
            images: content.images,
            contactName: content.contactName,
            contactAddress: content.contactAddress,
            contactPhone: content.contactPhone,
            contactMobile: content.contactMobile,
            contactEmail: content.contactEmail,
            receiveMail: content.receiveMail,
            date: content.date,
            
            id: post._id,
            url: post.url,
            to: post.to,
            from: post.from,
            priority: post.priority,
            postType: post.postType,
            status: post.status,
            paymentStatus: post.paymentStatus,
            refresh: post.refresh
          },
          message: 'request success'
        });
      }
    } catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  list: async (req, res, next) => {
    let {
      page,
      priority,
      formality,
      postType,
      toDate,
      fromDate,
      status,
      id
    } = req.query;
    
    try {
      if (!postType || (postType != global.POST_TYPE_SALE && postType != global.POST_TYPE_BUY)) {
        return res.json({
          status: 0,
          data: {},
          message: 'postType : ' + postType + ' invalid'
        });
      }
      
      if (!page || page < 1) {
        page = 1;
      }
      
      const query = {
        user: req.user.id.toString(),
        status: {$ne: global.STATUS.DELETE}
      };
      
      if (toDate && fromDate) {
        query.date = {
          $gt: fromDate,
          $lt: toDate
        };
      }
      
      if (id) {
        query._id = id;
      }
      
      if (priority !== undefined) {
        query.priority = priority;
      }
      
      if (postType) {
        query.postType = postType;
      }
      
      if (formality) {
        query.formality = formality;
      }
      
      if (status !== undefined) {
        query.status = status;
      }
      
      console.log('query: ', JSON.stringify(query));
      
      let posts = await PostModel.find(query)
        .sort({date: -1})
        .skip((page - 1) * global.PAGE_SIZE)
        .limit(global.PAGE_SIZE)
        .lean();
      
      let results = await Promise.all(posts.map(async post => {
        if (post.postType === global.POST_TYPE_SALE) {
          let sale = await SaleModel.findOne({_id: post.contentId});
          return {
            title: sale.title,
            formality: sale.formality,
            type: sale.type,
            city: sale.city,
            district: sale.district,
            ward: sale.ward,
            street: sale.street,
            project: sale.project,
            area: sale.area,
            price: sale.price,
            unit: sale.unit,
            address: sale.address,
            keywordList: sale.keywordList,
            description: sale.description,
            streetWidth: sale.streetWidth,
            frontSize: sale.frontSize,
            direction: sale.direction,
            balconyDirection: sale.balconyDirection,
            floorCount: sale.floorCount,
            bedroomCount: sale.bedroomCount,
            toiletCount: sale.toiletCount,
            furniture: sale.furniture,
            images: sale.images,
            contactName: sale.contactName,
            contactAddress: sale.contactAddress,
            contactPhone: sale.contactPhone,
            contactMobile: sale.contactMobile,
            contactEmail: sale.contactEmail,
            date: sale.date,
  
            cpv: sale.cpv,
            paidForm: sale.paidForm,
            budgetPerDay: sale.budgetPerDay,
            adStatus: sale.adStatus,
            
            id: post._id,
            url: post.url,
            to: post.to,
            from: post.from,
            priority: post.priority,
            postType: post.postType,
            status: post.status,
            paymentStatus: post.paymentStatus,
            
            refresh: post.refresh,
            viewCount: await AdStatModel.countDocuments({type: global.AD_STAT_VIEW, sale: post.contentId})
          }
            ;
        } else {
          let buy = await BuyModel.findOne({_id: post.contentId});
          return {
            title: buy.title,
            description: buy.description,
            keywordList: buy.keywordList,
            formality: buy.formality,
            type: buy.type,
            city: buy.city,
            district: buy.district,
            ward: buy.ward,
            street: buy.street,
            project: buy.project,
            area: buy.area,
            price: buy.price,
            unit: buy.unit,
            address: buy.address,
            images: buy.images,
            contactName: buy.contactName,
            contactAddress: buy.contactAddress,
            contactPhone: buy.contactPhone,
            contactMobile: buy.contactMobile,
            contactEmail: buy.contactEmail,
            receiveMail: buy.receiveMail,
            date: buy.date,
            
            id: post._id,
            url: post.url,
            to: post.to,
            from: post.from,
            priority: post.priority,
            postType: post.postType,
            status: post.status,
            paymentStatus: post.paymentStatus,
            refresh: post.refresh
          };
        }
      }));
      
      let count = await PostModel.countDocuments(query);
      
      return res.json({
        status: 1,
        data: {
          items: results,
          page: page,
          total: _.ceil(count / global.PAGE_SIZE)
        },
        message: 'request success '
      });
      
    } catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  },
  
  clickPostSale: async (req, res, next) => {
  
    let id = req.body.id ? req.body.id : null;
    
    logger.info(`PostController::clickPostSale id ${id}`);
    
    if (!id || id.length == 0) {
      return next(new Error('Invalid id'));
    }
  
    RabbitMQService.updateAdRank([id], global.AD_STAT_CLICK);
  
    const agentObj = EU.parse(req.get('User-Agent'));
    const logData = {
      utmCampaign: req.query.utmCampaign || '',
      utmSource: req.query.utmSource || '',
      utmMedium: req.query.utmMedium || '',
      referrer: req.query.referrer || '',
      browser: agentObj.browser,
      version: agentObj.version,
      device: agentObj.platform,
      os: agentObj.os
    };
    
    RabbitMQService.insertAdStatHistory([id],logData, global.AD_STAT_CLICK);
    
  
    return res.json({
      status: HTTP_CODE.SUCCESS,
      data: {},
      message: 'SUCCESS'
    });
    
  }
};

module.exports = PostController;
