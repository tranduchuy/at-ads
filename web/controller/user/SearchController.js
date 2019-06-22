const _ = require('lodash');
const UrlParamModel = require('../../models/UrlParamModel');
const PostModel = require('../../models/PostModel');
const BuyModel = require('../../models/BuyModel');
const SaleModel = require('../../models/SaleModel');
const NewsModel = require('../../models/NewsModel');
const ProjectModel = require('../../models/ProjectModel');
const TagModel = require('../../models/TagModel');
const urlSlug = require('url-slug');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');
const EU = require('express-useragent');

// service
const TitleService = require("../../services/TitleService");
const StringService = require('../../services/StringService');
const UrlParamService = require('../../services/UrlParamService');
const RequestUtils = require('../../utils/RequestUtil');
const RabbitMQService = require('../../services/RabbitMqService');

// cache
const LRU = require("lru-cache");
const cache = new LRU({
  max: 2000,
  maxAge: 1000 * 60 * 60
});

/**
 * Get model type by cat.postType
 * @param cat UrlParamModel
 */
const getModelByCatPostType = (cat) => {
  switch (cat.postType) {
    case global.POST_TYPE_SALE:
      return SaleModel;
    case global.POST_TYPE_BUY:
      return BuyModel;
    case global.POST_TYPE_PROJECT:
      return ProjectModel;
    case global.POST_TYPE_NEWS:
      return NewsModel;
    default:
      return SaleModel;
  }
};

/**
 * Check slug is case SLUG SEARCH DETAIL POST or not
 * @param slug
 * @return {boolean}
 */
const isValidSlugDetail = (slug) => {
  return slug === global.SLUG_NEWS ||
    slug === global.SLUG_PROJECT ||
    slug === global.SLUG_SALE_OR_BUY;
};

/**
 * Check slug is case SLUG CATEGORY or not
 * @param slug
 * @return {boolean}
 */
const isValidSlugCategorySearch = (slug) => {
  return slug === global.SLUG_CATEGORY_SELL_OR_BUY ||
    slug === global.SLUG_CATEGORY_NEWS ||
    slug === global.SLUG_CATEGORY_PROJECT;
};

/**
 * Check slug is SLUG_TAG or not
 * @param slug
 * @return {boolean}
 */
const isValidSlugTag = (slug) => {
  return slug === global.SLUG_TAG;
};

/**
 *
 * @param saleOrBuyList
 * @param postList
 */
const mapListPostAndListSaleOrBuy = (saleOrBuyList, postList) => {
  const postContentIds = postList.map(p => p.contentId.toString());
  const targetPostHaveData = saleOrBuyList.filter(t => {
    return postContentIds.indexOf(t._id.toString()) !== -1;
  });

  targetPostHaveData.forEach((sb, index) => {
    const post = postList.find(p => p.contentId.toString() === sb._id.toString());

    if (post) {
      targetPostHaveData[index].url = post.url;
      targetPostHaveData[index].customUrl = post.customUrl;
    }
  });

  return targetPostHaveData;
};

/**
 * @description _ Get related posts of buy or sale model. Default get 10 related items
 * @param buyOrSaleObj object detail info of buyModel or saleModel
 * @param buyOrSale global.POST_TYPE_BUY | global.POST_TYPE_SALE
 * @param limit Limit related items want to get
 * @return {Promise<*>}
 */
const getRelatedPostsOfSaleOrBuy = async (buyOrSaleObj, buyOrSale, limit) => {
  limit = limit || 10;
  const model = buyOrSale === global.POST_TYPE_BUY ?
    BuyModel :
    SaleModel;

  try {
    const project = await ProjectModel.findOne({ _id: buyOrSaleObj.project });
    let buyOrSales = [];

    if (project) {
      buyOrSales = await model
        .find({
          project: buyOrSaleObj.project,
          _id: { $ne: buyOrSaleObj._id }
        })
        .limit(limit)
        .lean();
    } else {
      const queryObject = UrlParamService.getQueryObject(buyOrSale);

      if (queryObject['street']) {
        delete queryObject.street; // to get related with same ward
      } else if (queryObject['ward']) {
        delete queryObject.ward; // to get related with same district
      } else if (queryObject['district']) {
        delete queryObject.district; // to get related with same city
      } else if (queryObject['city']) {
        delete queryObject.city; // to get related with same type
      } else if (queryObject['type']) {
        delete queryObject.type; // to get related with same formality
      } else {
        delete queryObject.formality; // to get related with no condition
      }

      buyOrSales = await model
        .find({
          ...queryObject,
          _id: { $ne: buyOrSaleObj._id }
        })
        .limit(limit)
        .lean();
    }

    const buyOrSalesIds = buyOrSales.map(t => t._id);
    const posts = await PostModel
      .find({
        contentId: {
          $in: buyOrSalesIds
        }
      })
      .lean();

    return mapListPostAndListSaleOrBuy(buyOrSales, posts);
  } catch (e) {
    logger.warn('SearchController::getRelatedPostsOfSaleOrBuy. Cannot get related posts', e);
    return [];
  }
};

