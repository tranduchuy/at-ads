const priceLevelValue = [
    [
        {value: -1, text: 'Thỏa thuận', min: null, max: null},
        {value: 1, text: '\u003c 500 triệu', min: null, max: 5e8},
        {value: 2, text: "500 - 800 triệu", min: {value: 5e8}, max: {value: 8e8}},
        {value: 3, text: '800 triệu - 1 tỷ', min: 8e8, max: 1e9},
        {value: 4, text: '1 - 2 tỷ', min: 1e9, max: 2e9},
        {value: 5, text: '2 - 3 tỷ', min: 2e9, max: 3e9},
        {value: 6, text: '3 - 5 tỷ', min: 3e9, max: 5e9},
        {value: 7, text: '5 - 7 tỷ', min: 5e9, max: 7e9},
        {value: 8, text: '7 - 10 tỷ', min: 7e9, max: 10e9},
        {value: 9, text: '10 - 20 tỷ', min: 10e9, max: 20e9},
        {value: 10, text: '20 - 30 tỷ', min: 20e9, max: 30e9},
        {value: 11, text: '\u003e 30 tỷ', min: 30e9, max: null}
    ],
    [
        {value: -1, text: 'Thỏa thuận', min: null, max: null},
        {value: 1, text: '\u003c 1 triệu', min: null, max: 1e6},
        {value: 2, text: '1 - 3 triệu', min: 1e6, max: 3e6},
        {value: 3, text: '3 - 5 triệu', min: 3e6, max: 5e6},
        {value: 4, text: '5 - 10 triệu', min: 5e6, max: 10e6},
        {value: 5, text: '10 - 40 triệu', min: 10e6, max: 40e6},
        {value: 6, text: '40 - 70 triệu', min: 40e6, max: 70e6},
        {value: 7, text: '70 - 100 triệu', min: 70e6, max: 100e6},
        {value: 8, text: '\u003e 100 triệu', min: 100e6, max: null}
    ]
];

// Formality list for buy
module.exports.cateListBuy = [
    {
        'id': 400,
        'name': 'Nhà đất cần mua',
        'children': [
            {'id': 402, 'name': 'Mua căn hộ chung cư'},
            {'id': 403, 'name': 'Mua nhà riêng'},
            {'id': 404, 'name': 'Mua nhà biệt thự, liền kề'},
            {'id': 405, 'name': 'Mua nhà mặt phố'},
            {'id': 406, 'name': 'Mua đất nền dự án'},
            {'id': 407, 'name': 'Mua đất'},
            {'id': 408, 'name': 'Mua trang trại, khu nghỉ dưỡng'},
            {'id': 409, 'name': 'Mua kho, nhà xưởng'},
            {'id': 410, 'name': 'Mua loại bất động sản khác'}
        ],
        'prices': [
            {'name': 'Thỏa thuận', 'id': '-1'},
            {'name': 'Trăm nghìn/tháng', 'id': '1'},
            {'name': 'Triệu/tháng', 'id': '2'},
            {'name': 'Trăm nghìn/m2/tháng', 'id': '5'},
            {'name': 'Triệu/m2/tháng', 'id': '6'},
            {'name': 'Nghìn/m2/tháng', 'id': '7'}
        ],
        'priceLevelValue': priceLevelValue[0],
        'brokerdomain': null
    },
    {
        'id': 401, 'name': 'Nhà đất cần thuê',
        'children': [
            {'id': 411, 'name': 'Cần thuê căn hộ chung cư'},
            {'id': 412, 'name': 'Cần thuê nhà riêng'},
            {'id': 413, 'name': 'Cần thuê nhà mặt phố'},
            {'id': 414, 'name': 'Cần thuê nhà trọ, phòng trọ'},
            {'id': 415, 'name': 'Cần thuê văn phòng'},
            {'id': 416, 'name': 'Cần thuê cửa hàng, ki ốt'},
            {'id': 417, 'name': 'Cần thuê kho, nhà xưởng, đất'},
            {'id': 418, 'name': 'Cần thuê loại bất động sản khác'}
        ],
        'prices': [
            {'name': 'Thỏa thuận', 'id': '-1'},
            {'name': 'Triệu', 'id': '1'},
            {'name': 'Tỷ', 'id': '2'},
            {'name': 'Trăm nghìn/m2', 'id': '6'},
            {'name': 'Triệu/m2', 'id': '7'}
        ],
        'priceLevelValue': priceLevelValue[1],
        'brokerdomain': null
    }];


