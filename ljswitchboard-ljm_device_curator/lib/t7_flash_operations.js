var async = require('async');
var q = require('q');
var semver = require('semver');

var driver_const = null;
exports.setDriverConst = function(driver_constants) {
    driver_const = driver_constants;
};

/**
 * Reject a deferred / promise because of an error.
 *
 * @param {q.deferred} deferred The deferred whose promise should be rejected.
 * @param {Object} error Error object optionally with a retError attribute. If
 *      there is a retError attribute on the provided error object, that
 *      retError will be the reported value of the error. Otherwise the error's
 *      toString method will be used.
 * @param {String} prefix Optional string that will be prepended to the error
 *      message the provided deferred execution / promise will be rejected with.
 *      If not provided, the error number / message provided by the error's
 *      retError or toString method will be used.
**/
function safelyReject (deferred, error, prefix) {
    var errorMsg;
    if (isNaN(error)) {
        if (error.retError === undefined) {
            errorMsg = error.toString();
        } else {
            errorMsg = error.retError.toString();
        }

        if (prefix === undefined) {
            deferred.reject(errorMsg);
        } else {
            deferred.reject(prefix + errorMsg);
        }
    } else {
        deferred.reject(error);
    }
}

/**
 * Create a closure over a deferred execution for error handling.
 *
 * Creates a closure that, when executed with an error, will reject the provided
 * deferred execution / promise. The returned function should be called with
 * a single parameter: an error. This error object can optionally have with a
 * retError attribute. If there is a retError attribute on the provided error
 * object, that retError will be the reported value of the error. Otherwise the
 * error's toString method will be used.
 *
 * @param {q.deferred} deferred The deferred execution / promise to reject when
 *      the resulting function is called.
 * @return {function} Closure over the provided deferred. This funciton will
 *      take a single error parameter and reject the provided deferred / promise
 *      when executed.
**/
function createSafeReject (deferred) {
    return function (error) {
        return safelyReject(deferred, error);
    };
}