/**
 *
 * @param catObj
 * @param query reference OUTPUT
 * @param additionalProperties
 */
const mapCategoryToQuery = (catObj, query, additionalProperties = []) => {
  if (!catObj) {
    return;
  }

  const catProperties = [
    ...additionalProperties, 'formality', 'type', 'city', 'district',
    'ward', 'street', 'project', 'direction',
    'bedroomCount', 'areaMax', 'areaMin', 'area',
    'priceMax', 'priceMin', 'price'
  ];

  catProperties.forEach(field => {
    if (catObj[field]) {
      query[field] = catObj[field];
    }
  });
};

const handleSearchCaseNotCategory = async (param, slug, next) => {
  let data = {};
  let post = await PostModel.findOne({
    status: global.STATUS.ACTIVE,
    $or: [
      { url: param },
      { customUrl: param }
    ]
  });

  if (!post) {
    logger.error('SearchController::handleSearchCaseNotCategory::error Post not found');
    return next(new Error('Post not found'));
  }

  let relatedPosts = [];
  let relatedCates = [];
  let relatedTags = [];
  let query = {}; // only update by sale or buy type

  if (slug === global.SLUG_NEWS) {
    if (post.postType !== global.POST_TYPE_NEWS) {
      logger.error('SearchController::handleSearchCaseNotCategory::error. Slug and post.postType not match SLUG_NEWS');
      return next(new Error('Slug and post.postType not match SLUG_NEWS'));
    }

    const news = await NewsModel.findOne({
      _id: post.contentId
    });
    if (!news) {
      logger.error('SearchController::handleSearchCaseNotCategory::error. News not found');
      return next(new Error('News not found'));
    }

    Object.assign(data, news.toObject(), post.toObject(), { id: post._id });

    const stages = [
      {
        $match: {
          type: news.type,
          _id: {
            $ne: news._id
          }
        }
      },
      {
        $sort: {
          title: 1
        }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "Posts",
          localField: "_id",
          foreignField: "contentId",
          as: "postInfo"
        }
      },
      {
        $unwind: "$postInfo"
      }
    ];

    const listNews = await NewsModel.aggregate(stages);

    relatedPosts = listNews.map(n => {
      n.url = n.postInfo.url;
      n.customUrl = n.postInfo.customUrl;
      delete n.postInfo;
      return n;
    });
  }

  if (slug === global.SLUG_PROJECT) {
    if (post.postType !== global.POST_TYPE_PROJECT) {
      logger.error('SearchController::handleSearchCaseNotCategory::error. Slug and post.postType not match case SLUG_PROJECT');
      return next(new Error('Slug and post.postType not match case SLUG_PROJECT'));
    }

    const project = await ProjectModel.findOne({
      _id: post.contentId
    });

    if (!project) {
      logger.error('SearchController::handleSearchCaseNotCategory::error. Project not found');
      return next(new Error('Project not found'));
    }

    Object.assign(data, project.toObject(), post.toObject(), {
      id: post._id,
      createdByType: post.createdByType || null
    });

    relatedPosts = await SaleModel
      .find({
        project: project._id
      })
      .limit(10)
      .sort({ title: 1 })
      .lean();
  }

  if (slug === global.SLUG_SALE_OR_BUY) {
    if (post.postType !== global.POST_TYPE_BUY && post.postType !== global.POST_TYPE_SALE) {
      logger.error('SearchController::handleSearchCaseNotCategory::error. Slug and post.postType not match case SLUG_SELL_OR_BUY');
      return next(new Error('Slug and post.postType not match case SLUG_SELL_OR_BUY'));
    }


    if (post.postType === global.POST_TYPE_BUY) {
      let buy = await BuyModel.findOne({
        _id: post.contentId
      }).lean();

      if (!buy) {
        logger.error('SearchController::handleSearchCaseNotCategory::error. Buy not found');
        return next(new Error('Buy not found'));
      }

      data = mapBuyOrSaleItemToResultCaseCategory(post.toObject(), buy);

      const rootQuery = UrlParamService.getQueryObject(buy);
      relatedCates = await UrlParamService.getRelatedUrlParams(rootQuery);
      relatedPosts = await getRelatedPostsOfSaleOrBuy(buy, global.POST_TYPE_BUY, 10);
      query = rootQuery;
    }

    if (post.postType === global.POST_TYPE_SALE) {
      let sale = await SaleModel.findOne({
        _id: post.contentId
      }).lean();

      if (!sale) {
        logger.error('SearchController::handleSearchCaseNotCategory::error. Sale not found');
        return next(new Error('Sale not found'));
      }

      data = mapBuyOrSaleItemToResultCaseCategory(post.toObject(), sale);

      const rootQuery = UrlParamService.getQueryObject(sale);
      relatedCates = await UrlParamService.getRelatedUrlParams(rootQuery);
      relatedPosts = await getRelatedPostsOfSaleOrBuy(sale, global.POST_TYPE_SALE, 10);
      query = rootQuery;
    }
  }

  return {
    status: HttpCode.SUCCESS,
    type: post.postType,
    seo: {
      url: post.url,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      metaType: post.metaType,
      metaUrl: post.metaUrl,
      metaImage: post.metaImage,
      canonical: post.canonical,
      textEndPage: post.textEndPage
    },
    isList: false,
    related: relatedPosts,
    relatedCates,
    relatedTags,
    params: query,
    data: data,
    message: 'Success'
  }
};

