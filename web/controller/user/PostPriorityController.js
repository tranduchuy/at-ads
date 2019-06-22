const PostPriorityModel = require('../../models/PostPriorityModel');
const TokenModel = require('../../models/TokenModel');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const _ = require('lodash');
const HTTP_CODE = require('../../config/http-code');

const add = async (req, res, next) => {
  logger.info('PostPriorityController::add::called');
  try {
    const {name, minDay, costByDay, priority} = req.body;

    if (!name || !minDay || !costByDay || !priority) {
      return res.json({
        status: HTTP_CODE.ERROR,
        data: {
          name: name, minDay: minDay, costByDay: costByDay, priority: priority
        },
        message: 'body data invalid !'
      });
    }

    let postPriority = new PostPriorityModel();
    postPriority.name = name;
    postPriority.minDay = minDay;
    postPriority.costByDay = costByDay;
    postPriority.priority = priority;
    postPriority = await postPriority.save();
    logger.info('PostPriorityController::add::success');

    return res.json({
      status: HTTP_CODE.SUCCESS,
      data: postPriority,
      message: 'request success !'
    });
  } catch (e) {
    logger.error('PostPriorityController::add::error', e);
    return next(e);
  }
};

const PostPriorityController = {

  // detail: async function (req, res, next) {
  //     let id = req.params.id;
  //     try {
  //
  //         if (!id || id.length == 0) {
  //             return res.json({
  //                 status: 0,
  //                 data: {},
  //                 message: 'id null error'
  //             });
  //
  //         }
  //
  //         let news = await NewsModel.findOne({_id: id});
  //
  //         if (!news) {
  //             return res.json({
  //                 status: 0,
  //                 data: {},
  //                 message: 'data not exist'
  //             });
  //         }
  //
  //
  //         return res.json({
  //             status: 1,
  //             data: {
  //                 id: news._id,
  //                 title: news.title,
  //                 content: news.content,
  //                 cate: news.type,
  //                 image: news.image,
  //                 description : news.description,
  //                 date : news.date
  //
  //             },
  //             message: 'request success'
  //         });
  //
  //
  //     }
  //
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  //
  //
  // },
  // catList: async function (req, res, next) {
  //     try {
  //         var cats = await UrlParamModel.find({postType: 4});
  //
  //
  //         let results = cats.map(cat => {
  //
  //             return {text: cat.text, id: cat.type, url: cat.param, extra: cat.extra};
  //
  //         });
  //
  //         return res.json({
  //             status: 1,
  //             data: results,
  //             message: 'success !'
  //         });
  //     }
  //
  //
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  // },
  // update: async function (req, res, next) {
  //
  //
  //     try {
  //
  //         var token = req.headers.accesstoken;
  //
  //         var accessToken = await  TokenModel.findOne({token: token});
  //
  //         if (!accessToken) {
  //             return res.json({
  //                 status: 0,
  //                 data: {},
  //                 message: 'access token invalid'
  //             });
  //         }
  //
  //         let id = req.params.id;
  //
  //         if (!id || id.length == 0) {
  //             return res.json({
  //                 status: 0,
  //                 data: {},
  //                 message: 'id invalid '
  //             });
  //         }
  //
  //
  //         var news = await NewsModel.findOne({_id: id});
  //
  //         if (!news) {
  //             return res.json({
  //                 status: 0,
  //                 data: {},
  //                 message: 'news not exist '
  //             });
  //         }
  //
  //         var title = req.body.title;
  //
  //         var content = req.body.content;
  //         var cate = req.body.cate;
  //         var image = req.body.image;
  //
  //         var status = req.body.status;
  //         var description = req.body.description;
  //
  //         if (title) {
  //             news.title = title;
  //         }
  //         if (content) {
  //             news.content = content;
  //         }
  //         if (cate) {
  //             news.type = cate;
  //         }
  //         if (image) {
  //             news.image = image;
  //         }
  //         if (description) {
  //             news.description = description;
  //         }
  //         if (status != undefined) {
  //             news.status = status;
  //         }
  //         news = await news.save();
  //
  //         let post = await PostModel.findOne({contentId: news._id})
  //
  //         if (title && post) {
  //
  //             let param = await UrlParamModel.findOne({
  //                 postType: global.POST_TYPE_NEWS,
  //
  //                 formality: undefined,
  //                 type: cate,
  //                 city: undefined,
  //                 district: undefined,
  //                 ward: undefined,
  //                 street: undefined,
  //                 project: undefined,
  //                 balconyDirection: undefined,
  //                 bedroomCount: undefined,
  //                 area: undefined,
  //                 price: undefined
  //             });
  //
  //             let mainUrl = !param ? global.PARAM_NOT_FOUND_NEWS : param.param;
  //
  //             post.url = mainUrl + '/' + urlSlug(title) + '-' + Date.now();
  //
  //             await post.save();
  //         }
  //
  //         return res.json({
  //             status: 1,
  //             data: news,
  //             message: 'update success'
  //         });
  //     }
  //
  //
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  //
  // },
  // list: async function (req, res, next) {
  //
  //     try {
  //         var page = req.query.page;
  //
  //         if (!page || page < 1) {
  //             page = 1;
  //         }
  //
  //         let newsList = await NewsModel.find().sort({date: -1}).skip((page - 1) * global.PAGE_SIZE).limit(global.PAGE_SIZE);
  //
  //         let results = await Promise.all(newsList.map(async news => {
  //
  //             let post = await PostModel.findOne({contentId: news._id});
  //
  //
  //             let result = {
  //
  //                 id: news._id,
  //                 status: news.status,
  //                 title: news.title,
  //                 content: news.content,
  //                 cate: news.type,
  //                 image: news.image,
  //                 date : news.date,
  //                 description : news.description,
  //
  //             };
  //
  //             if (post) {
  //                 result.url = post.url;
  //             }
  //
  //             return result;
  //
  //         }));
  //
  //
  //         let count = await NewsModel.count();
  //
  //         return res.json({
  //             status: 1,
  //             data: {
  //                 items: results,
  //                 page: page,
  //                 total: _.ceil(count / global.PAGE_SIZE)
  //             },
  //             message: 'request success '
  //         });
  //     }
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  //
  // },
  //  highlight: async function (req, res, next) {
  //
  //     try {
  //
  //
  //         let newsList = await NewsModel.find().sort({date: -1}).limit(6);
  //
  //         let results = await Promise.all(newsList.map(async news => {
  //
  //             let post = await PostModel.findOne({contentId: news._id});
  //
  //
  //             let result = {
  //
  //                 id: news._id,
  //                 status: news.status,
  //                 title: news.title,
  //                 content: news.content,
  //                 cate: news.type,
  //                 image: news.image,
  //                 date : news.date,
  //                 description : news.description,
  //
  //             };
  //
  //             if (post) {
  //                 result.url = post.url;
  //             }
  //
  //             return result;
  //
  //         }));
  //
  //
  //         return res.json({
  //             status: 1,
  //             data: results,
  //             message: 'request success '
  //         });
  //     }
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  //
  // },
  // latest: async function (req, res, next) {
  //
  //     try {
  //
  //
  //         let newsList = await NewsModel.find().sort({date: -1}).limit(10);
  //
  //         let results = await Promise.all(newsList.map(async news => {
  //
  //             let post = await PostModel.findOne({contentId: news._id});
  //
  //
  //             let result = {
  //
  //                 id: news._id,
  //                 status: news.status,
  //                 title: news.title,
  //                 content: news.content,
  //                 cate: news.type,
  //                 image: news.image,
  //                 date : news.date,
  //                 description : news.description,
  //
  //             };
  //
  //             if (post) {
  //                 result.url = post.url;
  //             }
  //
  //             return result;
  //
  //         }));
  //
  //
  //         return res.json({
  //             status: 1,
  //             data: results,
  //             message: 'request success '
  //         });
  //     }
  //     catch (e) {
  //         return res.json({
  //             status: 0,
  //             data: {},
  //             message: 'unknown error : ' + e.message
  //         });
  //     }
  //
  // },

  list: async function (req, res, next) {

    try {

      var vips = await PostPriorityModel.find({status: global.STATUS.ACTIVE});

      return res.json({
        status: 1,
        data: vips,
        message: 'success'
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
  listAdmin: async function (req, res, next) {
    try {
      return res.json({
        status: HTTP_CODE.SUCCESS,
        data: await PostPriorityModel.find(),
        message: 'success'
      });
    } catch (e) {
      return next(e);
    }
  },

  add,
  update: async function (req, res, next) {

    try {

      var token = req.headers.accesstoken;

      var accessToken = await TokenModel.findOne({token: token});

      if (!accessToken) {
        return res.json({
          status: 0,
          data: {},
          message: 'access token invalid'
        });
      }

      var id = req.params.id;

      if (!id || id.length == 0) {
        return res.json({
          status: 0,
          data: {},
          message: 'id invalid'
        });
      }

      var postPriority = await PostPriorityModel.findOne({_id: id});

      if (!postPriority) {
        return res.json({
          status: 0,
          data: {},
          message: 'vip not found'
        });

      }

      var name = req.body.name;
      var minDay = req.body.minDay;
      var costByDay = req.body.costByDay;
      var priority = req.body.priority;
      var status = req.body.status;

      if (name) {
        postPriority.name = name;
      }
      if (minDay) {
        postPriority.minDay = minDay;
      }
      if (costByDay) {
        postPriority.costByDay = costByDay;
      }
      if (priority) {
        postPriority.priority = priority;
      }
      if (status) {
        postPriority.status = status;
      }

      postPriority = await postPriority.save();


      return res.json({
        status: 1,
        data: postPriority,
        message: 'request success !'
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
  price: async function (req, res, next) {

    try {

      var from = req.query.from;
      var to = req.query.to;
      var priorityId = req.query.priorityId;


      if (!from || !to || !priorityId || from <= 0 || to <= from || priorityId.length == 0) {

        return res.json({
          status: 0,
          data: {from: from, to: to, priorityId: priorityId},
          message: 'query data invalid'
        });

      }

      var priority = await PostPriorityModel.findOne({_id: priorityId});
      if (!priority) {
        return res.json({
          status: 0,
          data: {},
          message: 'priority not found'
        });
      }

      var dayNum = (to - from) / (24 * 60 * 60 * 1000);

      if (dayNum < priority.minDay) {
        return res.json({
          status: 0,
          data: {},
          message: 'minDay is ' + priority.minDay
        });
      }


      return res.json({
        status: 1,
        data: dayNum * priority.costByDay,
        message: 'success'
      });

    }
    catch (e) {
      return res.json({
        status: 0,
        data: {},
        message: 'unknown error : ' + e.message
      });
    }
  }
};

module.exports = PostPriorityController
