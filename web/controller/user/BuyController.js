const PostModel = require('../../models/PostModel');
const BuyModel = require('../../models/BuyModel');
const TagModel = require('../../models/TagModel');
const urlSlug = require('url-slug');
const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const ImageService = require('../../services/ImageService');
const StringService = require('../../services/StringService');
const HttpCode = require('../../config/http-code');

const BuyController = {
  add: async function (req, res, next) {
    logger.info('BuyController::add::called');

    const {
      title, description, keywordList, formality,
      type, city, district, ward, street, project,
      area, price, unit,
      address, images, contactName, contactAddress,
      contactPhone, contactMobile, contactEmail,
      receiveMail, from, to, createdByType
    } = req.body;

    ImageService.postConfirmImage(images);
    try {
      if (StringService.isUndefinedOrNull(title) || title.length < 30 || title.length > 99) {
        return next(new Error('Invalid title'));
      }

      if (StringService.isNaN(formality)) {
        return next(new Error('Invalid formality'));
      }

      if (StringService.isNaN(from) || from <= 0) {
        return next(new Error('Invalid from date'));
      }

      if (StringService.isNaN(to) || to <= from) {
        return next(new Error('Invalid to date'));
      }

      if (StringService.isUndefinedOrNull(type) || type.toString().length === 0) {
        return next(new Error('Invalid type'));
      }

      if (StringService.isUndefinedOrNull(city) || city.toString() === '') {
        return next(new Error('Invalid city'));
      }

      if (StringService.isNaN(district)) {
        return next(new Error('Invalid district'));
      }

      if (StringService.isUndefinedOrNull(description) || description.length < 30) {
        return next(new Error('Invalid description'));
      }

      if (StringService.isUndefinedOrNull(contactMobile) || contactMobile.length < 8 || contactMobile.length > 11) {
        return next(new Error('Invalid contactMobile'));
      }

      let buy = new BuyModel();
      let post = new PostModel();

      if (req.user) {
        post.user = req.user.id;
      }

      if (createdByType) {
        const duplicateTitle = await BuyModel.findOne({title: req.body.title.trim()}).lean();
        if (duplicateTitle) {
          return next(new Error('Crawling duplicate title'))
        }
      }

      buy.title = title;
      buy.description = description;
      buy.keywordList = keywordList;
      buy.formality = formality;
      buy.type = type;
      buy.city = city;
      buy.district = district;
      buy.ward = ward;
      buy.street = street;
      buy.project = project;
      buy.area = (area && (area > 0)) ? area : null;
      buy.price = (price && (price > 0)) ? price : null;
      buy.unit = unit;
      buy.address = address;
      buy.images = images;
      buy.contactName = contactName;
      buy.contactAddress = contactAddress;
      buy.contactPhone = contactPhone;
      buy.contactMobile = contactMobile;
      buy.contactEmail = contactEmail;
      buy.receiveMail = receiveMail;

      if (createdByType) {
        buy.createdByType = createdByType;
        buy.status = global.STATUS.ACTIVE;
      } else {
        buy.createdByType = global.CREATED_BY.HAND;
      }

      buy = await buy.save();
      let url = urlSlug(title);
      const countDuplicate = await PostModel.countDocuments({url});
      if (countDuplicate > 0) {
        url = url + '-' + countDuplicate;
      }

      post.url = url;
      post.postType = global.POST_TYPE_BUY;
      post.formality = buy.formality;
      post.type = buy.type;
      post.contentId = new mongoose.Types.ObjectId(buy._id);
      post.from = from;
      post.to = to;

      if (createdByType) {
        post.status = global.STATUS.ACTIVE;
        post.paymentStatus = global.STATUS.PAYMENT_PAID;
      } else {
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.paymentStatus = global.STATUS.PAYMENT_FREE;
      }

      if (keywordList && keywordList.length > 0) {
        for (let i = 0; i < keywordList.length; i++) {
          const key = keywordList[i];
          const slug = urlSlug(key);

          if (!slug) {
            continue;
          }

          let tag = await TagModel.findOne({
            status: global.STATUS.ACTIVE,
            slug
          }).lean();

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

      post = await post.save();
      logger.info('BuyController::add::success');

      return res.json({
        status: HttpCode.SUCCESS,
        data: post,
        message: 'Success'
      });
    } catch (e) {
      logger.error('BuyController::add::error', e);
      return next(e);
    }
  },

  update: async (req, res, next) => {
    logger.info('BuyController::update::called');

    try {
      let id = req.params.id;
      if (!id) {
        return next(new Error('Invalid Id'));
      }

      let post = await PostModel.findOne({_id: id});
      if (!post || post.postType !== global.POST_TYPE_BUY) {
        return next(new Error('Post not found'));
      }

      if (post.user.toString() !== req.user._id.toString()) {
        return next(new Error('Permission denied'));
      }

      let buy = await BuyModel.findOne({_id: post.contentId});
      if (!buy) {
        return next(new Error('Buy not found'));
      }

      let {
        title, description, keywordList, formality, type, city,
        district, ward, street, project, area, price, unit,
        address, images, contactName, contactAddress, contactPhone,
        contactMobile, contactEmail, receiveMail, status, from, to
      } = req.body;

      if (title && (buy.title !== title.toString().trim())) {
        const trimmedTitle = title.toString().trim();
        buy.title = trimmedTitle;
        let url = urlSlug(trimmedTitle);
        let countDuplicate = await PostModel.countDocuments({url: url});
        if (countDuplicate > 0) {
          url = url + '-' + countDuplicate;
        }

        post.url = url;
      }

      buy.description = description || buy.description;
      buy.keywordList = keywordList || buy.keywordList;
      buy.formality = formality || buy.formality;
      buy.type = type || buy.type;
      buy.city = city || buy.city;
      buy.district = district || buy.district;
      buy.ward = ward || buy.ward;
      buy.street = street || buy.street;
      buy.project = project || buy.project;
      buy.area = area ? (area > 0 ? area : null) : buy.area;
      buy.price = price ? (price > 0 ? price : null) : buy.price;
      buy.unit = unit || buy.unit;
      buy.address = address || buy.address;
      buy.contactName = contactName || buy.contactName;
      buy.contactAddress = contactAddress || buy.contactAddress;
      buy.contactPhone = contactPhone || buy.contactPhone;
      buy.contactMobile = contactMobile || buy.contactMobile;
      buy.contactEmail = contactEmail || buy.contactEmail;
      buy.receiveMail = receiveMail || buy.receiveMail;
      buy.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;

      if (images) {
        ImageService.putUpdateImage(buy.images, images);
        buy.images = images;
      }

      post.formality = buy.formality;
      post.type = buy.type;

      if (from) {
        post.from = from;
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.status = global.STATUS.PAYMENT_UNPAID;
        post.refresh = Date.now();
      }

      if (to) {
        post.to = to;
        post.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
        post.status = global.STATUS.PAYMENT_UNPAID;
      }

      if (status === global.STATUS.DELETE) {
        post.status = status;
        buy.status = status;
      }

      post.tags = [];

      if (keywordList && keywordList.length > 0) {
        for (let i = 0; i < keywordList.length; i++) {
          const keyword = keywordList[i];
          const slug = urlSlug(keyword);
          if (!slug) {
            continue;
          }

          let tag = await TagModel.findOne({slug});
          if (!tag) {
            tag = new TagModel({
              slug: slug,
              keyword,
            });

            await tag.save();
          }

          post.tags.push(tag._id);
        }
      }

      await buy.save();
      await post.save();
      logger.info('BuyController::update::success');

      return res.json({
        status: HttpCode.SUCCESS,
        data: {},
        message: 'Success'
      });
    } catch (e) {
      logger.error('BuyController::update::error', e);
      return next(e);
    }
  }
};

module.exports = BuyController;