const mapBuyOrSaleItemToResultCaseCategory = (post, buyOrSale) => {
  const keywordList = (buyOrSale.keywordList || []).map(key => {
    return {
      keyword: key,
      slug: urlSlug(key)
    }
  });

  return Object.assign({},
    buyOrSale,
    post,
    { id: post._id, keywordList });
};

const generateStageQuerySaleCaseCategory = (req, query, paginationCond) => {
  const stages = [
    {
      $lookup: {
        from: "Posts",
        localField: "_id",
        foreignField: "contentId",
        as: "postInfo"
      }
    },
    {
      $unwind: "$postInfo"
    },
    {
      $match: {
        ...query,
        paidForm: global.PAID_FORM.DAY
      }
    }
  ];

  let sortObj = {};
  if (req.query.sortBy && ['priority', 'price', 'area', 'date'].indexOf(req.query.sortBy) !== -1) {
    sortObj[`postInfo.${req.query.sortBy}`] = req.query['sortDirection'] === 'ASC' ? 1 : -1;
  } else {
    sortObj = {
      'postInfo.priority': -1,
      date: -1
    };
  }

  stages.push({ $sort: sortObj });

  stages.push({
    $facet: {
      entries: [
        { $skip: (paginationCond.page - 1) * paginationCond.limit },
        { $limit: paginationCond.limit },
      ],
      meta: [
        { $group: { _id: null, totalItems: { $sum: 1 } } },
      ],
    }
  });

  return stages;
};

const generateStageQuerySaleByViewCaseCategory = (req, query, paginationCond) => {
  const stages = [
    {
      $lookup: {
        from: "Posts",
        localField: "_id",
        foreignField: "contentId",
        as: "postInfo"
      }
    },
    {
      $unwind: "$postInfo"
    },
    {
      $match: {
        ...query,
        paidForm: global.PAID_FORM.VIEW,
        isValidBalance: true,
        adStatus: global.STATUS.PAID_FORM_VIEW_ACTIVE
      }
    }
  ];

  /*let sortObj = {};
  if (req.query.sortBy && ['priority', 'price', 'area', 'date'].indexOf(req.query.sortBy) !== -1) {
      sortObj[`postInfo.${req.query.sortBy}`] = req.query['sortDirection'] === 'ASC' ? 1 : -1;
  } else {
      sortObj = {
          'postInfo.priority': -1,
          date: -1
      };
  }*/

  stages.push({ $sort: { adRank: -1 } });

  stages.push({
    $facet: {
      entries: [
        { $skip: (paginationCond.page - 1) * global.SEARCH_PARAMS.numberOfSaleByView },
        { $limit: global.SEARCH_PARAMS.numberOfSaleByView },
      ],
      meta: [
        { $group: { _id: null, totalItems: { $sum: 1 } } },
      ],
    }
  });

  return stages;
};

