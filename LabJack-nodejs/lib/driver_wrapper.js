/**
 * Low level LJM dynamic library interface as provided by ffi.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
 */



var ref = require('ref');       //Load variable type module
var fs = require('fs');         //Load File System module
var jsonConstants = require('ljswitchboard-modbus_map');
var driver_const = require('ljswitchboard-ljm_driver_constants');

var ljm;

// Require the ljm-ffi library.
var ljm_ffi = require('ljm-ffi');

// Link to the ljm shared library (.so, .dylib, .dll)
ljm = ljm_ffi.loadRaw();

exports.getDriver = function() {
    return ljm;
};
exports.getConstants = function() {
    return jsonConstants.getConstants();
};
exports.parseRegisterNameString = function (name) {
    return parseRegisterNameString(name);
};

/*
LJM_SEND_RECEIVE_TIMEOUT_MS
LJM_OPEN_TCP_DEVICE_TIMEOUT_MS
LJM_LOG_MODE
LJM_LOG_LEVEL
LJM_LIBRARY_VERSION
LJM_ALLOWS_AUTO_MULTIPLE_FEEDBACKS
LJM_ALLOWS_AUTO_CONDENSE_ADDRESSES
LJM_OPEN_MODE
LJM_NAME_CONSTANTS_FILE
LJM_ERROR_CONSTANTS_FILE
LJM_LOG_FILE
LJM_CONSTANTS_FILE
LJM_MAX_LOG_FILE_SIZE
LJM_STREAM_TRANSFERS_PER_SECOND
LJM_RETRY_ON_TRANSACTION_ID_MISMATCH
*/
