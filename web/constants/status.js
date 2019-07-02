"use strict";
exports.Status = {
    ACTIVE: 1,
    PENDING_OR_WAIT_CONFIRM: 2,
    BLOCKED: 3,
    DELETE: 4
};

exports.StatusNm = {
    1: 'Kích hoạt',
    2: 'Chờ',
    3: 'Bị khoá',
    4: 'Bị xoá'
};

exports.StatusCd2Nm = (cd) => {
    return exports.StatusNm[cd.toString()];
};
//# sourceMappingURL=status.js.map