const handleSearchCaseCategory = async (req, param) => {
  let page = req.query.page || 0;
  const query = { status: global.STATUS.ACTIVE };
  let results = [];
  let relatedCates = [];
  let relatedTags = [];
  let count = 0;
  let cat = await UrlParamModel.findOne({
    $or: [
      { param },
      { customParam: param }
    ]
  });

  const paginationCond = RequestUtils.extractPaginationCondition(req);

  if (cat) {
    mapCategoryToQuery(cat, query);

    // model maybe: SaleModel, BuyModel, ProjectModel, NewsModel
    const model = getModelByCatPostType(cat);
    let data = [];
    let sortObj = {};

    switch (cat.postType) {
      case global.POST_TYPE_SALE:
        // get list sale by day
        const stages = generateStageQuerySaleCaseCategory(req, query, paginationCond);
        logger.info('SearchController::handleSearchCaseCategory stages of sale by day: ', JSON.stringify(stages));
        const tmpResults = await SaleModel.aggregate(stages);
        data = tmpResults[0].entries;
        count = tmpResults[0].entries.length > 0 ? tmpResults[0].meta[0].totalItems : 0;

        // get list sale by view
        const stages2 = generateStageQuerySaleByViewCaseCategory(req, query, paginationCond);
        logger.info('SearchController::handleSearchCaseCategory stages of sale by view: ', JSON.stringify(stages2));
        const tmpResults2 = await SaleModel.aggregate(stages2);
        const viewItems = tmpResults2[0].entries;

        if (viewItems.length !== 0) {
          data = tmpResults[0].entries.concat(viewItems);
          const saleIds = viewItems.map(item => item._id);
          saveAdStatHistory(req, saleIds, global.AD_STAT_IMPRESSION);
          updateAdRankBySearch(saleIds);
        }
        break;
      case global.POST_TYPE_BUY:
        sortObj = {};
        if (req.query.sortBy && ['price', 'area', 'date'].indexOf(req.query.sortBy) !== -1) {
          sortObj[req.query.sortBy] = req.query['sortDirection'] === 'ASC' ? 1 : -1;
        } else {
          sortObj = { date: -1 };
        }

        data = await model.find(query)
          .sort(sortObj)
          .skip((paginationCond.page - 1) * paginationCond.limit)
          .limit(paginationCond.limit)
          .lean();

        count = await model.countDocuments(query);
        break;
      case global.POST_TYPE_PROJECT:
      case global.POST_TYPE_NEWS:
        count = await model.countDocuments(query);

        data = await model.find(query)
          .sort({ date: -1 })
          .skip((paginationCond.page - 1) * paginationCond.limit)
          .limit(paginationCond.limit);
        break;
    }

    results = await Promise.all(data.map(async (item) => {
      const post = await PostModel.findOne({ contentId: item._id });
      if (!post) {
        return null;
      }

      switch (cat.postType) {
        case global.POST_TYPE_SALE:
        case global.POST_TYPE_BUY:
          return mapBuyOrSaleItemToResultCaseCategory(post.toObject(), item);
        case global.POST_TYPE_PROJECT:
        case global.POST_TYPE_NEWS:
          return Object.assign({}, post.toObject(), item.toObject(), { id: post._id });
      }
    }));

    // get related urlParams (cats)
    const rootQuery = UrlParamService.getQueryObject(cat);
    relatedCates = await UrlParamService.getRelatedUrlParams(rootQuery);
  } else {
    logger.error('SearchController::handleSearchCaseCategory. Url not found with url: ' + param);
    return {
      status: HttpCode.BAD_REQUEST,
      message: 'Url not found',
      data: {}
    }
  }

  results = results.filter(function (el) {
    return el != null;
  });

  query.postType = cat.postType;

  if ((cat.postType === global.POST_TYPE_SALE || cat.postType === global.POST_TYPE_BUY) && (results.length > 0)) {
    relatedTags = results
      .map(r => r.keywordList)
      .reduce((keywords, keywordList) => {
        return keywords.concat(keywordList)
      })
      .slice(0, 10);
  }

  return {
    status: HttpCode.SUCCESS,
    type: cat.postType,
    seo: {
      url: cat.param,
      customUrl: cat.customParam,
      metaTitle: cat.metaTitle,
      metaDescription: cat.metaDescription,
      metaType: cat.metaType,
      metaUrl: cat.metaUrl,
      metaImage: cat.metaImage,
      canonical: cat.canonical,
      textEndPage: cat.textEndPage
    },
    isList: true,
    params: query,
    data: {
      itemCount: count,
      items: results,
      page: page,
      total: _.ceil(count / global.PAGE_SIZE)
    },
    message: 'Success',
    relatedCates,
    relatedTags
  };
};

