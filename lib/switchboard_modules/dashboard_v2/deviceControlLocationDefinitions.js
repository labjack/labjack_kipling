

function getDashboardGuiConstants(deviceTypeName, productType) {

    var STATIC_FILES_DIR = static_files.getDir();

    // Device Image Info
    this.LABJACK_OVERVIEW_IMG_SRC = 'img/' + productType + '-cartoon.png';
    this.LABJACK_OVERVIEW_IMG_SRC = STATIC_FILES_DIR + this.LABJACK_OVERVIEW_IMG_SRC;

    this.DEVICE_IMAGE_ALLOCATED_WIDTH = {
        'T7': 370,
        'T5': 505,
        'T4': 505,
    }[deviceTypeName];
    this.DEVICE_IMAGE_X_OFFSET = 150;
    this.DEVICE_IMAGE_Y_OFFSET = 10;//10
    this.DEVICE_IMG_WIDTH = 225;

    var T7_DEVICE_HEIGHT = 525;
    var T5_DEVICE_HEIGHT = 425;
    var T4_DEVICE_HEIGHT = 325;
    this.DEVICE_IMG_HEIGHT = {
        'T7': T7_DEVICE_HEIGHT,
        'T5': T5_DEVICE_HEIGHT,
        'T4': T4_DEVICE_HEIGHT,
    }[deviceTypeName];
    this.DEVICE_IMG_SPLINES_HEIGHT_MULTIPLIER = {
        'T7': 1,
        'T5': T7_DEVICE_HEIGHT/T5_DEVICE_HEIGHT,
        'T4': T7_DEVICE_HEIGHT/T4_DEVICE_HEIGHT,
    }[deviceTypeName];
    this.DEVICE_IMAGE_Y_SPLINES_OFFSET = {
        'T7': 0,
        'T5': 20,
        'T4': 40,
    }[deviceTypeName];

    this.LINE_X_OFFSET = 120;
    this.LINE_Y_OFFSET = 6;
    this.DEVICE_IMAGE_X_OVERLAP = 30;
    this.CONNECTOR_SIZE_X = this.DEVICE_IMAGE_X_OFFSET + this.DEVICE_IMAGE_X_OVERLAP;

    // this.DEVICE_IMAGE_X_OVERLAP = 55;
    this.DEVICE_RIGHT_SIDE_OFFSET = 215;
    this.DEVICE_CONNECTOR_SIZE_X = this.DEVICE_IMAGE_X_OFFSET + this.DEVICE_IMAGE_X_OVERLAP;
    this.DEVICE_BUTTON_LEFT_PADDING = 5;

    // Determines the image+lines & register's offset. Higher #'s push registers higher up
    this.DEVICE_LINE_Y_OFFSET = 4; 


    // DB Image Info
    // this.LABJACK_DB_IMG_SRC = 'img/'+deviceTypeName+'-DB-cartoon.png';
    this.LABJACK_DB_IMG_SRC = {
        'T7': 'img/'+deviceTypeName+'-DB-cartoon.png',
        'T4': 'img/'+deviceTypeName+'-DB15-cartoon.png',
        'T5': 'img/'+deviceTypeName+'-DB15-cartoon.png',
    }[deviceTypeName];

    this.LABJACK_DB_IMG_SRC = STATIC_FILES_DIR + this.LABJACK_DB_IMG_SRC;
    this.DB_IMG_WIDTH = 225;

    this.DB_ALLOCATED_HEIGHT = {
        'T7': 525,
        'T5': 260,
        'T4': 230,
    }[deviceTypeName];

    var T7_DB_HEIGHT = 525;
    var T5_DB_HEIGHT = 180;
    var T4_DB_HEIGHT = 180;
    this.DB_IMG_HEIGHT = {
        'T7': T7_DB_HEIGHT,
        'T5': T5_DB_HEIGHT,
        'T4': T4_DB_HEIGHT,
    }[deviceTypeName];

    this.DB_IMG_SPLINES_HEIGHT_MULTIPLIER = {
        'T7': 1,
        'T5': T7_DB_HEIGHT/T5_DB_HEIGHT,
        'T4': T7_DB_HEIGHT/T4_DB_HEIGHT,
    }[deviceTypeName];

    this.DB_IMAGE_Y_SPLINES_OFFSET = {
        'T7': 0,
        'T5': 20,
        'T4': 20,
    }[deviceTypeName];

    this.DB_IMAGE_X_OFFSET = 110;
    this.DB_IMAGE_Y_OFFSET = {
        'T7': 0,
        'T5': 80,
        'T4': 50,
    }[deviceTypeName];
    this.DB_LINE_X_OFFSET = this.DB_IMAGE_X_OFFSET + 10;
    this.DB_IMAGE_X_OVERLAP = 55; // 55
    this.DB_RIGHT_SIDE_OFFSET = 155;
    this.DB_CONNECTOR_SIZE_X = this.DB_IMAGE_X_OFFSET + this.DB_IMAGE_X_OVERLAP; // 110 + 55 = 165
    this.DB_BUTTON_LEFT_PADDING = 5;
    this.DB_LINE_Y_OFFSET = 1;


    var bNum = 10;
    var DEV_OFF = -0.017;

    this.REGISTER_OVERLAY_SPEC = [];
    this.AIN_NUM_DIGITS_PRECISION = 6;
    if(deviceTypeName === 'T7') {
        this.AIN_NUM_DIGITS_PRECISION = 6;
        this.REGISTER_OVERLAY_SPEC = [
            {register: 'AIN0', yLocation: 0.783-DEV_OFF,    yShift: -7,         yOffset: 6,         yOverlayOffset: 7,    type: null, board: 'device', side: 'left'},
            {register: 'AIN1', yLocation: 0.757-DEV_OFF,    yShift: -6,         yOffset: 6,         yOverlayOffset: 7,    type: null, board: 'device', side: 'left'},
            {register: 'AIN2', yLocation: 0.664-DEV_OFF,    yShift: -5,         yOffset: 6,         yOverlayOffset: 8,    type: null, board: 'device', side: 'left'},
            {register: 'AIN3', yLocation: 0.639-DEV_OFF,    yShift: -4,         yOffset: 6,         yOverlayOffset: 8,    type: null, board: 'device', side: 'left'},
            {register: 'DAC0', yLocation: 0.545-DEV_OFF,    yShift: -2,         yOffset: 6,         yOverlayOffset: 10,   type: 'dac', board: 'device', side: 'left'},
            {register: 'DAC1', yLocation: 0.519-DEV_OFF,    yShift: -1,         yOffset: -6,        yOverlayOffset: 10,   type: 'dac', board: 'device', side: 'left'},
            {register: 'FIO0', yLocation: 0.428-DEV_OFF,    yShift: 0,          yOffset: 6,         yOverlayOffset:  12,  type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO1', yLocation: 0.400-DEV_OFF,    yShift: 1,          yOffset: -6,        yOverlayOffset:  12,  type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO2', yLocation: 0.308-DEV_OFF,    yShift: 3.5,        yOffset: 6,         yOverlayOffset:  15,  type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO3', yLocation: 0.280-DEV_OFF,    yShift: 4,          yOffset: -6,        yOverlayOffset:  15,  type: 'dio', board: 'device', side: 'left'},
            
            // Left Side, DB37
            {register: 'AIN1', yLocation: 0.900-0.01,       yOffset:  4*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN3', yLocation: 0.875-0.01,       yOffset:  3*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN5', yLocation: 0.850-0.01,       yOffset:  2*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN7', yLocation: 0.825-0.01,       yOffset:  1*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN9', yLocation: 0.800-0.01,       yOffset:  0*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN11', yLocation: 0.775-0.01,      yOffset: -1*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'AIN13', yLocation: 0.750-0.01,      yOffset: -2*bNum,   type: null,  board: 'connector', side: 'left'},
            {register: 'DAC0', yLocation: 0.725-0.01,       yOffset: -3*bNum,   type: 'dac', board: 'connector', side: 'left'},
            {register: 'MIO1', yLocation: 0.625-0.015,      yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'FIO0', yLocation: 0.600-0.015,      yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'FIO2', yLocation: 0.575-0.015,      yOffset: -2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'FIO4', yLocation: 0.550-0.015,      yOffset: -3*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'FIO6', yLocation: 0.525-0.015,      yOffset: -4*bNum,   type: 'dio', board: 'connector', side: 'left'},
            
            // Left Side, DB15
            {register: 'EIO6', yLocation: 0.275+0.028,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO4', yLocation: 0.250+0.024,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO2', yLocation: 0.225+0.020,      yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO0', yLocation: 0.200+0.017,      yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'CIO3', yLocation: 0.175+0.014,      yOffset: -2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'CIO1', yLocation: 0.150+0.010,      yOffset: -3*bNum,   type: 'dio', board: 'connector', side: 'left'},
            
            // Right Side, DB37
            {register: 'AIN0', yLocation: 0.900 + 0.005,    yOffset:  4*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN2', yLocation: 0.875 + 0.005,    yOffset:  3*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN4', yLocation: 0.850 + 0.005,    yOffset:  2*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN6', yLocation: 0.825 + 0.005,    yOffset:  1*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN8', yLocation: 0.800 + 0.003,    yOffset:  0*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN10', yLocation: 0.775 + 0.003,   yOffset: -1*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'AIN12', yLocation: 0.750 + 0.003,   yOffset: -2*bNum,   type: null,  board: 'connector', side: 'right'},
            {register: 'DAC1', yLocation: 0.700,            yOffset: -1.5*bNum, type: 'dac', board: 'connector', side: 'right'},
            {register: 'MIO2', yLocation: 0.625,            yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'MIO0', yLocation: 0.600,            yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'FIO1', yLocation: 0.575,            yOffset: -2*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'FIO3', yLocation: 0.550,            yOffset: -3*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'FIO5', yLocation: 0.525,            yOffset: -4*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'FIO7', yLocation: 0.500,            yOffset: -5*bNum,   type: 'dio', board: 'connector', side: 'right'},
            
            // Right Side, DB15
            {register: 'EIO7', yLocation: 0.300+0.014,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO5', yLocation: 0.275+0.012,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO3', yLocation: 0.250+0.010,      yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO1', yLocation: 0.225+0.009,      yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'CIO2', yLocation: 0.170+0.006,      yOffset: -0.5*bNum, type: 'dio', board: 'connector', side: 'right'},
            {register: 'CIO0', yLocation: 0.145+0.002,      yOffset: -1.5*bNum, type: 'dio', board: 'connector', side: 'right'}
        ];
    } else if(deviceTypeName === 'T4') {
        this.AIN_NUM_DIGITS_PRECISION = 3;
        this.REGISTER_OVERLAY_SPEC = [
            // Left Side, Device
            {register: 'FIO4', yLocation: 0.510-DEV_OFF,    yShift: -2,         yOffset: 6,         yOverlayOffset:  10,     type: 'flex', board: 'device', side: 'left'},
            {register: 'FIO5', yLocation: 0.484-DEV_OFF,    yShift: -1,         yOffset: -6,        yOverlayOffset:  10,     type: 'flex', board: 'device', side: 'left'},
            {register: 'FIO6', yLocation: 0.403-DEV_OFF,    yShift: 0,          yOffset: 6,         yOverlayOffset:  12,     type: 'flex', board: 'device', side: 'left'},
            {register: 'FIO7', yLocation: 0.375-DEV_OFF,    yShift: 1,          yOffset: -6,        yOverlayOffset:  12,     type: 'flex', board: 'device', side: 'left'},

            // Right Side, Device
            {register: 'AIN1', yLocation: 0.555-DEV_OFF,    yShift: -2,         yOffset: 6,         yOverlayOffset: 10,      type: null, board: 'device', side: 'right'},
            {register: 'AIN0', yLocation: 0.529-DEV_OFF,    yShift: -1,         yOffset: -6,        yOverlayOffset: 10,      type: null, board: 'device', side: 'right'},
            {register: 'AIN3', yLocation: 0.443-DEV_OFF,    yShift: 0,          yOffset: 6,         yOverlayOffset: 12,      type: null, board: 'device', side: 'right'},
            {register: 'AIN2', yLocation: 0.415-DEV_OFF,    yShift: 1,          yOffset: -6,        yOverlayOffset: 12,      type: null, board: 'device', side: 'right'},
            {register: 'DAC1', yLocation: 0.337-DEV_OFF,    yShift: 3.5,        yOffset: 6,         yOverlayOffset: 15,      type: 'dac', board: 'device', side: 'right'},
            {register: 'DAC0', yLocation: 0.310-DEV_OFF,    yShift: 4,          yOffset: -6,        yOverlayOffset: 15,      type: 'dac', board: 'device', side: 'right'},
            
            // Left Side, DB15
            {register: 'EIO6', yLocation: 0.275+0.028,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO4', yLocation: 0.250+0.025,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO2', yLocation: 0.225+0.020,      yOffset:  0*bNum,   type: 'flex', board: 'connector', side: 'left'},
            {register: 'EIO0', yLocation: 0.197+0.020,      yOffset: -1*bNum,   type: 'flex', board: 'connector', side: 'left'},
            {register: 'CIO3', yLocation: 0.170+0.019,      yOffset: -2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'CIO1', yLocation: 0.140+0.020,      yOffset: -3*bNum,   type: 'dio', board: 'connector', side: 'left'},
            
            // Right Side, DB15
            {register: 'EIO7', yLocation: 0.300+0.015,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO5', yLocation: 0.275+0.010,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO3', yLocation: 0.248+0.010,      yOffset:  0*bNum,   type: 'flex', board: 'connector', side: 'right'},
            {register: 'EIO1', yLocation: 0.222+0.006,      yOffset: -1*bNum,   type: 'flex', board: 'connector', side: 'right'},
            {register: 'CIO2', yLocation: 0.165+0.006,      yOffset: -0.5*bNum, type: 'dio', board: 'connector', side: 'right'},
            {register: 'CIO0', yLocation: 0.135+0.007,      yOffset: -1.5*bNum, type: 'dio', board: 'connector', side: 'right'}
        ];
    } else if(deviceTypeName === 'T5') {
        this.AIN_NUM_DIGITS_PRECISION = 6;
        this.REGISTER_OVERLAY_SPEC = [
            // Left Side, Device
            {register: 'DAC0', yLocation: 0.622-DEV_OFF,    yShift: -5,         yOffset: 6,         yOverlayOffset: 8,       type: 'dac', board: 'device', side: 'left'},
            {register: 'DAC1', yLocation: 0.597-DEV_OFF,    yShift: -4,         yOffset: -6,         yOverlayOffset: 8,      type: 'dac', board: 'device', side: 'left'},
            {register: 'FIO0', yLocation: 0.512-DEV_OFF,    yShift: -2,         yOffset: 6,         yOverlayOffset:  10,     type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO1', yLocation: 0.486-DEV_OFF,    yShift: -1,         yOffset: -6,        yOverlayOffset:  10,     type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO2', yLocation: 0.405-DEV_OFF,    yShift: 0,          yOffset: 6,         yOverlayOffset:  12,     type: 'dio', board: 'device', side: 'left'},
            {register: 'FIO3', yLocation: 0.382-DEV_OFF,    yShift: 1,          yOffset: -6,        yOverlayOffset:  12,     type: 'dio', board: 'device', side: 'left'},
            

            // Right Side, Device
            {register: 'AIN1', yLocation: 0.667-DEV_OFF,    yShift: -5,         yOffset: 6,         yOverlayOffset: 8,       type: null, board: 'device', side: 'right'},
            {register: 'AIN0', yLocation: 0.642-DEV_OFF,    yShift: -4,         yOffset: -6,         yOverlayOffset: 8,      type: null, board: 'device', side: 'right'},
            {register: 'AIN3', yLocation: 0.558-DEV_OFF,    yShift: -2,         yOffset: 6,         yOverlayOffset: 10,      type: null, board: 'device', side: 'right'},
            {register: 'AIN2', yLocation: 0.532-DEV_OFF,    yShift: -1,         yOffset: -6,        yOverlayOffset: 10,      type: null, board: 'device', side: 'right'},
            {register: 'AIN5', yLocation: 0.453-DEV_OFF,    yShift: 0,          yOffset: 6,         yOverlayOffset: 12,      type: null, board: 'device', side: 'right'},
            {register: 'AIN4', yLocation: 0.425-DEV_OFF,    yShift: 1,          yOffset: -6,        yOverlayOffset: 12,      type: null, board: 'device', side: 'right'},
            {register: 'AIN7', yLocation: 0.342-DEV_OFF,    yShift: 3.5,        yOffset: 6,         yOverlayOffset: 15,      type: null, board: 'device', side: 'right'},
            {register: 'AIN6', yLocation: 0.315-DEV_OFF,    yShift: 4,          yOffset: -6,        yOverlayOffset: 15,      type: null, board: 'device', side: 'right'},
            
            // Left Side, DB15
            {register: 'EIO6', yLocation: 0.275+0.020,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO4', yLocation: 0.250+0.020,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO2', yLocation: 0.225+0.020,      yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'EIO0', yLocation: 0.197+0.020,      yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'CIO3', yLocation: 0.170+0.020,      yOffset: -2*bNum,   type: 'dio', board: 'connector', side: 'left'},
            {register: 'CIO1', yLocation: 0.140+0.020,      yOffset: -3*bNum,   type: 'dio', board: 'connector', side: 'left'},
            
            // Right Side, DB15
            {register: 'EIO7', yLocation: 0.300+0.010,      yOffset:  2*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO5', yLocation: 0.275+0.010,      yOffset:  1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO3', yLocation: 0.248+0.010,      yOffset:  0*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'EIO1', yLocation: 0.222+0.010,      yOffset: -1*bNum,   type: 'dio', board: 'connector', side: 'right'},
            {register: 'CIO2', yLocation: 0.165+0.010,      yOffset: -0.5*bNum, type: 'dio', board: 'connector', side: 'right'},
            {register: 'CIO0', yLocation: 0.135+0.010,      yOffset: -1.5*bNum, type: 'dio', board: 'connector', side: 'right'}
        ];
    }

    var self = this;
    this.getRegisterType = function(registerName, debug) {
        var type = 'none';
        var foundMatch = false;
        self.REGISTER_OVERLAY_SPEC.some(function(spec) {
            if(spec.register.indexOf(registerName) >= 0) {
                type = spec.type;
                if(typeof(type) !== 'string') {
                    type = 'ain';
                }
                foundMatch = true;
                if(debug) {
                    console.log('Found Match!', registerName);
                }
                return true;
            } else {
                return false;
            }
        });
        if(!foundMatch) {
            if(debug) {
                console.log('no match found', registerName, self.REGISTER_OVERLAY_SPEC);
            }
        }
        return type;
    };

    this.parseAINVal = function(value) {
        var numDigits = self.AIN_NUM_DIGITS_PRECISION;
        return Number(value).toFixed(numDigits);
    };

}