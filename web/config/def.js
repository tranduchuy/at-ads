global.API_COMFIRM_IMAGE = 'https://static.hecta.vn/images/confirmation';

global.STATUS = {
  ACTIVE: 1,
  PENDING_OR_WAIT_COMFIRM: 2,
  BLOCKED: 3,
  DELETE: 4,

  PAYMENT_PAID: 5,
  PAYMENT_UNPAID: 6,
  PAYMENT_FREE: 7,

  CHILD_ACCEPTED: 8,
  CHILD_WAITING: 9,
  CHILD_REJECTED: 10,
  CHILD_DELETED: 11,
  CHILD_NONE: 12,

  NOTIFY_NONE: 20,
  NOTIFY_READ: 21,

  LEAD_NEW: 30,
  LEAD_SOLD: 31,
  LEAD_RETURNING: 32,
  LEAD_FINISHED: 33,
  
  PAID_FORM_VIEW_ACTIVE: 40,
  PAID_FORM_VIEW_STOP: 50,
};

global.POST_TYPE_SALE = 1;
global.POST_TYPE_BUY = 2;
global.POST_TYPE_PROJECT = 3;
global.POST_TYPE_NEWS = 4;

global.ROOT_DIR = '/var/www/server/web';
global.IMAGE_DIR = global.ROOT_DIR + 'files/image';

global.USER_TYPE_COMPANY = 1;
global.USER_TYPE_PERSONAL = 2;


global.URL_TYPE_FIXED = 1;
global.URL_TYPE_GENERATED = 2;


global.USER_GENDER_MALE = 1;
global.USER_GENDER_FEMALE = 0;


global.PAGE_SIZE = 20;


global.URL_PARAM_CAT = 1;
global.URL_PARAM_DETAIL = 2;


global.PARAM_NOT_FOUND_SALE = 'tin-can-ban-can-cho-thue-chung';
global.PARAM_NOT_FOUND_BUY = 'tin-can-mua-can-thue-chung';
global.PARAM_NOT_FOUND_PROJECT = 'du-an-chung';
global.PARAM_NOT_FOUND_NEWS = 'tin-tuc-chung';
global.PARAM_NOT_FOUND = 'tim-kiem-chung';


global.TRANSACTION_TYPE_ADD_MAIN_ACCOUNT = 1;
global.TRANSACTION_TYPE_ADD_PROMO_ACCOUNT = 2;
global.TRANSACTION_TYPE_PAY_POST = 3;
global.TRANSACTION_TYPE_SHARE_CREDIT = 4;
global.TRANSACTION_TYPE_RECEIVE_CREDIT = 5;
global.TRANSACTION_TYPE_UP_NEW = 6;
global.TRANSACTION_TYPE_GIVE_MONEY_BACK = 7;
global.TRANSACTION_TYPE_TAKE_BACK_MONEY = 8;
global.TRANSACTION_TYPE_VIEW_POST_SALE = 9;
global.TRANSACTION_TYPE_BUY_LEAD = 10;
global.TRANSACTION_TYPE_REFUND_LEAD = 11;

global.USER_ROLE_MASTER = 1;
global.USER_ROLE_ADMIN = 2;
global.USER_ROLE_ENDUSER = 3;


global.SLUG_PROJECT = "du-an";
global.SLUG_NEWS = "bai-viet";
global.SLUG_TAG = "t";
global.SLUG_SALE_OR_BUY = "chi-tiet-bds";
global.SLUG_CATEGORY_SELL_OR_BUY = "bds";
global.SLUG_CATEGORY_PROJECT = "danh-muc-du-an";
global.SLUG_CATEGORY_NEWS = "danh-muc-bai-viet";

global.AD_STAT_VIEW = 1;
global.AD_STAT_IMPRESSION = 2;
global.AD_STAT_CLICK = 3;

global.CREATED_BY = {
  HAND: 1,
  CRAWL: 2
};

global.PAID_FORM = {
  DAY: 1,
  VIEW: 2
};

global.SEARCH_PARAMS = {
  numberOfSaleByView: 3
};

global.REFERRER_TYPE = {
  GOOGLE_ORGANIC: 1,
  GOOGLE_ADS: 2,
  FACEBOOK_ORGANIC: 3,
  FACEBOOK_ADS: 4,
  HECTA: 5,
  OTHER: 6
}