/**
 * Execute a read or write operation on a device's flash memory.
 *
 * As writing / reading flash is both hard and has some overlap between the read
 * and write operation, this convenience function handles flash memory keys as
 * well as address calculation and actual driver call generation.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the flash memory operation on.
 * @param {Number} startAddress The starting address where the flash operation
 *      (read or write) should start.
 * @param {Number} lengthInts The size of the data to read or write. This should
 *      be reported in number of integers (4 byte pieces).
 * @param {Number} sizeInts The size of the block to read or write. Should be
 *      specific to the region of flash memory being operated on.
 * @param {Number} ptrAddress The memory pointer modbus address to use to index
 *      into the desired section of flash memory. Should be a constant like
 *      T7_MA_EXF_pREAD. This is a modbus address not a flash address.
 * @param {Number} flashAddress The memory modbus address to index into to get
 *      to the desired sectin of flash memory. Should be a constants like
 *      T7_MA_EXF_READ. This is a modbus address not a flash address.
 * @param {bool} isReadOp Indicate if this is a read operation. If false, this
 *      is a write operation.
 * @param {Number} key The key specific to the section of flash memory used to
 *      authorize / validate this memory operation. Should be a constant.
 * @param {Buffer} data If a write operation, this is the data to write to the
 *      flash memory. Does not need to be provided if a read operation.
 * @param {q.promise} A promise that resolves when the operation finishes or
 *      rejects in case of error. Will resolve to the data written or the the
 *      data read.
**/
var createFlashOperation = function (bundle, startAddress, lengthInts, sizeInts,
    ptrAddress, flashAddress, isReadOp, key, data)
{
    var deferred = q.defer();
    var device = bundle.getDevice();
    
    // Creates a closure over a rw excutiong with an address and size
    var createExecution = function(address, innerSize, writeValues)
    {
        return function (lastResults) {
            var innerDeferred = q.defer();

            var addresses = [];
            var values = [];
            var directions = [];
            var numFrames;
            var numValues;

            // Flash memory pointer
            directions.push(driver_const.LJM_WRITE);

            // Key
            if (key === undefined) {
                numFrames = 2;
                numValues = [1];
            } else {
                // Write for key
                directions.push(driver_const.LJM_WRITE);
                addresses.push(driver_const.T7_MA_EXF_KEY);
                values.push(key);
                numFrames = 3;
                numValues = [1, 1];
            }

            if (isReadOp)
                directions.push(driver_const.LJM_READ);
            else
                directions.push(driver_const.LJM_WRITE);

            addresses.push(ptrAddress);
            values.push(address);
            addresses.push(flashAddress);

            if (isReadOp) {
                for (var i=0; i<innerSize; i++) {
                    values.push(null);
                }
            } else {
                values.push.apply(values, writeValues);
            }

            numValues.push(innerSize);
            device.rwMany(
                addresses,
                directions,
                numValues,
                values,
                // createSafeReject(innerDeferred),
                function(err) {
                    // console.log('tseries_upgrade: calling rwMany', isReadOp, addresses, directions, numValues, values);
                    // console.log('tseries_upgrade: rwMany Error', err);
                    // console.log('Throwing Upgrade Error', err);
                    if(!isReadOp) {
                        // console.log('Failed to write flash data', addresses, numValues, values, err);
                    }
                    var callFunc = createSafeReject(innerDeferred);
                    callFunc(err);
                },
                function (newResults) {
                    if(!isReadOp) {
                        // console.log('Successfully wrote flash data', addresses, numValues, values);
                    }
                    lastResults.push.apply(lastResults, newResults);
                    innerDeferred.resolve(lastResults);
                }
            );

            return innerDeferred.promise;
        };
    };

    var getdata = function (imageBuffer, numIntegers, offset) {
        var retArray = [];
        for (var i=0; i<numIntegers; i++) {
            retArray.push(imageBuffer.readUInt32BE(i*4 + offset));
        }
        return retArray;
    };

    var executeOperations = [];
    var size = sizeInts;
    var length = lengthInts;
    var numIterations = Math.floor(length / size);
    var remainder = length % size;
    var shouldAugment = remainder > 0;
    var currentAddress = startAddress;
    var offset = 0;
    var execution;

    for (var i = 0; i<numIterations; i++)
    {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                size
            );
        } else {
            execution = createExecution(
                currentAddress,
                size,
                getdata(
                    data,
                    8, // 8 integer max for each rw op.
                    offset
                )
            );
        }
        executeOperations.push(execution);
        currentAddress += size * 4; // 4 bytes per integer written
        offset += 32; // 4 bytes per integer * 8 integers written
    }

    if (shouldAugment && remainder > 0) {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                remainder
            );
        } else {
            execution = createExecution(
                currentAddress,
                remainder,
                getdata(
                    data,
                    remainder,
                    offset
                )
            );
        }
        executeOperations.push(execution);
    }

    var numIntsWritten = 0;

    async.reduce(
        executeOperations,
        [],
        function (lastMemoryResult, currentExecution, callback) {
            numIntsWritten += sizeInts;
            currentExecution(lastMemoryResult).then(
                function (newMemory){
                    callback(null, newMemory);
                },
                function (err) {
                    callback(err, null);
                }
            );
        },
        function (err, allMemoryRead) {
            bundle.results = allMemoryRead;
            if (err) {
                safelyReject(deferred, err);
            } else {
                deferred.resolve(bundle);
            }
        }
    );

    return deferred.promise;
};

/**
 * Reads desired flash memory region from the device.
 *
 * @param {DeviceFirwareBundle} bundle The bundle with the device to read from.
 * @param {Number} startAddress The address to start reading at.
 * @param {Number} length Number of integers to read.
**/
exports.readFlash = function(device, startAddress, length)
{
    var readPtrAddress = driver_const.T7_MA_EXF_pREAD;
    var readFlashAddress = driver_const.T7_MA_EXF_READ;
    var bundle = {};
    bundle.getDevice = function() {
        return device;
    };
    var size = driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
    
    var flashDefered = q.defer();
    createFlashOperation(
        bundle,
        startAddress,
        length,
        size,
        readPtrAddress,
        readFlashAddress,
        true
    ).then(function(bundle) {
        flashDefered.resolve(bundle);
    }, function(err) {
        flashDefered.reject(err);
    });
    return flashDefered.promise;
};

