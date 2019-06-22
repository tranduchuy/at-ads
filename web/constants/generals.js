let General = {};
General.API_COMFIRM_IMAGE = 'http://157.230.248.161:3100/images/confirmation';
General.HOME_PRODUCT_LIMIT = 8;
General.RELATED_PRODUCT_LIMIT = 8;
General.ApiTokenName = 'accesstoken';
General.jwtSecret = 'Hello';
General.Genders = {
    GENDER_MALE: 1,
    GENDER_FEMALE: 2
};
General.RegisterByTypes = {
    NORMAL: 1,
    GOOGLE: 2,
    FACEBOOK: 3
};
General.UserTypes = {
    TYPE_CUSTOMER: 1,
    TYPE_SELLER: 2
};
General.AddressTypes = {
    DELIVERY: 1,
    POSSIBLE_DELIVERY: 2,
    SHOP_ADDRESS: 3
};
General.UserRoles = {
    USER_ROLE_MASTER: 1,
    USER_ROLE_ADMIN: 2,
    USER_ROLE_ENDUSER: 3
};
General.ProductStatus = {
    ACTIVE: 1,
    BLOCKED: 3,
    OUT_OF_STOCK: 60
};
General.costPerKm = 8000; // 8k/km
General.checkSaleOffIntervalTime = 5; // 5 minutes

module.exports = {
    General
};