// Formality list for sale
module.exports.cateList = [
    {
        'id': 38,
        'name': 'Nhà đất bán',
        'children': [
            {'id': 324, 'name': 'Bán căn hộ chung cư'},
            {'id': 41, 'name': 'Bán nhà riêng'},
            {'id': 325, 'name': 'Bán nhà biệt thự, liền kề'},
            {'id': 163, 'name': 'Bán nhà mặt phố'},
            {'id': 40, 'name': 'Bán đất nền dự án'},
            {'id': 283, 'name': 'Bán đất'},
            {'id': 44, 'name': 'Bán trang trại, khu nghỉ dưỡng'},
            {'id': 45, 'name': 'Bán kho, nhà xưởng'},
            {'id': 48, 'name': 'Bán loại bất động sản khác'}
        ],
        'prices': [
            {'name': 'Thỏa thuận', 'id': '-1'},
            {'name': 'Triệu', 'id': '1'},
            {'name': 'Tỷ', 'id': '2'},
            {'name': 'Trăm nghìn/m2', 'id': '6'},
            {'name': 'Triệu/m2', 'id': '7'}],
        'priceLevelValue': priceLevelValue[0],
        'brokerdomain': [
            {'id': 8, 'name': 'Bán căn hộ chung cư'},
            {'id': 7, 'name': 'Bán đất'},
            {'id': 1, 'name': 'Bán đất nền dự án'},
            {'id': 4, 'name': 'Bán kho, nhà xưởng'},
            {'id': 5, 'name': 'Bán loại bất động sản khác'},
            {'id': 9, 'name': 'Bán nhà biệt thự, liền kề'},
            {'id': 6, 'name': 'Bán nhà mặt phố'},
            {'id': 2, 'name': 'Bán nhà riêng'},
            {'id': 3, 'name': 'Bán trang trại, khu nghỉ dưỡng'}
        ]
    },
    {
        'id': 49,
        'name': 'Nhà đất cho thuê',
        'children': [
            {'id': 326, 'name': 'Cho thuê căn hộ chung cư'},
            {'id': 52, 'name': 'Cho thuê nhà riêng'},
            {'id': 51, 'name': 'Cho thuê nhà mặt phố'},
            {'id': 57, 'name': 'Cho thuê nhà trọ, phòng trọ'},
            {'id': 50, 'name': 'Cho thuê văn phòng'},
            {'id': 55, 'name': 'Cho thuê cửa hàng, ki ốt'},
            {'id': 53, 'name': 'Cho thuê kho, nhà xưởng, đất'},
            {'id': 59, 'name': 'Cho thuê loại bất động sản khác'}
        ],
        'prices': [
            {'name': 'Thỏa thuận', 'id': '-1'},
            {'name': 'Trăm nghìn/tháng', 'id': '1'},
            {'name': 'Triệu/tháng', 'id': '2'},
            {'name': 'Trăm nghìn/m2/tháng', 'id': '5'},
            {'name': 'Triệu/m2/tháng', 'id': '6'},
            {
                'name': 'Nghìn/m2/tháng', 'id': '7'
            }],
        'priceLevelValue': priceLevelValue[1],
        'brokerdomain': [
            {'id': 10, 'name': 'Cho thuê căn hộ chung cư'},
            {'id': 15, 'name': 'Cho thuê cửa hàng, ki ốt'},
            {'id': 14, 'name': 'Cho thuê kho, nhà xưởng, đất'},
            {'id': 16, 'name': 'Cho thuê loại bất động sản khác'},
            {'id': 12, 'name': 'Cho thuê nhà mặt phố'},
            {'id': 13, 'name': 'Cho thuê nhà riêng'},
            {'id': 17, 'name': 'Cho thuê nhà trọ, phòng trọ'},
            {'id': 11, 'name': 'Cho thuê văn phòng'}]
    }
];

module.exports.beds = [
    {text: 'Không xác định', value: '0'},
    {text: '1+', value: '1'},
    {text: '2+', value: '2'},
    {text: '3+', value: '3'},
    {text: '4+', value: '4'},
    {text: '5+', value: '5'}
];

module.exports.vipTypeList = [
    {'name': 'Tin thường', 'id': '5'},
    {'name': 'Tin ưu đãi', 'id': '4'},
    {'name': 'Tin Vip 3', 'id': '3'},
    {'name': 'Tin Vip 2', 'id': '2'},
    {'name': 'Tin Vip 1', 'id': '1'},
    {'name': 'Vip đặc biệt', 'id': '0'}];

module.exports.directionList = [
    {'name': 'KXĐ', 'value': '0'},
    {'name': 'Đông', 'value': '1'},
    {'name': 'Tây', 'value': '2'},
    {'name': 'Nam', 'value': '3'},
    {'name': 'Bắc', 'value': '4'},
    {'name': 'Đông-Bắc', 'value': '5'},
    {'name': 'Tây-Bắc', 'value': '6'},
    {'name': 'Tây-Nam', 'value': '7'},
    {'name': 'Đông-Nam', 'value': '8'}
];

module.exports.unitPriceList = [113.636, 47.272, 30, 14, 275, 1.2, 0];

module.exports.unitPriceListNew = [168.181, 68.181, 50, 27.272, 454.545, 1.727, 0];

module.exports.areaListValue = [
    {value: -1, text: 'Chưa xác định', min: null, max: null},
    {value: 1, text: '\u003c 30 m2', min: null, max: 30},
    {value: 2, text: '30 - 50 m2', min: 30, max: 50},
    {value: 3, text: '50 - 80 m2', min: 50, max: 80},
    {value: 4, text: '80 - 100 m2', min: 80, max: 100},
    {value: 5, text: '100 - 150 m2', min: 100, max: 150},
    {value: 6, text: '150 - 200 m2', min: 150, max: 200},
    {value: 7, text: '200 - 250 m2', min: 200, max: 250},
    {value: 8, text: '250 - 300 m2', min: 250, max: 300},
    {value: 9, text: '300 - 500 m2', min: 300, max: 500},
    {value: 10, text: '\u003e 500 m2', min: 500, max: null}
];

module.exports.cityList = require('./cities.json');