/**
 * Creates a new flash operation that writes data to flash with a key.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to write to.
 * @param {Number} startAddress The flash memory address to start writing at.
 * @param {Number} length The number of 4 byte values (integers) to write. This
 *      could be the size of the firmware image file to write for example.
 * @param {Number} size The full block size to write. This could be the flash
 *      block write size for eaxmple.
 * @param {Number} key The key that is provides access to the flash memory. This
 *      is specific to the region of flash being written.
 * @param {Buffer} data The data to write to flash at the given address.  Can also be an array of integers.
 * @param {q.promise} Promise that resolves after the flash write operation
 *      finishes successfully or fails due to error (will reject on error).
**/
exports.writeFlash = function(device, startAddress, length, size, key, data) {
    // console.log('writing flash...',
    //     startAddress,
    //     length,
    //     size,
    //     key,
    //     data
    // );
    var bufferData;
    if(Buffer.isBuffer(data)) {
        bufferData = data;
    } else {
        // Assume the data object is an array of unsigned integer (uint32) sized numbers.
        bufferData = Buffer.alloc(data.length*4);
        var offset = 0;
        data.forEach(function(val) {
            bufferData.writeUInt32BE(val, offset);
            offset += 4;
        });
    }
    var writePtrAddress = driver_const.T7_MA_EXF_pWRITE;
    var writeFlashAddress = driver_const.T7_MA_EXF_WRITE;
    
    var bundle = {};
    bundle.getDevice = function() {
        return device;
    };
    var size = driver_const.T7_FLASH_BLOCK_WRITE_SIZE;

    var flashDefered = q.defer();
    createFlashOperation(
        bundle,
        startAddress,
        length,
        size,
        writePtrAddress,
        writeFlashAddress,
        false,
        key,
        bufferData
    ).then(function(bundle) {
        flashDefered.resolve(bundle);
    }, function(err) {
        flashDefered.reject(err);
    });
    return flashDefered.promise;
};

/**
 * Create a range enumeration like in Python.
 *
 * @param {int} start The first number in the sequence (inclusive).
 * @param {int} stop The last number in the sequence (non-inclusive).
 * @param {int} step The integer distance between members of the returned
 *      sequence.
 * @return {Array} Array with the numerical sequence.
 * @author Tadeck - http://stackoverflow.com/questions/8273047
**/
function range(start, stop, step) {
    if (typeof stop=='undefined') {
        // one param defined
        stop = start;
        start = 0;
    }
    if (typeof step=='undefined') {
        step = 1;
    }
    if ((step>0 && start>=stop) || (step<0 && start<=stop)) {
        return [];
    }
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step) {
        result.push(i);
    }
    return result;
}

/**
 * Erases n number of flash pages on the device within the provided bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the erase operation on.
 * @param {Number} startAddress The address to start erasing flash pages on.
 * @param {Number} numPages The number of pages to erase;
 * @param {Number} key Permissions key for that range.
 * @return {Promise} Promise that resolves to the provided bundle after the
 *      erase is complete.
**/
exports.eraseFlash = function(device, startAddress, numPages, key) {
    var deferred = q.defer();

    var bundle = {};
    bundle.getDevice = function() {
        return device;
    };

    var pages = range(numPages);
    async.eachSeries(
        pages,
        function (page, callback) {
            device.writeMany(
                [driver_const.T7_MA_EXF_KEY, driver_const.T7_MA_EXF_ERASE],
                [key, startAddress + page * driver_const.T7_FLASH_PAGE_SIZE],
                function (err) { callback(err); },
                function () { callback(null); }
            );
        },
        function (err) {
            if (err) {
                safelyReject(deferred, err);
            } else {
                deferred.resolve(bundle);
            }
        }
    );

    return deferred.promise;
};