const filter = async (req, res, next) => {
  logger.info('SearchController::filter is called');
  try {
    let {
      formality, type, city, district, ward,
      street, project, direction, bedroomCount,
      area, price
    } = req.body;

    formality = formality ? formality.value : null;
    type = type ? type.value : null;
    city = city ? city.value : null;
    district = district ? district.value : null;
    ward = ward ? ward.value : null;
    street = street ? street.value : null;
    project = project ? project.value : null;
    direction = (direction && (direction.value !== '0')) ? direction.value : null;
    bedroomCount = (bedroomCount && (bedroomCount.value !== '0')) ? bedroomCount.value : null;
    area = area ? area.value : null;
    price = price ? price.value : null;

    const postType = TitleService.getPostType(formality);
    const query = {
      postType,
      formality,
      type,
      city,
      district,
      ward,
      street,
      project,
      direction,
      bedroomCount,
      area,
      price
    };

    let cat = await UrlParamModel.findOne(query);

    if (cat) {
      return res.json({
        status: HttpCode.SUCCESS,
        // TODO return data list post
        data: { url: cat.param },
        message: 'Success'
      });
    }

    // Insert new param to UrlParams
    let url = TitleService.getTitle(query) + ' ' +
      TitleService.getLocationTitle(query);

    let orderSlug = TitleService.getOrderTitle(query);
    orderSlug = urlSlug(orderSlug.trim());
    if (orderSlug !== '') {
      url = urlSlug(url.trim()) + "/" + orderSlug;
    } else {
      url = urlSlug(url.trim());
    }

    let countDuplicate = await UrlParamModel.countDocuments({ param: url });
    if (countDuplicate > 0) url = url + "-" + countDuplicate;

    cat = new UrlParamModel({
      postType,
      formality,
      type,
      city,
      district,
      ward,
      street,
      project,
      direction,
      bedroomCount,
      area,
      price,
      param: url,
    });

    await cat.save();

    return res.json({
      status: HttpCode.SUCCESS,
      data: { url },
      message: 'Success'
    });
  } catch (e) {
    logger.error('SearchController::filter::error', e);
    return next(e);
  }
};

const search = async (req, res, next) => {
  logger.info('SearchController::search is called');

  try {
    const url = StringService.removeQueryStringFromPath(req.query.url || '');
    let page = req.query.page;

    if (!page || page < 1) {
      page = 1;
    }

    if (!url || url.length === 0) {
      logger.error('SearchController::search::error. Url is required');
      return next(new Error('Url is required'));
    }

    const splitUrl = url.trim().split('/');

    if (!splitUrl || splitUrl.length > 3) {
      logger.error('SearchController::search::error. Invalid url, splitUrl: ', splitUrl);
      return next(new Error('Invalid url'));
    }

    let slug = splitUrl[0];
    let param = splitUrl[1];
    if (splitUrl.length === 3)
      param = splitUrl[1] + "/" + splitUrl[2];

    if (!slug || slug.length === 0 || !param || param.length === 0) {
      logger.error('SearchController::search::error. Invalid url params, splitUrl: ', splitUrl);
      return next(new Error('Invalid url params'));
    }

    let result = {};
    if (isValidSlugDetail(slug)) {
      result = await handleSearchCaseNotCategory(param, slug, next);
      if (result && result.type === global.POST_TYPE_SALE) {
        // Note Task insert ad stat history will call api purchase by view detail sale. No need to call here
        saveAdStatHistory(req, [result.data.contentId], global.AD_STAT_VIEW);
      }

      if (result.status === HttpCode.SUCCESS) {
        cache.set(req.originalUrl, JSON.stringify(result));
        return res.json(result);
      }
    }

    if (isValidSlugCategorySearch(slug)) {
      result = await handleSearchCaseCategory(req, param, next);
      if (result.status === HttpCode.SUCCESS) {
        cache.set(req.originalUrl, JSON.stringify(result));
        return res.json(result);
      }
    }

    logger.error('SearchController::search:error. Invalid url. Not match case slug', url);
    return next(new Error('Invalid url. Not match case slug: ' + url));
  } catch (e) {
    logger.error('SearchController::search:error', e);
    return next(e);
  }
};

