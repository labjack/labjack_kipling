
var async = require('async');
var dict = require('dict');
var q = require('q');
var driver_const = require('labjack-nodejs').driver_const;

function parseData(flashData) {
	var imgHeaderSize = driver_const.T7_IMG_HEADER_LENGTH;
	var headerBuffer = new Buffer(imgHeaderSize);
	var offset = 0;

	// Fill the buffer with data.
	for(var i = 0; i < flashData.length; i++) {
		headerBuffer.writeUInt32BE(flashData[i], offset);
		offset += 4;
	}

	// Interpret the data in the buffer.
	imageInformation = {
	    rawImageInfo: headerBuffer.slice(0, 128),
	    headerCode: headerBuffer.readUInt32BE(driver_const.HEADER_CODE),
	    intendedDevice: headerBuffer.readUInt32BE(
	        driver_const.HEADER_TARGET),
	    containedVersion: headerBuffer.readFloatBE(
	        driver_const.HEADER_VERSION).toFixed(4),
	    requiredUpgraderVersion: headerBuffer.readFloatBE(
	        driver_const.HEADER_REQ_LJSU).toFixed(4),
	    imageNumber: headerBuffer.readUInt16BE(
	        driver_const.HEADER_IMAGE_NUM),
	    numImgInFile: headerBuffer.readUInt16BE(
	        driver_const.HEADER_NUM_IMAGES),
	    startNextImg: headerBuffer.readUInt32BE(
	        driver_const.HEADER_NEXT_IMG),
	    lenOfImg: headerBuffer.readUInt32BE(driver_const.HEADER_IMG_LEN),
	    imgOffset: headerBuffer.readUInt32BE(
	        driver_const.HEADER_IMG_OFFSET),
	    numBytesInSHA: headerBuffer.readUInt32BE(
	        driver_const.HEADER_SHA_BYTE_COUNT),
	    options: headerBuffer.readUInt32BE(72),
	    encryptedSHA: headerBuffer.readUInt32BE(
	        driver_const.HEADER_ENC_SHA1),
	    unencryptedSHA: headerBuffer.readUInt32BE(
	        driver_const.HEADER_SHA1),
	    headerChecksum: headerBuffer.readUInt32BE(
	        driver_const.HEADER_CHECKSUM)
	};
	return imageInformation;
}

function getRecoveryFWVersion(device) {
	var defered = q.defer();
    var imgHeaderSize = driver_const.T7_IMG_HEADER_LENGTH;

    device.readFlash(
        driver_const.T7_EFAdd_EmerFirmwareImgInfo,
        // driver_const.T7_EFAdd_IntFirmwareImgInfo,
        // driver_const.T7_EFAdd_ExtFirmwareImgInfo,
        imgHeaderSize/4
    ).then(function(data) {
    	// Parse the data.
    	var info = parseData(data.results);
    	//Resolve to the firmware version
    	defered.resolve(parseFloat(info.containedVersion));
    }, function(err) {
    	// report fw version 0 when there is an error.
    	defered.resolve(0.0000);
    }).catch(function(err) {
    	console.error('t7GetFlashFWVersions: getRecoveryFWVersion', err);
    	defered.reject(err);
    });

	return defered.promise;
}

function getPrimaryFWVersion(device) {
	var defered = q.defer();
    var imgHeaderSize = driver_const.T7_IMG_HEADER_LENGTH;

    device.readFlash(
        // driver_const.T7_EFAdd_EmerFirmwareImgInfo,
        // driver_const.T7_EFAdd_IntFirmwareImgInfo,
        driver_const.T7_EFAdd_ExtFirmwareImgInfo,
        imgHeaderSize/4
    ).then(function(data) {
    	// Parse the data.
    	var info = parseData(data.results);

    	//Resolve to the firmware version
    	defered.resolve(parseFloat(info.containedVersion));
    }, function(err) {
    	// report fw version 0 when there is an error.
    	defered.resolve(0.0000);
    }).catch(function(err) {
    	console.error('t7GetFlashFWVersions: getPrimaryFWVersion', err);
    	defered.reject(err);
    });

	return defered.promise;
}

exports.getRecoveryFWVersion = getRecoveryFWVersion;
exports.getPrimaryFWVersion = getPrimaryFWVersion;