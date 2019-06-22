"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = {
    ACTIVE: 1,
    PENDING_OR_WAIT_CONFIRM: 2,
    BLOCKED: 3,
    DELETE: 4,
    PRODUCT_HIDDEN: 5,
    CHILD_ACCEPTED: 8,
    CHILD_WAITING: 9,
    CHILD_REJECTED: 10,
    CHILD_DELETED: 11,
    CHILD_NONE: 12,
    PAID_FORM_VIEW_ACTIVE: 40,
    PAID_FORM_VIEW_STOP: 50,
    OUT_OF_STOCK: 60,
    NOTIFY_NEW: 200,
    NOTIFY_READ: 201,
    ORDER_PENDING: 1000,
    ORDER_NOT_YET_PAID: 1001,
    ORDER_SUCCESS: 1002,
    ORDER_CONFRIMED: 1003,
    ORDER_PAID: 1004,
    ORDER_CANCEL: 1005,
    ORDER_ITEM_NEW: 2000,
    ORDER_ITEM_PROCESSING: 2001,
    ORDER_ITEM_ON_DELIVERY: 2002,
    ORDER_ITEM_FINISHED: 2003,
    ORDER_ITEM_CANCEL: 2004,
};
exports.StatusNm = {
    1: 'Kích hoạt',
    2: 'Chờ',
    3: 'Bị khoá',
    4: 'Bị xoá',
    5: 'Đã trả',
    6: 'Chưa trả',
    7: 'Miễn phí',
    8: 'Đồng ý',
    9: 'Chờ',
    10: 'Từ chối',
    11: 'Bị xoá',
    12: 'Null',
    40: 'Kích hoạt',
    50: 'Tạm dừng',
    200: 'Thông báo mới',
    201: 'Thông báo đã đọc'
};
exports.StatusCd2Nm = (cd) => {
    return exports.StatusNm[cd.toString()];
};
//# sourceMappingURL=status.js.map