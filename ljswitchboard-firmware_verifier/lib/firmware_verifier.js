

var driver_const = require('ljswitchboard-ljm_driver_constants');
var q = require('q');

var parseFirmwareFile = function(parsedData, fileData) {
    var imageFile = new Buffer(fileData);

    try {
        
        var T7_IMG_HEADER_LENGTH = driver_const.T7_IMG_HEADER_LENGTH;
        var HEADER_CODE = driver_const.HEADER_CODE;
        var HEADER_TARGET = driver_const.HEADER_TARGET;
        var HEADER_VERSION = driver_const.HEADER_VERSION;
        var HEADER_REQ_LJSU = driver_const.HEADER_REQ_LJSU;
        var HEADER_IMAGE_NUM = driver_const.HEADER_IMAGE_NUM;
        var HEADER_NUM_IMAGES = driver_const.HEADER_NUM_IMAGES;
        var HEADER_NEXT_IMG = driver_const.HEADER_NEXT_IMG;
        var HEADER_IMG_LEN = driver_const.HEADER_IMG_LEN;
        var HEADER_IMG_OFFSET = driver_const.HEADER_IMG_OFFSET;
        var HEADER_SHA_BYTE_COUNT = driver_const.HEADER_SHA_BYTE_COUNT;
        var HEADER_ENC_SHA1 = driver_const.HEADER_ENC_SHA1;
        var HEADER_SHA1 = driver_const.HEADER_SHA1;
        var HEADER_CHECKSUM = driver_const.HEADER_CHECKSUM;

        if(imageFile.length > 128) {
            parsedData.rawImageInfo = imageFile.slice(0, T7_IMG_HEADER_LENGTH);
            parsedData.headerCode = imageFile.readUInt32BE(HEADER_CODE);
            parsedData.intendedDevice = imageFile.readUInt32BE(HEADER_TARGET);
            parsedData.containedVersion = imageFile.readFloatBE(HEADER_VERSION).toFixed(4);
            parsedData.requiredUpgraderVersion = imageFile.readFloatBE(HEADER_REQ_LJSU).toFixed(4);
            parsedData.imageNumber = imageFile.readUInt16BE(HEADER_IMAGE_NUM);
            parsedData.numImgInFile = imageFile.readUInt16BE(HEADER_NUM_IMAGES);
            parsedData.startNextImg = imageFile.readUInt32BE(HEADER_NEXT_IMG);
            parsedData.lenOfImg = imageFile.readUInt32BE(HEADER_IMG_LEN);
            parsedData.imgOffset = imageFile.readUInt32BE(HEADER_IMG_OFFSET);
            parsedData.numBytesInSHA = imageFile.readUInt32BE(HEADER_SHA_BYTE_COUNT);
            parsedData.options = imageFile.readUInt32BE(72);
            parsedData.encryptedSHA = imageFile.readUInt32BE(HEADER_ENC_SHA1);
            parsedData.unencryptedSHA = imageFile.readUInt32BE(HEADER_SHA1);
            parsedData.headerChecksum = imageFile.readUInt32BE(HEADER_CHECKSUM);

            parsedData.isValid = true;
        }

    } catch (e) {
        parsedData.isValid = false;
        parsedData.message = 'Binary file\'s header is invalid.';
    }
    return parsedData;
};

var ALLOWED_IMAGE_INFO_DEVICE_TYPES = [
    driver_const.T7_TARGET_OLD,
    driver_const.T7_TARGET
];
var validateParsedData = function(parsedData, fileData, options) {
    if(parsedData.isValid) {
        var expectedHeaderCode = driver_const.T7_HEAD_FIRST_FOUR_BYTES;

        var headerCodeCorrect = parsedData.headerCode == expectedHeaderCode;

        var intendedDeviceCorrect = ALLOWED_IMAGE_INFO_DEVICE_TYPES.indexOf(
            parsedData.intendedDevice) != -1;

        var versionCorrect = parsedData.containedVersion === options.version;

        if (headerCodeCorrect && intendedDeviceCorrect && versionCorrect) {
            parsedData.isValid = true;
        } else {
            if (!headerCodeCorrect) {
                parsedData.isValid = false;
                parsedData.message = 'Invalid header code.';
            } else if (!intendedDeviceCorrect) {
                parsedData.isValid = false;
                parsedData.message = 'Incorrect device type.';
            } else {
                parsedData.isValid = false;
                parsedData.message = 'Incorrect version.';
            }
        }
    }
    return parsedData;
};
exports.validateFirmwareFile = function(fileData, options) {
    var defered = q.defer();
    var parsedData = {
        'rawImageInfo': undefined,
        'headerCode': undefined,
        'intendedDevice': undefined,
        'containedVersion': undefined,
        'requiredUpgraderVersion': undefined,
        'imageNumber': undefined,
        'numImgInFile': undefined,
        'startNextImg': undefined,
        'lenOfImg': undefined,
        'imgOffset': undefined,
        'numBytesInSHA': undefined,
        'options': undefined,
        'encryptedSHA': undefined,
        'unencryptedSHA': undefined,
        'headerChecksum': undefined,
        'isValid': false,
        'message': '',
    };

    try {
        parseFirmwareFile(parsedData, fileData);
        validateParsedData(parsedData, fileData, options);
        defered.resolve(parsedData);
    } catch(err) {
        parsedData.message = JSON.stringify(err);
        console.log('Error...', err);
        defered.resolve(parsedData);
    }
    return defered.promise;
};
