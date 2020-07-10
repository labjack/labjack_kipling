var LABJACK_OVERVIEW_IMG_SRC = 'https://raw.githubusercontent.com/Samnsparky/ljswitchboard/master/src/static/img/T7-cartoon.png';
var DEVICE_IMAGE_X_OFFSET = 150;
var DEVICE_IMAGE_Y_OFFSET = 10;
var DEVICE_IMG_WIDTH = 225;
var DEVICE_IMG_HEIGHT = 525;
var LINE_X_OFFSET = 100;
var LINE_Y_OFFSET = 6;
var DEVICE_IMAGE_X_OVERLAP = 30;
var CONNECTOR_SIZE_X = DEVICE_IMAGE_X_OFFSET + DEVICE_IMAGE_X_OVERLAP;

var REGISTER_DISPLAY_ID_TEMPLATE = Handlebars.compile('#{{register}}-display');
var TRANSLATE_TEMPLATE = Handlebars.compile('translate({{x}},{{y}})');

var REGISTER_OVERLAY_SPEC = [
    {register: 'AIN0', yLocation: 0.783, type: null, board: 'device', side: 'left'},
    {register: 'AIN1', yLocation: 0.757, type: null, board: 'device', side: 'left'},
    {register: 'AIN2', yLocation: 0.664, type: null, board: 'device', side: 'left'},
    {register: 'AIN3', yLocation: 0.639, type: null, board: 'device', side: 'left'},
    {register: 'DAC0', yLocation: 0.545, type: 'dac', board: 'device', side: 'left'},
    {register: 'DAC1', yLocation: 0.519, type: 'dac', board: 'device', side: 'left'},
    {register: 'FIO0', yLocation: 0.426, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO1', yLocation: 0.403, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO2', yLocation: 0.308, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO3', yLocation: 0.283, type: 'fio', board: 'device', side: 'left'},
    {register: 'AIN1', yLocation: 0.900-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN3', yLocation: 0.875-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN5', yLocation: 0.850-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN7', yLocation: 0.825-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN9', yLocation: 0.800-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN11', yLocation: 0.775-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN13', yLocation: 0.750-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'DAC0', yLocation: 0.725-0.01, type: 'dac', board: 'connector', side: 'left'},
    {register: 'MIO1', yLocation: 0.625-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO0', yLocation: 0.600-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO2', yLocation: 0.575-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO4', yLocation: 0.550-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO6', yLocation: 0.525-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO6', yLocation: 0.275+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO4', yLocation: 0.250+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO2', yLocation: 0.225+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO0', yLocation: 0.200+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'CIO1', yLocation: 0.175+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'CIO3', yLocation: 0.150+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'AIN0', yLocation: 0.900 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN2', yLocation: 0.875 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN4', yLocation: 0.850 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN6', yLocation: 0.825 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN8', yLocation: 0.800 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'AIN10', yLocation: 0.775 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'AIN12', yLocation: 0.750 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'DAC1', yLocation: 0.700, type: 'dac', board: 'connector', side: 'right'},
    {register: 'MIO2', yLocation: 0.625, type: 'dac', board: 'connector', side: 'right'},
    {register: 'MIO0', yLocation: 0.600, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO1', yLocation: 0.575, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO3', yLocation: 0.550, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO5', yLocation: 0.525, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO7', yLocation: 0.500, type: 'dac', board: 'connector', side: 'right'},
    {register: 'EIO7', yLocation: 0.300+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO5', yLocation: 0.275+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO3', yLocation: 0.250+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO1', yLocation: 0.225+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'CIO2', yLocation: 0.175+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'CIO0', yLocation: 0.150+0.010, type: 'fio', board: 'connector', side: 'right'}
];


var getOverlayYPos = function (registerInfo) {
    var yFromTopOfImage = registerInfo.yLocation * DEVICE_IMG_HEIGHT;
    return DEVICE_IMAGE_Y_OFFSET + yFromTopOfImage;
};


var getOverlayYPosWithPx = function (registerInfo) {
    return getOverlayYPos(registerInfo) + 'px';
}


var drawDevice = function () {
    // Add the image to the DIV containing the device visualization
    var image = d3.select('#device-display-container-svg')
    .append('image')
    .attr('xlink:href', LABJACK_OVERVIEW_IMG_SRC)
    .attr('x', DEVICE_IMAGE_X_OFFSET)
    .attr('y', DEVICE_IMAGE_Y_OFFSET)
    .attr('width', DEVICE_IMG_WIDTH)
    .attr('height', DEVICE_IMG_HEIGHT);
    
    var lineGroup = d3.select('#device-display-container-svg')
    .selectAll('.connector-line')
    .data(function () {
        return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {
            return registerInfo.board === 'device';
        });
    })
    .enter()
    .append('g')
    .attr('transform', function (registerInfo) {
        var y = getOverlayYPos(registerInfo);
        return TRANSLATE_TEMPLATE({x: 0, y: y});
    });
    
    lineGroup.append('line')
    .attr('x1', LINE_X_OFFSET)
    .attr('y1', 0)
    .attr('x2', CONNECTOR_SIZE_X)
    .attr('y2', 0)
    .attr('stroke', 'white')
    .attr('stroke-width', 3);
    
    lineGroup.append('line')
    .attr('x1', LINE_X_OFFSET)
    .attr('y1', 0)
    .attr('x2', CONNECTOR_SIZE_X)
    .attr('y2', 0)
    .attr('stroke', 'black')
    .attr('stroke-width', 1);

    // Create a DIV for each of the registers for the main device
    var overlays = d3.select('#device-display-container')
    .selectAll('.register-overlay')
    .data(function () {
        return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {
            return registerInfo.board === 'device';
        });
    })
    .enter()
    .append('div')
    .attr('class', 'register-overlay')
    .style('top', getOverlayYPosWithPx);

    overlays.append('span')
    .attr('id', function (registerInfo) {
        return REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
    })
    .html(function (registerInfo, i) {
        return i;
    });
};


drawDevice();