const getUrlToRedirect = async (req, res, next) => {
  logger.info('SearchController::getUrlToRedirect is called');

  try {
    const queryStr = StringService.getQueryStringFromPath(req.query.url || '');
    const url = StringService.removeQueryStringFromPath(req.query.url || '');

    if (!url || url.length === 0) {
      logger.error('SearchController::getUrlToRedirect::error. Url is required');
      return next(new Error('Url is required'));
    }

    const splitUrl = url.trim().split('/');

    if (!splitUrl || splitUrl.length !== 2) {
      logger.error('SearchController::getUrlToRedirect::error. Invalid url, splitUrl: ', splitUrl);
      return next(new Error('Invalid url'));
    }

    let slug = splitUrl[0];
    let param = splitUrl[1];

    if (!slug || slug.length === 0 || !param || param.length === 0) {
      logger.error('SearchController::getUrlToRedirect::error. Invalid url params, splitUrl: ', splitUrl);
      return next(new Error('Invalid url params'));
    }

    if (isValidSlugDetail(slug)) {
      let post = await PostModel.findOne({
        status: global.STATUS.ACTIVE,
        $or: [
          { url: param },
          { customUrl: param }
        ]
      });

      if (!post) {
        return res.json({
          status: HttpCode.ERROR,
          message: ['Post not found'],
          data: {}
        });
      }

      let url = '';
      if (queryStr) {
        url = `${slug}/${post.customUrl || post.url}?${queryStr}`
      } else {
        url = `${slug}/${post.customUrl || post.url}`
      }

      return res.json({
        status: HttpCode.SUCCESS,
        message: ['Success'],
        data: {
          url
        }
      });
    }

    if (isValidSlugCategorySearch(slug)) {
      let cat = await UrlParamModel.findOne({
        $or: [
          { param },
          { customParam: param }
        ]
      });

      if (!cat) {
        return res.json({
          status: HttpCode.ERROR,
          message: ['Category not found'],
          data: {}
        });
      }

      let url = '';
      if (queryStr) {
        url = `${slug}/${cat.customParam || cat.param}?${queryStr}`
      } else {
        url = `${slug}/${cat.customParam || cat.param}`
      }

      return res.json({
        status: HttpCode.SUCCESS,
        message: ['Success'],
        data: {
          url
        }
      });
    }

    if (isValidSlugTag(slug)) {
      const tag = await TagModel.findOne({
        $or: [
          { slug: param },
          { customSlug: param }
        ]
      });

      if (!tag) {
        return res.json({
          status: HttpCode.ERROR,
          message: ['Tag not found'],
          data: {}
        });
      }

      let url = '';
      if (queryStr) {
        url = `${slug}/${tag.customSlug || tag.slug}?${queryStr}`
      } else {
        url = `${slug}/${tag.customSlug || tag.slug}`
      }

      return res.json({
        status: HttpCode.SUCCESS,
        message: ['Success'],
        data: {
          url
        }
      });
    }

    logger.error('SearchController::getUrlToRedirect:error. Invalid url. Not match case slug', url);
    return next(new Error('Invalid url. Not match case slug: ' + url));
  } catch (e) {
    logger.error('SearchController::getUrlToRedirect:error', e);
    return next(e);
  }
};

const searchCache = (req, res, next) => {
  const cachedData = cache.get(req.originalUrl);

  if (cachedData) {
    try {
      const result = JSON.parse(cachedData);
      if (result.type === global.POST_TYPE_SALE) {
        saveAdStatHistory(req, [result.data.contentId], global.AD_STAT_VIEW);
      }

      return res.json(result);
    } catch (e) {
      logger.error('SearchController::searchCache::error. Cannot parse string.');
    }
  }

  next();
};

const saveAdStatHistory = (req, saleIds, type) => {
  const agentObj = EU.parse(req.get('User-Agent'));
  const logData = {
    utmSource: req.query.utmSource,
    utmCampaign: req.query.utmCampaign,
    utmMedium: req.query.utmMedium,
    referrer: req.query.referrer,
    browser: agentObj.browser,
    version: agentObj.version,
    device: agentObj.platform,
    os: agentObj.os
  };

  logger.info('SearchController::saveAdStatHistory::Call function send rabbit mq insertAdStatHistory');
  RabbitMQService.insertAdStatHistory(saleIds, logData, type);
};

const updateAdRankBySearch = (saleIds) => {
  logger.info('SearchController::updateAdRankBySearch::Call function send rabbit mq updateAdRank');
  RabbitMQService.updateAdRank(saleIds, global.AD_STAT_IMPRESSION);
};

module.exports = {
  filter,
  search,
  searchCache,
  getUrlToRedirect
};
