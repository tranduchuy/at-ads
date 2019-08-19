"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ResponseMessages;
(function (ResponseMessages) {
    ResponseMessages.SUCCESS = 'Thành công';
    ResponseMessages.UNAUTHORIZED = 'Không hợp lệ';
    ResponseMessages.INVALID_ID = 'ID không hợp lệ';
    let User;
    (function (User) {
        User.USER_NOT_FOUND = 'Tài khoản không tồn tại';
        User.RESEND_CONFIRM_EMAIL = 'Hệ thống đã gửi lại email xác nhận tài khoản. Vui lòng kiểm tra email';
        let Register;
        (function (Register) {
            Register.PHONE_DUPLICATED = 'Số điện thoại đã được đăng kí';
            Register.EMAIL_DUPLICATED = 'Email đã được đăng kí';
            Register.USERNAME_DUPLICATED = 'Username đã được đăng kí';
            Register.PASSWORD_DONT_MATCH = 'Mật khẩu và mật khẩu xác nhận không giống nhau';
            Register.REGISTER_SUCCESS = 'Đăng kí thành công';
            Register.WRONG_OTP = 'Mã xác thực sai';
            Register.EXCEED_MAX_SEND_OTP = 'Đã quá số lần gửi OTP. Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ADMIN';
            Register.RESEND_OTP = 'Hệ thống đã gửi 1 mã OTP đến số điện thoại của bạn';
        })(Register = User.Register || (User.Register = {}));
        let Login;
        (function (Login) {
            Login.USER_NOT_FOUND = 'Tài khoản không tồn tại';
            Login.WRONG_PASSWORD = 'Sai mật khẩu';
            Login.INACTIVE_USER = 'Tài khoản chưa được kích hoạt';
            Login.LOGIN_SUCCESS = 'Đăng nhập thành công';
            Login.PERMISSION_DENIED = 'Không có quyền truy cập';
            Login.INVALID_TOKEN = 'Token không hợp lệ';
            Login.NEW_USER_BY_GOOGLE = 'Tài khoản mới đã được tạo vui lòng xác nhận số điện thoại của bạn';
            Login.NEW_USER_BY_FACEBOOK = 'Tài khoản mới đã được tạo vui lòng xác nhận số điện thoại của bạn';
        })(Login = User.Login || (User.Login = {}));
        let Confirm;
        (function (Confirm) {
            Confirm.INVALID_TOKEN = 'Token không hợp lệ';
            Confirm.CONFIRM_SUCCESS = 'Kích hoạt tài khoản thành công';
        })(Confirm = User.Confirm || (User.Confirm = {}));
        let ForgetPassword;
        (function (ForgetPassword) {
            ForgetPassword.INVALID_REGISTER_TYPE = 'Tài khoản đăng kí bằng mạng xã hội hoặc google không thể reset mật khẩu.';
            ForgetPassword.FORGET_PASSWORD_SUCCESS = 'Gửi yêu cầu khôi phục mật khẩu thành công, vui lòng kiểm tra email của bạn';
        })(ForgetPassword = User.ForgetPassword || (User.ForgetPassword = {}));
        let ResetPassword;
        (function (ResetPassword) {
            ResetPassword.EXPIRED_TOKEN = 'Token reset mật khẩu hết hạn, vui lòng tạo yêu cầu mới.';
            ResetPassword.RESET_PASSWORD_SUCCESS = 'Khôi phục mật tài khoản thành công';
        })(ResetPassword = User.ResetPassword || (User.ResetPassword = {}));
    })(User = ResponseMessages.User || (ResponseMessages.User = {}));
    let AccountAds;
    (function (AccountAds) {
        AccountAds.ACCOUNT_NOT_FOUND = 'Tài khoản không tồn tại';
        let Register;
        (function (Register) {
          Register.ACCOUNT_ADS_DUPLICATE = 'Tài khoản đã có trong hệ thống';
          Register.REGISTER_SUCCESS = 'Đăng kí thành công';
          Register.ADWORDS_ID_BELONG_TO_ANOTHER_USER = 'Tài khoản adword này thuộc về người dùng khác';
        })(Register = AccountAds.Register || (AccountAds.Register = {}));
    })(AccountAds = ResponseMessages.AccountAds || (ResponseMessages.AccountAds = {}));
    let Website;
    (function (Website) {
        Website.ACCOUNT_ID_NOT_FOUND = 'Không tìm thấy thông tin adword';

        Website.NOT_VALID = 'Domain không hợp lệ';
        let Register;
        (function (Register) {
            Register.DOMAIN_DUPLICATE = 'Domain đã tồn tại trong hệ thống';
            Register.ACCOUNT_ID_NOT_FOUND = 'Không thể tìm thấy account id';
            Register.REGISTER_SUCCESS = 'Thêm tên miền thành công';
        })(Register = Website.Register || (Website.Register = {}));
        let Edit;
        (function (Edit) {
          Edit.WEBSITE_NOT_FOUND = 'Không tìm thấy website';
          Edit.EDIT_SUCCESS = 'Thêm tên miền thành công';
        })(Edit = Website.Edit || (Website.Edit = {}));
        let Delete;
        (function (Delete) {
            Delete.WEBSITE_NOT_FOUND = 'Không tìm thấy website';
            Delete.IS_NOT_OWN_DOMAIN = 'Từ chối tác vụ';
            Delete.DELETE_SUCCESS = 'Xoá tên miền thành công';
        })(Delete = Website.Delete || (Website.Delete = {}));
    })(Website = ResponseMessages.Website || (ResponseMessages.Website = {}));
    let Product;
    (function (Product) {
        Product.PRODUCT_NOT_FOUND = 'Không tìm thấy sản phẩm';
        Product.NOT_VALID_PRICE = 'Giá khuyến mãi phải nhỏ hơn giá bình thường';
        Product.NO_ADD_ITEM_PERMISSION = 'Bạn không thể thêm sản phẩm của shop bạn';
        let Add;
        (function (Add) {
            Add.ADD_PRODUCT_SUCCESS = 'Thêm sản phẩm thành công';
            Add.NO_ADD_PRODUCT_PERMISSION = 'Chỉ có người bán được phép thêm sản phẩm';
        })(Add = Product.Add || (Product.Add = {}));
        let Update;
        (function (Update) {
            Update.UPDATE_PRODUCT_SUCCESS = 'Cập nhật sản phẩm thành công';
            Update.NO_UPDATE_PRODUCT_PERMISSION = 'Chỉ có người bán được phép cập nhật sản phẩm';
        })(Update = Product.Update || (Product.Update = {}));
    })(Product = ResponseMessages.Product || (ResponseMessages.Product = {}));
    let Address;
    (function (Address) {
        Address.ADDRESS_NOT_FOUND = 'Không tìm thấy địa chỉ này';
        let List;
        (function (List) {
            List.NO_POSSIBLE_ADDRESS_PERMISSION = 'Chỉ có người bán có địa chỉ có thể giao hàng';
        })(List = Address.List || (Address.List = {}));
        let Add;
        (function (Add) {
            Add.ADD_ADDRESS_SUCCESS = 'Thêm địa chỉ thành công';
            Add.NO_ADD_ADDRESS_PERMISSION = 'Chỉ có người bán được phép thêm địa chỉ có thể giao hàng';
            Add.ADDRESS_EXSIST = 'Địa chỉ đã tồn tại';
        })(Add = Address.Add || (Address.Add = {}));
        let Update;
        (function (Update) {
            Update.UPDATE_ADDRESS_SUCCESS = 'Cập nhật địa chỉ thành công';
        })(Update = Address.Update || (Address.Update = {}));
        let Delete;
        (function (Delete) {
            Delete.DELETE_ADDRESS_SUCCESS = 'Xóa địa chỉ thành công';
        })(Delete = Address.Delete || (Address.Delete = {}));
    })(Address = ResponseMessages.Address || (ResponseMessages.Address = {}));
    let Shop;
    (function (Shop) {
        Shop.SHOP_NOT_FOUND = 'Không tìm thấy thông tin shop';
        Shop.DUPLICATE_SLUG = 'Bị trùng slug với một shop khác';
        Shop.SHOP_OF_USER_NOT_FOUND = 'Không tìm thấy thông tin shop của người dùng';
        Shop.EXIST_SHOP_OF_USER = 'Bạn đã mở shop rồi';
    })(Shop = ResponseMessages.Shop || (ResponseMessages.Shop = {}));
    let Order;
    (function (Order) {
        Order.ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng';
        Order.ORDER_EMPTY = 'Giỏ hàng trống';
        Order.WRONG_STATUS = 'Trạng thái đơn hàng không đúng';
        let Add;
        (function (Add) {
            Add.ADD_ORDER_SUCCESS = 'Thêm đơn hàng thành công';
            Add.NO_ADD_ORDER_PERMISSION = 'Chỉ có chủ đơn hàng được phép thêm sản phẩm';
        })(Add = Order.Add || (Order.Add = {}));
        let Update;
        (function (Update) {
            Update.UPDATE_ORDER_SUCCESS = 'Cập nhật sản phẩm thành công';
            Update.NO_UPDATE_ORDER_PERMISSION = 'Chỉ có chủ đơn hàng được phép cập nhật sản phẩm';
        })(Update = Order.Update || (Order.Update = {}));
    })(Order = ResponseMessages.Order || (ResponseMessages.Order = {}));
    let OrderItem;
    (function (OrderItem) {
        OrderItem.ORDER_ITEM_NOT_FOUND = 'Không tìm thấy sản phẩm trong giỏ hàng';
        OrderItem.ORDER_SUBMITTED = 'Đơn hàng đã hoàn tất, không thể thay đổi thông tin được nữa';
        OrderItem.WRONG_STATUS_FLOW = 'Không thể cập nhật, trạng thái không đúng';
    })(OrderItem = ResponseMessages.OrderItem || (ResponseMessages.OrderItem = {}));
})(ResponseMessages = exports.ResponseMessages || (exports.ResponseMessages = {}));
//# sourceMappingURL=messages.js.map
