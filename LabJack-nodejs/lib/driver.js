/**
 * Wrapper around LabJack LJM driver.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
**/

var ref = require('ref');//http://tootallnate.github.io/ref/#types-double
var util = require('util');//
var driverLib = require('./driver_wrapper');

var jsonConstants = require('ljswitchboard-modbus_map');
var ljm_mm = jsonConstants.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');


var LIST_ALL_EXTENDED_MAX_NUM_TO_FIND = driver_const.LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;

var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;
var LJM_LIST_ALL_SIZE = driver_const.LJM_LIST_ALL_SIZE;


/**
 * Create a new DriverOperationError object.
 *
 * This encapsulates the code of an error and indicates that the
 * error was thrown from the LabJack-nodejs library in the "driver"
 * object.  The error code's string and description 
 * are pulled from the ljswitchboard-modbus_map library.
 *
 * @param {Number} code The raw / uinterpreted error code from LJM.
 * @param {string} message An optional string message.
 * @param {number} errFrame In situations where array's are being parsed, 
 *   this indicates the indicy.
 * @param {array} results Optional parameter passed when some but not
 *   all results may be valid.
**/
function DriverOperationError(code, message, errFrame, results)
{
    this.code = code;
    var errorInfo = ljm_mm.getErrorInfo(code);
    this.string = errorInfo.string;
    this.description = errorInfo.description;
    if(typeof(message) !== 'undefined') {
        this.message = message.toString();
    }
    if(typeof(errFrame) !== 'undefined') {
        this.errFrame = errFrame;
    }
    if(typeof(results) !== 'undefined') {
        this.results = results;
    }
    
}
util.inherits(DriverOperationError, Error);
DriverOperationError.prototype.name = 'Driver Operation Error - device';


/**
 * Create a new DriverInterfaceError object.
 *
 * Create a new DriverInterfaceError which encapsulates the code of an error
 * encountered while communicating with the driver. This is an error thrown by
 * labjack-nodejs, not within driver code.
 *
 * @param {String/Number} description The integer error code or string
 *      description of the error encountered.
**/
function DriverInterfaceError(description) {
    this.description = description;
    this.message = description;
}
util.inherits(DriverInterfaceError, Error);
DriverInterfaceError.prototype.name = 'Driver Interface Error - device';



/**
 * Constructor for an object acting as LJM driver wrapper.
 */
exports.ljmDriver = function(ljmOverride) {
    if(typeof(ljmOverride) !== 'undefined') {
        this.ljm = ljmOverride;
    } else {
        this.ljm = driverLib.getDriver();
    }
    this.hasOpenAll = driverLib.hasOpenAll();
    this.hasGetHandles = driverLib.hasGetHandles();
    this.constants = jsonConstants.getConstants();
    this.errors = this.constants.errorsByName;

    /**
     * Dereferences buffers and zips arrays in building listAll return values.
     *
     * Helper function for the listAll and listAllSync functions to zip arrays
     * and dereference native interface buffers containing information about the
     * devices that are available for opening.
     *
     * @param {number} numFound 
     * @param {Buffer} aDevT Buffer containing a collection of device types as
     *      provided by LJM.
     * @param {Buffer} aConT Buffer containing information about how each device
     *      
     * @param {Buffer} aSN      Appropriate Information from LJM call.
     * @param {Buffer} aIP      Appropriate Information from LJM call.
     * @return {array} Array of objects, each with information about an
     *      available device.
     */
    this.buildListAllArray = function(numFound, aDevT, aConT, aSN, aIP) {
        var deviceInfoArray = [];
        var offset = 0;
        var numDevices = numFound.deref();
        for(var i = 0; i < numDevices; i++) {
            var ipStr = "";
            ipStr += aIP.readUInt8(offset+3).toString();
            ipStr += ".";
            ipStr += aIP.readUInt8(offset+2).toString();
            ipStr += ".";
            ipStr += aIP.readUInt8(offset+1).toString();
            ipStr += ".";
            ipStr += aIP.readUInt8(offset).toString();

            //Build Dict-array                          
            deviceInfoArray.push(
                {
                    deviceType:aDevT.readInt32LE(offset),
                    connectionType:aConT.readInt32LE(offset),
                    serialNumber:aSN.readInt32LE(offset),
                    ipAddress:ipStr
                }
            );
            offset +=4;
        }
        
        return deviceInfoArray;
    };

    /**
     * Retrieves a list of all LabJack devices avaialable for opening.
     *
     * Function calls either the LJM_ListALL or LJM_ListAllS functions 
     * asynchronously.
     * 
     * @param {string} deviceType String describing what type of device to
     *      open. Examples include 'LJM_dtT7'. May also be an integer constant
     *      corresponding to the device type.
     * @param {string} connectionType connectionType String describing what
     *      type of connection to open. Examples include 'LJM_ctUSB' and
     *      'LJM_ctANY'. May also be an integer constant corresponding to the
     *      appropriate connection medium to use.
     * @param {function} onError Function to call if an error is encoutnered
     *      while enumerating available devices. Must take a single parameter
     *      (either an integer or string) describing the error encountered.
     * @param {function} onSuccess Function to call with the resulting
     *      enumeration. Should take a single argument: the listing of
     8      avilable devices as an array of object.
     */
    this.listAll = function(deviceType, connectionType, onError, onSuccess) {
        var errorResult;
        var devT;
        var conT;

        var numFound =  new ref.alloc('int',1);
        var aDeviceTypes = new Buffer(4*128);
        aDeviceTypes.fill(0);
        var aConnectionTypes = new Buffer(4*128);
        aConnectionTypes.fill(0);
        var aSerialNumbers = new Buffer(4*128);
        aSerialNumbers.fill(0);
        var aIPAddresses = new Buffer(4*128);
        aIPAddresses.fill(0);

        //Figure out if we need to augment the input variables
        if(arguments.length < 4) {
            //Do something smart
            devT = "LJM_dtANY";         //
            conT = "LJM_ctANY";         //
            onError = arguments[0];     //Re-define onError as first argument
            onSuccess = arguments[1];   //Re-define onSuccess as second argument
        } else {
            devT = deviceType;
            conT = connectionType;
        }

        if ((isNaN(devT)) && (isNaN(conT))) {
            errorResult = self.ljm.LJM_ListAllS.async(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses, 
                function (err, res) {
                    // if (err) throw err;
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'listAll', err.toString()));
                    if (res === 0) {                        
                        var devArray = self.buildListAllArray(
                            numFound,
                            aDeviceTypes,
                            aConnectionTypes,
                            aSerialNumbers,
                            aIPAddresses
                            );
                        return onSuccess(devArray);
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else if ((!isNaN(devT))&&(!isNaN(conT))) {
            errorResult = self.ljm.LJM_ListAll.async(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses, 
                function (err, res){
                    // if(err) throw err;
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'listAll', err.toString()));
                    if(res === 0) {
                        var devArray = self.buildListAllArray(
                            numFound,
                            aDeviceTypes,
                            aConnectionTypes,
                            aSerialNumbers,
                            aIPAddresses
                            );
                        return onSuccess(devArray);
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error,res));
        }
    };

    /**
     * Synchronous version of listAll.
     * 
     * @param {string} deviceType String describing what type of device to
     *      open. Examples include 'LJM_dtT7'. May also be an integer constant
     *      corresponding to the device type.
     * @param {string} connectionType connectionType String describing what
     *      type of connection to open. Examples include 'LJM_ctUSB' and
     *      'LJM_ctANY'. May also be an integer constant corresponding to the
     *      appropriate connection medium to use.
     * @return {array} the listing of avilable devices as an array of object.
     * @throws {DriverOperationError} If the input args aren't correct or an error occurs.
    **/
    this.listAllSync = function(deviceType, connectionType) {
        var errorResult;
        var devT;
        var conT;

        var numFound =  new ref.alloc('int',1);
        var aDeviceTypes = new Buffer(4*128);
        aDeviceTypes.fill(0);
        var aConnectionTypes = new Buffer(4*128);
        aConnectionTypes.fill(0);
        var aSerialNumbers = new Buffer(4*128);
        aSerialNumbers.fill(0);
        var aIPAddresses = new Buffer(4*128);
        aIPAddresses.fill(0);

        //Figure out if we need to augment the input variables
        if(arguments.length < 2) {
            //Do something smart
            devT = "LJM_dtANY";         //
            conT = "LJM_ctANY";         //
        } else {
            devT = deviceType;
            conT = connectionType;
        }

        if ((isNaN(devT)) && (isNaN(conT))) {
            errorResult = self.ljm.LJM_ListAllS(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses
            );
        } else if ((!isNaN(devT)) && (!isNaN(conT))) {
            errorResult = self.ljm.LJM_ListAll(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses
            );
        } else {
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error);
        }
        if (errorResult === 0) {
            var devArray = self.buildListAllArray(
                numFound,
                aDeviceTypes,
                aConnectionTypes,
                aSerialNumbers,
                aIPAddresses
            );
            return devArray;
        } else {
            throw new DriverOperationError(errorResult);
        }

    };
    this.interpretResult = function(buffer,type,index) {
        var retVar;
        var strInterpret = function(input) {
            var output = '';
            for(var i = 0; i < input.length; i++) {
                if(input.charCodeAt(i) === 0) {
                    break;
                } else {
                    output += input[i];
                }
            }
            return output;
        };
        var numInterpret = function(input) {return input;};
        var bufFuncs = {
            'STRING': {func:'toString',argA:'utf8',argB:index,argC:index+50,intFunc:strInterpret},
            // 'UINT64': {func:'readFloatLE',argA:index,argB:undefined,argC:undefined},
            'FLOAT32': {func:'readFloatBE',argA:index,argB:undefined,argC:undefined,intFunc:numInterpret},
            'INT32': {func:'readInt32BE',argA:index,argB:undefined,argC:undefined,intFunc:numInterpret},
            'UINT32': {func:'readUInt32BE',argA:index,argB:undefined,argC:undefined,intFunc:numInterpret},
            'UINT16': {func:'readUInt16BE',argA:index,argB:undefined,argC:undefined,intFunc:numInterpret},
            'BYTE': {func:'readUInt8',argA:index,argB:undefined,argC:undefined,intFunc:numInterpret},
        };
        var funcStr = bufFuncs[type].func;
        var argA = bufFuncs[type].argA;
        var argB = bufFuncs[type].argB;
        var argC = bufFuncs[type].argC;
        var intFunc = bufFuncs[type].intFunc;
        retVar = intFunc(buffer[funcStr](argA,argB,argC));
        return retVar;
    };
    this.buildListAllExtendedArray = function(context,deviceData,registers,addresses,names,types,numBytes,buffer) {
        var retData = {};
        var bufferOffset = 0;
        // console.log('Raw Data',C_aBytes);
        deviceData.forEach(function(devObj,devObjIndex){
            var dataArray = [];
            var readDataArray = [];
            registers.forEach(function(reg,index) {
                var readData = context.interpretResult(buffer,types[index],bufferOffset);
                // console.log('Result',types[index],bufferOffset,typeof(readData),readData);
                var data = {
                    register: reg,
                    name: names[index],
                    address: addresses[index],
                    val: readData
                };
                dataArray.push(data);
                readDataArray.push(readData);
                bufferOffset += numBytes[index];
            });
            deviceData[devObjIndex].data = dataArray;
            deviceData[devObjIndex].registers = registers;
            deviceData[devObjIndex].addresses = addresses;
            deviceData[devObjIndex].names = names;
            deviceData[devObjIndex].values = readDataArray;
        });
        return deviceData;
    };
    /**
     * Performs a special LJM list all command that gets extra information from 
     * every device that is found before returning data to the user.
     * 
     * @param  {[type]} deviceType     [description]
     * @param  {[type]} connectionType [description]
     * @param  {[type]} addresses      [description]
     * @param {string} deviceType String describing what type of device to
     *      open. Examples include 'LJM_dtT7'. May also be an integer constant
     *      corresponding to the device type.
     * @param {string} connectionType connectionType String describing what
     *      type of connection to open. Examples include 'LJM_ctUSB' and
     *      'LJM_ctANY'. May also be an integer constant corresponding to the
     *      appropriate connection medium to use.
     * @param {function} onError Function to call if an error is encoutnered
     *      while enumerating available devices. Must take a single parameter
     *      (either an integer or string) describing the error encountered.
     * @param {function} onSuccess Function to call with the resulting
     *      enumeration. Should take a single argument: the listing of
     *      avilable devices as an array of object.
     */
    this.listAllExtended = function(deviceType, connectionType, registers, onError, onSuccess) {
        // Compensate for Auto-
        var devT;
        var conT;
        var regs;
        var onErr;
        var onSuc;

        var message;
        var errorCode;

        // Intelligently parse the input arguments
        if (arguments.length == 2) {
            devT = "LJM_dtANY";
            conT = "LJM_ctANY";
            regs = [];
            onErr = arguments[0];
            onSuc = arguments[1];
        } else if (arguments.length == 3) {
            devT = "LJM_dtANY";
            conT = "LJM_ctANY";
            regs = arguments[0];
            onErr = arguments[1];
            onSuc = arguments[2];
        } else if (arguments.length == 4) {
            devT = arguments[0];
            conT = arguments[1];
            regs = [];
            onErr = arguments[2];
            onSuc = arguments[3];
        } else if (arguments.length == 5) {
            devT = arguments[0];
            conT = arguments[1];
            regs = arguments[2];
            onErr = arguments[3];
            onSuc = arguments[4];
        } else {
            message = 'Invalid number of arguments passed to listAllExtra';
            errorCode = self.errors.LJN_INVALID_ARGUMENTS.error;
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, message);
            return onErr(buildAsyncError(errorCode, message));
        }

        if (typeof(regs) !== 'object') {
            message = 'Invalid Argument parsed as desired read registers';
            throw new DriverOperationError(errorCode, message);
            return onErr(buildAsyncError(errorCode, message));
        }

        if(isNaN(devT)) {
            devT = driver_const.deviceTypes[devT];
            if(typeof(devT) === 'undefined') {
                devT = 0;
            }
        }
        if(isNaN(conT)) {
            conT = driver_const.connectionTypes[conT];
            if(typeof(conT) === 'undefined') {
                conT = 0;
            }
        }

        // Save the maximum number of devices to be found
        var maxNumDevices = LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;

        // Values to be interpreted by function
        var aAddresses = [];
        var addressNames = [];
        var numBytes = [];
        var aNumRegs = [];
        var types = [];
        var numRecvRegs = 0;
        
        // Values to be sent to C call
        var C_DeviceType = devT;            // Device type to search for
        var C_ConnectionType = conT;        // Connection type to search for
        var C_NumAddresses = regs.length;   // Number of registers to read
        var C_aAddresses;                   // integer array of addresses;
        var C_aNumRegs;                     // integer array of sizes
        var C_MaxNumFound = maxNumDevices;  // integer
        var C_NumFound;                     // integer pointer to be populated with num found
        var C_aDeviceTypes;                 // integer array to be populated with deviceTypes
        var C_aConnectionTypes;             // integer array to be populated with connectionTypes
        var C_aSerialNumbers;               // integer array to be populated with serialNumbers
        var C_aIPAddresses;                 // integer array to be populated with ipAddresses
        var C_aBytes;                       // byte (char) buffer filled with read-data
        var errorResult=0;

        // Calculate buffer sizes
        var addrBuffSize = 4*C_NumAddresses;
        var searchBuffSize = 4*maxNumDevices;
        // Allocate buffers for variables that are already known
        C_aAddresses = new Buffer(addrBuffSize);
        C_aNumRegs = new Buffer(addrBuffSize);

        C_NumFound =  new ref.alloc('int',1);
        C_aDeviceTypes = new Buffer(searchBuffSize);
        C_aDeviceTypes.fill(0);
        C_aConnectionTypes = new Buffer(searchBuffSize);
        C_aConnectionTypes.fill(0);
        C_aSerialNumbers = new Buffer(searchBuffSize);
        C_aSerialNumbers.fill(0);
        C_aIPAddresses = new Buffer(searchBuffSize);
        C_aIPAddresses.fill(0);

        var bytesPerRegister = driver_const.LJM_BYTES_PER_REGISTER;
        regs.forEach(function(reg,index){
            var info = self.constants.getAddressInfo(reg, 'R');
            var numRegs = Math.ceil(info.size/bytesPerRegister);
            aAddresses.push(info.address);
            aNumRegs.push(numRegs);
            numBytes.push(numRegs+numRegs);
            types.push(info.typeString);
            addressNames.push(info.data.name);
            // console.log(info)
            numRecvRegs += numRegs;
        });

        // Allocate the receive buffer LJM will use to save extra read data
        var aBytesSize = maxNumDevices * numRecvRegs * bytesPerRegister;
        C_aBytes = new Buffer(aBytesSize);
        C_aBytes.fill(0);

        // Save register data to buffers (filling C_aAddresses and C_aNumRegs)
        var i;
        var bufIndex = 0;
        for (i=0; i < aAddresses.length; i++) {
            C_aAddresses.writeInt32LE(aAddresses[i],bufIndex);
            C_aNumRegs.writeInt32LE(aNumRegs[i],bufIndex);
            bufIndex += ARCH_INT_NUM_BYTES;
        }

        
        errorResult = self.ljm.LJM_ListAllExtended.async(
            C_DeviceType, 
            C_ConnectionType, 
            C_NumAddresses,
            C_aAddresses,
            C_aNumRegs,
            C_MaxNumFound,
            C_NumFound,
            C_aDeviceTypes,
            C_aConnectionTypes,
            C_aSerialNumbers,
            C_aIPAddresses,
            C_aBytes,
            function (err, res){
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'listAllExtended', err.toString()));
                if (res === 0) {
                    var devArray = self.buildListAllArray(
                        C_NumFound,
                        C_aDeviceTypes,
                        C_aConnectionTypes,
                        C_aSerialNumbers,
                        C_aIPAddresses
                    );
                    var retArray = self.buildListAllExtendedArray(
                        self,devArray,regs,aAddresses,addressNames,types,
                        numBytes,C_aBytes);
                    
                    return onSuc(retArray);
                } else {
                    // console.log('LJM_ListAllExtended Err');
                    // console.log(self.errToStrSync(res));
                    return onErr(buildAsyncError(res));
                }
            }
        );
    };
    this.listAllExtendedSync = function(deviceType, connectionType, registers) {
        var listAllData;
        // Compensate for Auto-
        var devT;
        var conT;
        var regs;

        var message;
        var errorCode;
        // Intelligently parse the input arguments
        if (arguments.length === 0) {
            devT = "LJM_dtANY";
            conT = "LJM_ctANY";
            regs = [];
        } else if (arguments.length === 1) {
            devT = "LJM_dtANY";
            conT = "LJM_ctANY";
            regs = arguments[0];
        } else if (arguments.length === 2) {
            devT = arguments[0];
            conT = arguments[1];
            regs = [];
        } else if (arguments.length === 3) {
            devT = arguments[0];
            conT = arguments[1];
            regs = arguments[2];
        } else {
            message = 'Invalid number of arguments passed to listAllExtendedSync';
            errorCode = self.errors.LJN_INVALID_ARGUMENTS.error;
            throw new DriverOperationError(errorCode, message);
        }

        if (typeof(regs) !== 'object') {
            message = 'Invalid Argument parsed as desired read registers-listAllExtendedSync';
            errorCode = self.errors.LJN_INVALID_ARGUMENTS.error;
            throw new DriverOperationError(errorCode, message);
        }

        if(isNaN(devT)) {
            devT = driver_const.deviceTypes[devT];
            if(typeof(devT) === 'undefined') {
                devT = 0;
            }
        }
        if(isNaN(conT)) {
            conT = driver_const.connectionTypes[conT];
            if(typeof(conT) === 'undefined') {
                conT = 0;
            }
        }

        // Save the maximum number of devices to be found
        var maxNumDevices = LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;

        // Values to be interpreted by function
        var aAddresses = [];
        var addressNames = [];
        var numBytes = [];
        var aNumRegs = [];
        var types = [];
        var numRecvRegs = 0;
        
        // Values to be sent to C call
        var C_DeviceType = devT;            // Device type to search for
        var C_ConnectionType = conT;        // Connection type to search for
        var C_NumAddresses = regs.length;   // Number of registers to read
        var C_aAddresses;                   // integer array of addresses;
        var C_aNumRegs;                     // integer array of sizes
        var C_MaxNumFound = maxNumDevices;  // integer
        var C_NumFound;                     // integer pointer to be populated with num found
        var C_aDeviceTypes;                 // integer array to be populated with deviceTypes
        var C_aConnectionTypes;             // integer array to be populated with connectionTypes
        var C_aSerialNumbers;               // integer array to be populated with serialNumbers
        var C_aIPAddresses;                 // integer array to be populated with ipAddresses
        var C_aBytes;                       // byte (char) buffer filled with read-data
        var errorResult=0;

        // Calculate buffer sizes
        var addrBuffSize = 4*C_NumAddresses;
        var searchBuffSize = 4*maxNumDevices;
        // Allocate buffers for variables that are already known
        C_aAddresses = new Buffer(addrBuffSize);
        C_aNumRegs = new Buffer(addrBuffSize);

        C_NumFound =  new ref.alloc('int',1);
        C_aDeviceTypes = new Buffer(searchBuffSize);
        C_aDeviceTypes.fill(0);
        C_aConnectionTypes = new Buffer(searchBuffSize);
        C_aConnectionTypes.fill(0);
        C_aSerialNumbers = new Buffer(searchBuffSize);
        C_aSerialNumbers.fill(0);
        C_aIPAddresses = new Buffer(searchBuffSize);
        C_aIPAddresses.fill(0);

        var bytesPerRegister = driver_const.LJM_BYTES_PER_REGISTER;
        regs.forEach(function(reg,index){
            var info = self.constants.getAddressInfo(reg, 'R');
            var numRegs = Math.ceil(info.size/bytesPerRegister);
            aAddresses.push(info.address);
            aNumRegs.push(numRegs);
            numBytes.push(numRegs+numRegs);
            types.push(info.typeString);
            addressNames.push(info.data.name);
            // console.log(info)
            numRecvRegs += numRegs;
        });

        // Allocate the receive buffer LJM will use to save extra read data
        var aBytesSize = maxNumDevices * numRecvRegs * bytesPerRegister;
        C_aBytes = new Buffer(aBytesSize);
        C_aBytes.fill(0);

        // Save register data to buffers (filling C_aAddresses and C_aNumRegs)
        var i;
        var bufIndex = 0;
        for (i=0; i < aAddresses.length; i++) {
            C_aAddresses.writeInt32LE(aAddresses[i],bufIndex);
            C_aNumRegs.writeInt32LE(aNumRegs[i],bufIndex);
            bufIndex += ARCH_INT_NUM_BYTES;
        }

        errorResult = self.ljm.LJM_ListAllExtended(
            C_DeviceType, 
            C_ConnectionType, 
            C_NumAddresses,
            C_aAddresses,
            C_aNumRegs,
            C_MaxNumFound,
            C_NumFound,
            C_aDeviceTypes,
            C_aConnectionTypes,
            C_aSerialNumbers,
            C_aIPAddresses,
            C_aBytes
        );
        if (errorResult === 0) {
            var devArray = self.buildListAllArray(
                C_NumFound,
                C_aDeviceTypes,
                C_aConnectionTypes,
                C_aSerialNumbers,
                C_aIPAddresses
            );
            var retArray = self.buildListAllExtendedArray(
                self,devArray,regs,aAddresses,addressNames,types,
                numBytes,C_aBytes);
            return retArray;
        } else {
            throw new DriverOperationError(errorResult);
        }
        
    };

    /**
     * Internal helper function to prepare the arguments for an OpenAll call.
     * @throws {DriverInterfaceError} Thrown if the function can't be called.
     * @throws {DriverOperationError} If the input args aren't correct or an error occurs.
     */
    var prepareOpenAll = function(me, deviceType, connectionType) {
        if (!self.hasOpenAll) {
            throw new DriverInterfaceError(
                'openAll is not loaded. Use ListAll and Open functions instead.'
            );
        }

        if (deviceType === undefined || connectionType === undefined) {
            throw new DriverOperationError(
                self.errors.LJN_INVALID_ARGUMENTS.error,
                'Insufficient parameters for OpenAll - DeviceType and ConnectionType required'
            );
        }

        me.numOpened = new ref.alloc('int', 0);
        me.aHandles = new Buffer(ARCH_INT_NUM_BYTES * LJM_LIST_ALL_SIZE);
        me.aHandles.fill(0);
        me.numErrors = new ref.alloc('int', 0);
        me.errorHandle = new ref.alloc('int', 0);
        me.errors = new Buffer(ARCH_POINTER_SIZE);
        me.errors.fill(0);

        me.devType = driver_const.deviceTypes[deviceType];
        me.deviceType = deviceType;
        me.connType = driver_const.connectionTypes[connectionType];
        me.connectionType = connectionType;
    };

    /**
     * Desc: Internal helper function to extract return data from an OpenAll call.
     */
    var extractOpenAllResults = function(me) {
        var results = {
            'deviceType': me.deviceType,
            'deviceTypeNum': me.devType,
            'connectionType': me.connectionType,
            'connectionTypeNum': me.connType,
        };

        // Parse the successfully opened devices.
        var numOpened = me.numOpened.deref();
        var handles = [];
        for(var i = 0; i < numOpened; i++) {
            var handle = me.aHandles.readInt32LE(i * ARCH_INT_NUM_BYTES);
            handles.push(handle);
        }
        results.numOpened = numOpened;
        results.handles = handles;

        // Parse the errors...
        var numErrors = me.numErrors.deref();
        var failedOpens = [];
        results.numErrors = numErrors;
        results.failedOpens = failedOpens;

        // Parse the errorHandle
        var errorHandle = me.errorHandle.readInt32LE(0);

        // Read the errors string
        var pointerToCharStar = ref.readPointer(me.errors, 0, ARCH_POINTER_SIZE);
        var parsedCharStar = ref.readCString(pointerToCharStar, 0);
        var errorsString = parsedCharStar;
        var errorsObj = {};
        try {
            errorsObj = JSON.parse(errorsString);
        } catch(err) {
            errorsObj = {
                'exceptions': [],
                'networkInterfaces': [],
                'returnedDevices': [],
                'specificIPs': [],
            };
        }

        // console.log('Parsed Data', errorHandle, errorsObj);
        // Save the errors to the results.
        results.errorHandle = errorHandle;
        results.errors = errorsObj;

        return results;
    };

    // function asyncUnallocateErrorsHandle(handle, callback) {
    //     self.ljm.LJM_CleanInfo.async(
    //         handle,
    //         function (err, res) {
    //             callback();
    //         });
    // }
    // function syncUnallocateErrorsHandle(handle) {
    //     try {
    //         self.ljm.LJM_CleanInfo(handle);
    //     } catch(err) {
    //         // Error...
    //     }
    //     return;
    // }
    this.cleanInfo = function(handle, onError, onSuccess) {
        var bHandle = new ref.alloc('int', handle);
        self.ljm.LJM_CleanInfo.async(
            bHandle,
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'cleanInfo', err.toString()));
                if (res !== 0) return onError(new DriverOperationError(res));
                onSuccess();
            });
    }
    this.cleanInfoSync = function(handle) {
        var bHandle = new ref.alloc('int', handle);
        var errorResult = self.ljm.LJM_CleanInfo(bHandle);
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }
        return;
    }

    /**
     * Desc: Opens all LabJacks of the specified device type and connection type.
     *
     * @param {int} deviceType The numerical device type
     * @param {int} connectionType The numerical connection type
     * @param {function} onError Function to call if an error is encountered
     *      while enumerating available devices. Must take a single parameter
     *      (either an integer or string) describing the error encountered.
     * @param {function} onSuccess Function to call with the resulting
     *      enumeration. Should take a single argument: a listing representing
     *      the devices opened as an array of objects.
     */
    this.openAll = function(deviceType, connectionType, onError, onSuccess) {
        var me = {};
        prepareOpenAll(me, deviceType, connectionType);

        self.ljm.Internal_LJM_OpenAll.async(
            me.devType,
            me.connType,
            me.numOpened,
            me.aHandles,
            me.numErrors,
            me.errorHandle,
            me.errors,
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'openAll', err.toString()));
                if (res !== 0) return onError(new DriverOperationError(res));
                var results = extractOpenAllResults(me);
                // return onSuccess(extractOpenAllResults(me));
                self.cleanInfo(
                    results.errorHandle,
                    onError,
                    function successFunc(res) {
                        onSuccess(results);
                    }
                );
            }
        );
    };
    this.openAllSync = function(deviceType, connectionType) {
        var me = {};
        prepareOpenAll(me, deviceType, connectionType);

        var errorResult = self.ljm.Internal_LJM_OpenAll(
            me.devType,
            me.connType,
            me.numOpened,
            me.aHandles,
            me.numErrors,
            me.errorHandle,
            me.errors
        );
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }
        var results = extractOpenAllResults(me);
        self.cleanInfoSync(results.errorHandle);
        return results;
    };


    /**
     * Internal helper function to prepare the arguments for an getHandles call.
     * @throws {DriverInterfaceError} Thrown if the function can't be called.
     */
    function prepareGetHandles(info) {
        if (!self.hasGetHandles) {
            throw new DriverInterfaceError(
                'getHandles is not loaded. The installed LJM library needs to be updated.'
            );
        }

        info.infoHandle = new ref.alloc('int', 0);
        info.info = new Buffer(ARCH_POINTER_SIZE);
        info.info.fill(0);
        
        return info;
    };
    function extractGetHandlesResults(info) {
        var results = {
            infoHandle: infoHandle,
            info: info,
            infoString: '',
            infoObj: {},
        };

        // Parse the infoHandle
        var infoHandle = info.infoHandle.readInt32LE(0);
        // Read the errors string
        var pointerToCharStar = ref.readPointer(info.info, 0, ARCH_POINTER_SIZE);
        var parsedCharStar = ref.readCString(pointerToCharStar, 0);
        
        results.infoString = parsedCharStar;
        
        try {
            results.infoObj = JSON.parse(parsedCharStar);
        } catch(err) {
            results.infoObj = {
                'exceptions': [],
                'networkInterfaces': [],
                'returnedDevices': [],
                'specificIPs': [],
            };
        }
        
        return results;
    }
    this.getHandles = function(onError, onSuccess) {
        var info = {};
        prepareGetHandles(info);
        
        self.ljm.Internal_LJM_GetHandles.async(
            info.infoHandle,
            info.info,
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'getHandles', err.toString()));
                if (res !== 0) return onError(new DriverOperationError(res));
                var results = extractGetHandlesResults(info);
                
                self.cleanInfo(
                    results.infoHandle,
                    onError,
                    onSuccess
                );
            }
        );

        // var results = extractGetHandlesResults(info);

    }

    this.getHandlesSync = function() {
        var info = {};
        prepareGetHandles(info);
        var errorResult = self.ljm.Internal_LJM_GetHandles(
            info.infoHandle,
            info.info
        );

        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }

        var results = extractGetHandlesResults(info);
        self.cleanInfoSync(results.infoHandle);
        return results.infoObj;

    }

    /**
     * Converts an error number to a string asynchronously.
     * @param {number} errNum Error number to be converted to a string.
     * @param {function} onError Function to call if an error is encountered
     *      while converting the provided error number to a string description.
     * @param {function} onSuccess Function to call with the string description
     *      of the error number passed. Should take a single argument: the
     *      resulting string description.
     */
    this.errToStr = function(errNum, onError, onSuccess) {
        var errorResult=0;
        var strRes = new Buffer(50);
        strRes.fill(0);
        errorResult = self.ljm.LJM_ErrorToString.async(
            errNum, 
            strRes, 
            function (err, res){
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'errToStr', err.toString()));
                if (res === 0) {
                    //console.log('strRes: ',ref.readCString(strRes,0));
                    return onSuccess('Num: '+errNum+', '+ref.readCString(strRes,0));
                } else {
                    //console.log('BAD!',ref.readCString(strRes,0));
                    return onError('Num: '+errNum+', '+ref.readCString(strRes,0));
                }
            }
        );
        return 0;
    };

    /**
     * Synchrnonous version of errToStr.
     * @param {number} errNum Error number to be converted to a string.
     * @return {string} The string error description corresponding to the
     *      provided error numebr.
     */
    this.errToStrSync = function(errNum) {
        var errorResult=0;

        var strRes = new Buffer(50);
        strRes.fill(0);

        errorResult = self.ljm.LJM_ErrorToString(errNum, strRes);
        if (errorResult !== 0) {
            return 'Num: '+errNum+', '+ref.readCString(strRes,0);
        } else {
            return 'Num: '+errNum+', '+ref.readCString(strRes,0);
        }
    };
    
    /**
     * Loads driver constants into memory.
     *
     * @param {function} onError Function to call if an error is encoutnered in
     *      loading driver constants. Should take a single arugment: an integer
     *      or string description of the error encoutnered.
     * @param {function} onSuccess Function to call after constants have been
     *      loaded. Should take no arguments.
     */
    this.loadConstants = function(onError, onSuccess) {
        var errorResult;
        errorResult = self.ljm.LJM_LoadConstants.async(
            function (err, res){
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'loadConstants', err.toString()));
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(new DriverOperationError(res));
                }
            }
        );
        return 0;
    };

    /**
     * Calls the LJM_LoadConstants function synchronously.
     *
     * @throws {DriverOperationError} Error thrown if the driver could not load
     *      constants, likely because of file system issues.
     */
    this.loadConstantsSync = function() {
        var errorResult;
        errorResult = self.ljm.LJM_LoadConstants();
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        } else {
            return 0;
        }
    };

    /**
     * Close all open LabJack devices.
     *
     * @param {function} onError Function to call if an error is encountered
     *      while closing devices. Should take a single arugment: a description
     *      of the error encountered as a string description or integer error
     *      number.
     * @param {function} onSuccess Function to call after all devices have
     *      been closed. Should take no arguments.
     */
    this.closeAll = function(onError, onSuccess) {
        var errorResult;
        errorResult = self.ljm.LJM_CloseAll.async(
            function (err, res){
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'closeAll', err.toString()));
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(new DriverOperationError(res));
                }
            }
        );
        return 0;
    };

    /**
     * Synchronous version of closeAll.
     */
    this.closeAllSync = function() {
        var errorResult;
        errorResult = self.ljm.LJM_CloseAll();
        if (errorResult !== 0) {
            return errorResult;
        } else {
            return 0;
        }

    };

    /**
     * Read an operational configuration setting for LJM.
     *
     * @param {string} parameter The name of the configuration setting to reads.
     * @param {function} onError Function to call if an error is encountered
     *      while reading this configuration setting. This function should
     *      take a single argument: a string error description or number
     *      error code.
     * @param {function} onSuccess Function to call after the configuration
     *      setting has been applied. Should take a single argument: the value
     *      of the configuration setting as read from LJM.
     */
    this.readLibrary = function(parameter, onError, onSuccess) {
        if (isNaN(parameter)) {
            var errorResult;
            var returnVar = new ref.alloc('double',1);

            errorResult = self.ljm.LJM_ReadLibraryConfigS.async(
                parameter, 
                returnVar, 
                function (err, res){
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'readLibrary', err.toString()));
                    if (res === 0) {
                        return onSuccess(returnVar.deref());
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error));
        }
    };
    
    /**
     * Synchronous version of readLibrary.
     *
     * @param  {string} parameter The name of the configuration setting to read.
     * @return {number} The value of the provided configuration setting.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
     */
    this.readLibrarySync = function(parameter) {
        if(isNaN(parameter)) {
            var errorResult;
            //Allocate a buffer for the result
            var returnVar = new ref.alloc('double',1);

            //Clear the buffer
            returnVar.fill(0);
            errorResult = self.ljm.LJM_ReadLibraryConfigS(
                parameter, 
                returnVar
            );
            // console.log('readLibrarySync', parameter, returnVar.deref(), errorResult);
            if (errorResult !== 0) {
                return errorResult;
            }
            return returnVar.deref();
        } else {
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error);
        }
    };
    this.readLibraryS = function (parameter, onError, onSuccess) {
        if (isNaN(parameter)) {
            var errorResult;

            //Allocate a buffer for the result
            var strBuffer = new Buffer(driver_const.LJM_MAX_NAME_SIZE);
            //Clear the buffer
            strBuffer.fill(0);

            errorResult = self.ljm.LJM_ReadLibraryConfigStringS.async(
                parameter,
                strBuffer,
                function (err, res){
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'readLibraryS', err.toString()));
                    if ( res === 0 ) {
                        //Calculate the length of the string
                        // var i=0;
                        // while(strBuffer[i] !== 0) {
                        //     i++;
                        // }
                        // return onSuccess(strBuffer.toString('utf8',0,i));
                        return onSuccess(ref.readCString(strBuffer));
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error));
        }
    };
    this.readLibrarySSync = function (parameter) {
        if(isNaN(parameter)) {
            var errorResult;
            //Allocate a buffer for the result
            var strBuffer = new Buffer(driver_const.LJM_MAX_NAME_SIZE);
            //Clear the buffer
            strBuffer.fill(0);

            errorResult = self.ljm.LJM_ReadLibraryConfigStringS(
                parameter,
                strBuffer
            );
            if (errorResult === 0) {
                //Calculate the length of the string
                // var i=0;
                // while(strBuffer[i] !== 0) {
                //     i++;
                // }
                // return strBuffer.toString('utf8',0,i);
                return ref.readCString(strBuffer);
            }
            // return strBuffer.toString('utf8',0,i);
            return errorResult;
        } else {
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error);
        }
    };

    /**
     * Calls the LJM_WriteLibraryConfigS function asynchronously.
     * 
     * @param  {number/string} parameter The constant to be read.
     * @param  {number} value     The value to write.
     * @param  {function} onError   Function called on error.
     * @param  {function} onSuccess Function called on success.
     */
    this.writeLibrary = function (parameter, value, onError, onSuccess) {
        var errorResult;
        if((isNaN(parameter))&&(isNaN(value))) {
            var enums = driver_const.LJM_LIBRARY_CONSTANTS;
            var isValid = typeof(enums[parameter]); 
            if ( isValid !== 'undefined') {
                isValid = typeof(enums[parameter][value]);
                if ( isValid !== 'undefined') {
                    value = enums[parameter][value];
                }
            }
        }

        if ((isNaN(parameter))&&(!isNaN(value))) {
            errorResult = self.ljm.LJM_WriteLibraryConfigS.async(
                parameter, 
                value, 
                function (err, res) {
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'writeLibrary', err.toString()));
                    if (res === 0) {
                        return onSuccess();
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else if((isNaN(parameter))&&(isNaN(value))) {

            errorResult = self.ljm.LJM_WriteLibraryConfigStringS.async(
                parameter, 
                value, 
                function (err, res) {
                    if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'writeLibrary', err.toString()));
                    if (res === 0) {
                        return onSuccess();
                    } else {
                        return onError(new DriverOperationError(res));
                    }
                }
            );
            return 0;
        } else {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error));
        }
    };

    /**
     * Calls the LJM_WriteLibraryConfigS function synchronously.
     * 
     * @param  {number/string} parameter The constant to be read.
     * @param  {number} value     The value to write.
     */
    this.writeLibrarySync = function (parameter, value) {
        var errorResult;
        if ((isNaN(parameter))&&(!isNaN(value))) {
            errorResult = self.ljm.LJM_WriteLibraryConfigS(
                parameter, 
                value
            );
        } else if ((isNaN(parameter))&&(isNaN(value))) {
            errorResult = self.ljm.LJM_WriteLibraryConfigStringS(
                parameter, 
                value
            );
        } else {
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error);
        }
        //Check for an error from driver & throw error
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        } else {
            return errorResult;
        }
    };

    /**
     * Log an event through LJM's internal logging system.
     *
     * @param {number} level The severity of the event to report. Should
     *      correspond to a driver severity level constant.
     * @param {string} str Description of the event.
     * @param {function} onError Function to call if the log could not be
     *      updated successfully. Should take a single argument: either a string
     *      description of the error or number of the error code.
     * @param {function} onSuccess Function to call after the event has been
     *      logged successfully.
     */

    this.log = function(level, str, onError, onSuccess) {
        str = str.toString();
        if ((isNaN(level))||(!isNaN(str))) {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, 'wrong types'));
        }
        var errorResult;
        if(str.length >= driver_const.LJM_MAX_STRING_SIZE) {
            return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, 'string to long'));
        }
        errorResult = self.ljm.LJM_Log.async(
            level, 
            str,
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'log', err.toString()));
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(new DriverOperationError(res));
                }
            }
        );
        return 0;
    };
    this.logS = this.log;

    /**
     * Synchronous version of log.
     *
     * @param {number} level The severity of the event to report. Should
     *      correspond to a driver severity level constant.
     * @param {string} str Description of the event.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
    **/
    this.logSync = function(level, str) {
        str = str.toString();
        if ((isNaN(level))||(!isNaN(str))) {
            throw new DriverOperationError(
                self.errors.LJN_INVALID_ARGUMENTS.error,
                'wrong types'
            );
        }
        var errorResult;
        if(str.length >= driver_const.LJM_MAX_STRING_SIZE) {
            throw new DriverOperationError(
                self.errors.LJN_INVALID_ARGUMENTS.error,
                'string to long'
            );
        }

        errorResult = self.ljm.LJM_Log(level, str);
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }
    };
    this.logSSync = this.logSync;

    /**
     * Reset LJM's internall logging system.
     *
     * @param {function} onError Function to call if the log could not be
     *      updated successfully. Should take a single argument: either a string
     *      description of the error or number of the error code.
     * @param {function} onSuccess Function called on success. Should not take
     *      any arguments.
     */
    this.resetLog = function(onError, onSuccess) {
        var errorResult;
        errorResult = self.ljm.LJM_ResetLog.async(
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'resetLog', err.toString()));
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(new DriverOperationError(res));
                }
            }
        );
    };

    /**
     * Synchronously calls resetLog.
     */
    this.resetLogSync = function() {
        var errorResult;
        errorResult = self.ljm.LJM_ResetLog();
        if (errorResult !== 0) {
            return errorResult;
        }
        return 0;
    };

    /**
    Helpful snippit of code from the LabJackM.h file:
    static const char * const LJM_DEBUG_LOG_MODE = "LJM_DEBUG_LOG_MODE";
    enum {
        LJM_DEBUG_LOG_MODE_NEVER = 1,
        LJM_DEBUG_LOG_MODE_CONTINUOUS = 2,
        LJM_DEBUG_LOG_MODE_ON_ERROR = 3
    };
    static const char * const LJM_DEBUG_LOG_LEVEL = "LJM_DEBUG_LOG_LEVEL";
    enum {
        LJM_STREAM_PACKET = 1,
        LJM_TRACE = 2,
        LJM_DEBUG = 4,
        LJM_INFO = 6,
        LJM_PACKET = 7,
        LJM_WARNING = 8,
        LJM_USER = 9,
        LJM_ERROR = 10,
        LJM_FATAL = 12
    };
    **/

    this.controlLog = function(mode, level, onError, onSuccess) {
        self.writeLibrary('LJM_DEBUG_LOG_MODE', mode, onError, function(res) {
            self.writeLibrary('LJM_DEBUG_LOG_LEVEL', level, onError, onSuccess);
        });
    };
    this.controlLogSync = function(mode, level) {
        var err = 0;
        var errA = self.writeLibrarySync('LJM_DEBUG_LOG_MODE', mode);
        var errB = self.writeLibrarySync('LJM_DEBUG_LOG_LEVEL', level);
        if(errA !== 0) {
            err = errA;
        }
        if(errB !== 0) {
            err = errB;
        }
        return err;
    };
    /**
     * Asynchronously enable logging
    **/
    this.enableLog = function(onError, onSuccess) {
        self.controlLog(2, 2, onError, onSuccess);
    };

    /**
     * Synchronously enable logging
    **/
    this.enableLogSync = function() {
        return self.controlLogSync(2,2);
    };

    /**
     * Asynchronously disable logging
    **/
    this.disableLog = function(onError, onSuccess) {
        self.controlLog(1, 10, onError, onSuccess);
    };

    /**
     * Synchronously disable logging
    **/
    this.disableLogSync = function() {
        return self.controlLogSync(1, 10);
    };

    var self = this;

    //Read the Driver Version number
    this.installedDriverVersion = this.readLibrarySync('LJM_LIBRARY_VERSION');
    if(this.installedDriverVersion < driver_const.LJM_JS_VERSION)
    {
        console.log('The Supported Version for this driver is: '+driver_const.LJM_JS_VERSION+', you are using: ', this.installedDriverVersion);
    }
    //Enable Logging
    //this.driver.LJM_WriteLibraryConfigS('LJM_LOG_MODE',2);
    //this.driver.LJM_WriteLibraryConfigS('LJM_LOG_LEVEL',2);
    //this.driver.LJM_Log(2,"LabJack-Device Enabled");







    /********************************************************************************************
    *********************************************************************************************
    *********************************************************************************************
    *********************************************************************************************
     *** Begin implementing device I/O functions exposed through the driver class to allow
     *** functions to be called without having device objects.

     *** These functions are all exposed with names closer to those defined by the LJM library.
     ********************************************************************************************
     ********************************************************************************************
     ********************************************************************************************
     ********************************************************************************************/

     /**
     * Asynchronously retrieves device information about this device.
     *
     * Retrieves device metadata information about the device whose handle this
     * object encapsulates. Returns a DeviceInfo object with the following
     * structure:
     * 
     * { 
     *      deviceType {number} A device model type corresponding to a constant
     *          in LabJackM.h. 
     *      connectionType {number} A constant from LabJackM.h that defines
     *          connection medium the driver is using to communicate with the
     *          device.
     *      serialNumber {number} The device unique integer serial number.
     *      ipAddress {string} The IP address the device is located at. Defaults
     *          to all zeros if not connected by the network (0.0.0.0).
     *      port {number} The port at which the device is connected.
     *      maxBytesPerMB {number} The maximum payload in bytes that the
     *          driver can send to the device over the current connection
     *          medium.
     * }
     * 
     * @param {function} onError function Callback for error-case that takes a
     *      single number or String argument.
     * @param {function} onSuccess function Callback for success-case that takes
     *      a single Object argument.
     * @return {Object} DeviceInfo
    **/
    this.LJM_GetHandleInfo = function(handle, onError, onSuccess) {
        var errorResult;

        var deviceType = ref.alloc('int', 1);
        var connectionType = ref.alloc('int', 1);
        var serialNumber = ref.alloc('int', 1);
        var ipAddr = ref.alloc('int', 1);
        var port = ref.alloc('int', 1);
        var maxBytesPerMessage = ref.alloc('int', 1);

        errorResult = self.ljm.LJM_GetHandleInfo.async(
            handle,
            deviceType,
            connectionType,
            serialNumber,
            ipAddr,
            port,
            maxBytesPerMessage,
            function (err, res) {
                if (err) onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR.error, 'LJM_GetHandleInfo', err.toString()));
                if (res === 0) {
                    var ipStr = "";
                    
                    ipStr += ipAddr.readUInt8(3).toString();
                    ipStr += ".";
                    ipStr += ipAddr.readUInt8(2).toString();
                    ipStr += ".";
                    ipStr += ipAddr.readUInt8(1).toString();
                    ipStr += ".";
                    ipStr += ipAddr.readUInt8(0).toString();
                    
                    return onSuccess(
                        {
                            deviceType: deviceType.deref(),
                            connectionType: connectionType.deref(),
                            serialNumber: serialNumber.deref(),
                            ipAddress: ipStr,
                            port: port.deref(),
                            maxBytesPerMB: maxBytesPerMessage.deref()
                        }
                    );
                } else {
                    return onError(new DriverOperationError(res));
                }
            }
        );
        return errorResult;
    };

    /**
     * Synchronously retrieves device information about this device.
     *
     * Retrieves device metadata information about the device whose handle this
     * object encapsulates. Returns a DeviceInfo object with the following
     * structure:
     * 
     * { 
     *      deviceType {number} A device model type corresponding to a constant
     *          in LabJackM.h. 
     *      connectionType {number} A constant from LabJackM.h that defines
     *          connection medium the driver is using to communicate with the
     *          device.
     *      serialNumber {number} The device unique integer serial number.
     *      ipAddress {string} The IP address the device is located at. Defaults
     *          to all zeros if not connected by the network (0.0.0.0).
     *      port {number} The port at which the device is connected.
     *      maxBytesPerMB {number} The maximum payload in bytes that the
     *          driver can send to the device over the current connection
     *          medium.
     * }
     *
     * @return {Object/Number} Object conforming to the DeviceInfo structure as
     *      defined above.
     * @throws {Error} Thrown if any errors are discovered.
    **/
    this.LJM_GetHandleInfoSync = function(handle) {
        var errorResult;

        var devT = ref.alloc('int', 1);
        var conT = ref.alloc('int', 1);
        var sN = ref.alloc('int', 1);
        var ipAddr = ref.alloc('int', 1);
        var port = ref.alloc('int', 1);
        var maxB = ref.alloc('int', 1);

        //Perform device I/O Operation
        errorResult = self.ljm.LJM_GetHandleInfo(
            handle,
            devT,
            conT,
            sN,
            ipAddr,
            port,
            maxB
        );
        
        //Check to see if there were any errors
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }

        var returnVariable = {
            deviceType: devT.deref(),
            connectionType: conT.deref(),
            serialNumber: sN.deref(),
            ipAddress: ipAddr.deref(),
            port: port.deref(),
            maxBytesPerMB: maxB.deref()
        };
        return returnVariable;
    };

    /**
     * Performs an asynchronous LJM_ReadRaw function call with the LJM driver.
     *
     * Reads the value of a modbus register without interpreting that value
     * before returning.
     * 
     * @param {Array} data An appropriately sized number array indicating how
     *      many bytes should be received from the LJM driver.
     * @param {function} onError function to be called when successful.
     * @param {function} onSuccess function to be called when an error occurs.
    **/
    this.LJM_ReadRaw = function(handle, data, onError, onSuccess) {

        //Make sure the data is valid
        if (typeof(data[0]) != "number") {
            return onError("Data is not a number array");
        }

        //Create a blank array for data to be saved to & returned
        var aData = new Buffer(data.length);
        aData.fill(0);

        errorResult = self.ljm.LJM_ReadRaw.async(
            handle,
            aData,
            data.length,
            function (err, res) {
                if(err) {
                    return onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR, 'LJM_ReadRaw', err.toString()));
                }

                if (res === 0) {
                    return onSuccess(aData);
                } else {
                    return onError(res);
                }
        });
    };

    /**
     * The synchronous version of readRaw.
     * 
     * @param {Array} data an appropriately sized number array indicating how
     *      many bytes should be received from the LJM driver.
     * @return {Array} Number Array of data returned from the LJM_ReadRaw
     *      function.
     * @throws {DriverOperationError} If an LJM error occurs.
     */
    this.LJM_ReadRawSync = function(handle, data) {//Make sure the data is valid, a number array
        if (typeof(data[0]) != "number") {
            throw new DriverOperationError(
                self.errors.LJN_INVALID_ARGUMENTS,
                "Data is not a number array"
            );
        }

        //Create a blank array for data to be saved to & returned
        var bufferData = new Buffer(data.length);
        bufferData.fill(0);

        errorResult = self.ljm.LJM_ReadRaw(handle, bufferData,
            data.length);

        //Check for an error
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
        }
        return bufferData;
    };

    /**
     * Asynchronously reads a single modbus address.  Converts address "Names" to addresses and calls either
     * the LJM_eReadAddress or LJM_eReadAddressString functions depending on the data type.
     *
     * @param {number} handle An active LJM device handle.
     * @param {Number/String} address Either an integer register address or a 
     *      String name compatible with LJM.
     * @param {function} onError Takes a single argument represenging
     *      the LJM-Error, either an integer error number or a String.
     * @param {Number/String} onSuccess Callback taking a single argument: an
     *      array containging data (as number or string elements based on data
     *      type) requested from the device.
     */
    this.LJN_Read = function(handle, address, onError, onSuccess) {

        var info = self.constants.getAddressInfo(address, 'R');
        var expectedReturnType = info.type;
        var isReturningString = expectedReturnType == driver_const.LJM_STRING;
        var isDirectionValid = info.directionValid == 1;
        var resolvedAddress = info.address;

        if (isDirectionValid && !isReturningString) {
            return self.LJM_eReadAddress(handle, resolvedAddress, info.type, onError, onSuccess);
        } else if (isDirectionValid && isReturningString) {
            return self.LJM_eReadAddressString(handle, resolvedAddress, onError, onSuccess);
        } else {
            if (info.type == -1) {
                return onError(new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error));
            } else if (info.directionValid === 0) {
                return onError(new DriverOperationError(self.errors.LJME_INVALID_DIRECTION.error));
            } else {
                return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error));
            }
        }
    };
    /**
     * Synchronously read a single modbus address.  Handles name to address conversion
     * and also reading string-type registers.
     * 
     * @param {number} handle An active LJM device handle.
     * @param {Number/String} address Either an integer register address or a 
     *      String name compatible with LJM.
     * @throws {DriverOperationError} If the input args aren't correct or an error occurs.
     */
    this.LJN_ReadSync = function (handle, address) {
        var info = self.constants.getAddressInfo(address, 'R');
        var expectedReturnType = info.type;
        var isReturningString = expectedReturnType == driver_const.LJM_STRING;
        var isDirectionValid = info.directionValid == 1;
        var resolvedAddress = info.address;

        if (isDirectionValid && !isReturningString) {
            return self.LJM_eReadAddressSync(handle, resolvedAddress, info.type);
        } else if (isDirectionValid && isReturningString) {
            return self.LJM_eReadAddressStringSync(handle, resolvedAddress);
        } else {
            if (info.type == -1) {
                throw new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error);
            } else if (info.directionValid === 0) {
                throw new DriverOperationError(self.errors.LJME_INVALID_DIRECTION.error);
            } else {
                throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error);
            }
        }
    };

    /*
     * Define functions to call the LJM_eReadAddress function.
     */
    this.LJM_eReadAddress = function(handle, address, type, onError, onSuccess) {
        var result = new ref.alloc('double', 1);
        self.ljm.LJM_eReadAddress.async(
            handle,
            resolvedAddress,
            type,
            result,
            function(err, res) {
                if(err) {
                    return onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR, 'LJM_eReadAddress', err.toString()));
                }

                if ( res === 0 ) {
                    //Success
                    return onSuccess(result.deref());
                } else {
                    //Error
                    return onError(res);
                }
            });
    };
    this.LJM_eReadAddressSync = function(handle, address, type) {
        var result = new ref.alloc('double',1);
        var output = self.ljm.LJM_eReadAddress(
            handle,
            resolvedAddress,
            type,
            result
        );

        if (output === 0) {
            result = result.deref();
            return result;
        } else {
            throw new DriverOperationError(output);
        }
    }

    /*
     * Define functions to call the LJM_eReadAddressString function.
     */
    this.LJM_eReadAddressString = function(handle, address, onError, onSuccess) {
        //Allocate space for the string-result
        var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
        strBuffer.fill(0);

        //Perform LJM Async function call
        self.ljm.LJM_eReadAddressString.async(
            handle,
            resolvedAddress,
            strBuffer,
            function(err, res) {
                if(err) {
                    return onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR, 'LJM_eReadAddressString', err.toString()));
                }

                // Check the output value.
                if ( res === 0 ) {
                    // Parse the string buffer and get the actual string.
                    var receivedStrData = strBuffer.toString(
                        'utf8',
                        0,
                        driver_const.LJM_MAX_STRING_SIZE
                    );
                    var actualStr = '';
                    for(var i = 0; i < receivedStrData.length; i++) {
                        if(receivedStrData.charCodeAt(i) === 0) {
                            break;
                        } else {
                            actualStr += receivedStrData[i];
                        }
                    }
                    return onSuccess(actualStr);
                } else {
                    return onError(res);
                }
            }
        );
    };

    this.LJM_eReadAddressStringSync = function(handle, address) {
        //Allocate space for the result
        var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
        strBuffer.fill(0);

        output = self.ljm.LJM_eReadAddressString(
            handle,
            resolvedAddress,
            strBuffer
        );

        // Check output value.
        if (output === 0) {
            // Parse the string buffer and get the actual string.
            var receivedStrData = strBuffer.toString(
                'utf8',
                0,
                driver_const.LJM_MAX_STRING_SIZE
            );
            var actualStr = '';
            for(var i = 0; i < receivedStrData.length; i++) {
                if(receivedStrData.charCodeAt(i) === 0) {
                    break;
                } else {
                    actualStr += receivedStrData[i];
                }
            }
            result = actualStr;
        }

        // If no error, return the result.  Otherwise throw an error.
        if (output === 0) {
            return result;
        } else {
            throw new DriverOperationError(output);
        }
    }

    /**
     * Asynchronously reads a single modbus buffer address.
     *
     * @param {Number/String} address Either an integer register address or a 
     *      String name compatible with self.LJM.
     * @param {Number} number The number of bytes to read from the device.
     * @param {function} onError Takes a single argument represenging
     *      the LJM-Error, either an integer error number or a String.
     * @param {Number/String} onSuccess Callback taking a single argument: an
     *      array containging data (as number or string elements based on data
     *      type) requested from the device.
     * @throws {DriverOperationError} If the input args aren't correct or an error occurs.
    **/
    this.LJN_readArray = function(handle, address, numReads, onError, onSuccess) {
        var output;
        var addressNumber = 0;
        var numValues = numReads;
        var addressType = driver_const.LJM_BYTE;
        var info = self.constants.getAddressInfo(address, 'R');
        // var expectedReturnType = info.type;
        addressType = info.type;
        var isDirectionValid = info.directionValid == 1;
        var isBufferRegister = false;
        if(info.data) {
            if(info.data.isBuffer) {
                isBufferRegister = true;
            }
        }

        if (info.type >= 0) {
            addressNumber = info.address;

            // Return Variable
            var errorResult = undefined;

            return self.LJM_eReadAddressArray(handle, addressNumber, addressType, numValues, onError, onSuccess);
            
        } else {
            return onError(new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error));
        }
    };
    this.LJN_readArraySync = function(handle, address, numReads) {
        var output;
        var addressNumber = 0;
        var numValues = numReads;
        var addressType = driver_const.LJM_BYTE;
        var info = self.constants.getAddressInfo(address, 'R');
        var expectedReturnType = info.type;
        addressType = info.type;
        var isDirectionValid = info.directionValid == 1;
        var isBufferRegister = false;
        var retData = [];
        
        if (info.type >= 0) {
            addressNumber = info.address;

            return self.LJM_eReadAddressArraySync(handle, addressNumber, info.type, numValues);
        } else {
            throw new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error);
        }

        if (output === 0) {
            return retData;
        } else {
            throw new DriverOperationError(output);
        }
    };

    this.LJM_eReadAddressArray = function(handle, address, type, numValues, onError, onSuccess) {
        // Perform buffer allocations
        var aValues = new Buffer(numValues * ARCH_DOUBLE_NUM_BYTES);         //Array of doubles
        var errorVal = new ref.alloc('int',1);

        // Clear all of the arrays
        aValues.fill(0);
        errorVal.fill(0);

        // Call the LJM function
        self.ljm.LJM_eReadAddressArray.async(
            handle,
            address,
            type,
            numValues,
            aValues,
            errorVal,
            function(err, res) {
                if(err) {
                    return onError(new DriverOperationError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR, 'LJM_eReadAddressArray', err.toString()));
                }
                if ( (res === 0) ) {
                    var retData = [];
                    var offset = 0;
                    for (i = 0; i < numValues; i++) {
                        retData[i] = aValues.readDoubleLE(offset);
                        offset += ARCH_DOUBLE_NUM_BYTES;
                    }
                    return onSuccess(retData);
                } else {
                    return onError(new DriverOperationError(res, 'LJM_eReadAddressArray error', errorVal.deref()));
                }
            });
    };

    this.LJM_eReadAddressArraySync = function(handle, address, type, numValues) {
        // Perform buffer allocations
        var aValues = new Buffer(numValues * ARCH_DOUBLE_NUM_BYTES);         //Array of doubles
        var errorVal = new ref.alloc('int',1);

        // Clear all of the arrays
        aValues.fill(0);
        errorVal.fill(0);

        var ljmError = self.ljm.LJM_eReadAddressArray(
            handle,
            address,
            type,
            numValues,
            aValues,
            errorVal
        );

        if (ljmError === 0) {
            var retData = [];
            var offset = 0;
            for (i = 0; i < numValues; i++) {
                retData[i] = aValues.readDoubleLE(offset);
                offset += ARCH_DOUBLE_NUM_BYTES;
            }
            return retData;
        } else {
            throw new DriverOperationError(ljmError, errorVal.deref());
        }
    };

    /**
     * Read many addresses asynchronously.
     *
     * Function performs LJM_eReadNames and LJM_eReadAddresses driver calls
     * when given certain arguments.  If addresses is type: number-array then it
     * calls LJM_eReadAddresses and, if addresses is type string-array, then it 
     * calls LJM_eReadNames.
     *  
     * @param {Array} addresses Collection of names or addresses to read.
     *      An Array of String elements will be interepreted as a collection
     *      of names while an Array of Number elements will be interepreted
     *      as a collection of addresses.
     * @param {function} onError Function to call if an error is encountered
     *      while performing the read. Should take a single string parameter
     *      describing the error encountered.
     * @param {function} onSuccess Function to call if this operation completes
     *      successfully. Not called if an error is encountered. This function
     *      should take a single arugment of type array containing elements of
     *      type number.
     * @throws {DriverInterfaceError} Thrown if addresses argument is not an
     *      Array containing at least 1 element.
    **/
    this.readMany = function(handle, addresses, onError, onSuccess) {
        //Get important info & allocate argument variables
        var length = addresses.length;
        var returnResults = Array();

        //Define buffers
        var results = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
        var errors = new ref.alloc('int',1);
        
        // Make sure buffers are empty.
        results.fill(0);
        errors.fill(0);

        if(length < 1) {
            // throw new DriverInterfaceError("Addresses array must contain data");
            return onError("Addresses array must contain data");
        }

        var addrBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
        var addrTypeBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
        var inValidOperation = 0;

        //Integer Returned by .dll function
        var info;
        var offset=0;
        var constants = self.constants;
        var i;
        for ( i=0; i<length; i++ ) {
            var address = addresses[i];

            info = constants.getAddressInfo(address, 'R');
            if (info.directionValid == 1) {
                addrTypeBuff.writeInt32LE(info.type,offset);
                addrBuff.writeInt32LE(info.address,offset);
                offset += ARCH_INT_NUM_BYTES;
            } else {
                if(info.type == -1) {
                    return onError(new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error, 'LJM_eReadAddressArray error'));
                } else if (info.directionValid === 0) {
                    return onError(new DriverOperationError(self.errors.LJME_INVALID_DIRECTION.error, 'LJM_eReadAddressArray error'));
                } else {
                    return onError(new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, 'LJM_eReadAddressArray error'));
                }
            }
        }
        errorResult = self.ljm.LJM_eReadAddresses.async(
            handle,
            length,
            addrBuff,
            addrTypeBuff,
            results,
            errors,
            function(err, res) {
                if(err) {
                    return onError(self.errors.LJN_UNEXPECTED_ASYNC_CALL_ERROR, err, 'LJM_eReadAddressArray');
                }
                var offset = 0;
                for (i = 0; i < addresses.length; i++) {
                    returnResults[i] = results.readDoubleLE(offset);
                    offset += ARCH_DOUBLE_NUM_BYTES;
                }
                if ((res === 0)) {
                    return onSuccess(returnResults);
                } else {
                    return onError(new DriverOperationError(res, 'LJM_eReadAddressArray error', errorVal.deref()));
                }
            }
        );
    };

    /**
     * Read many addresses. Synchronous version of readMany.
     *
     * Function performs LJM_eReadNames and LJM_eReadAddresses driver calls
     * when given certain arguments.  If addresses is type: number-array then it
     * calls LJM_eReadAddresses and, if addresses is type string-array, then it 
     * calls LJM_eReadNames.
     *  
     * @param {Array} addresses Collection of names or addresses to read.
     *      An Array of String elements will be interepreted as a collection
     *      of names while an Array of Number elements will be interepreted
     *      as a collection of addresses.
     * @return {Array} Array of double register values.
     * @throws {DriverInterfaceError} Thrown if addresses argument is not an
     *      Array containing at least 1 element.
    **/
    this.readManySync = function(handle, addresses) {
        //Get important info & allocate argument variables
        var length = addresses.length;
        var returnResults = Array();

        //Define buffers
        var results = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
        var errors = new ref.alloc('int',1);

        //Make sure buffers are empty
        results.fill(0);
        errors.fill(0);

        var i = 0;
        var offset = 0;

        if ( length < 1 ) {
            throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, 'Addresses array must contain data', i);
        }

        var addrBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
        var addrTypeBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
        var inValidOperation = 0;
        //Integer Returned by .dll function
        var info;
        var offset=0;
        var constants = self.constants;
        var i;
        for ( i=0; i<length; i++ ) {
            var address = addresses[i];

            info = constants.getAddressInfo(address, 'R');
            if (info.directionValid == 1) {
                addrTypeBuff.writeInt32LE(info.type,offset);
                addrBuff.writeInt32LE(info.address,offset);
                offset += ARCH_INT_NUM_BYTES;
            } else {
                if(info.type == -1) {
                    throw new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error, 'Invalid Address', i);
                } else if (info.directionValid === 0) {
                    throw new DriverOperationError(self.errors.LJME_INVALID_DIRECTION.error, 'Invalid Read Attempt', i);
                } else {
                    throw new DriverOperationError(self.errors.LJN_INVALID_ARGUMENTS.error, 'Unexpected Error', i);
                }
            }
        }
        //Execute LJM command
        errorResult = self.ljm.LJM_eReadAddresses(
            handle,
            length,
            addrBuff,
            addrTypeBuff,
            results,
            errors
        );

        if(errorResult === 0) {
            offset = 0;
            i = 0;
            for(i in addresses) {
                returnResults[i] = results.readDoubleLE(offset);
                offset += ARCH_DOUBLE_NUM_BYTES;
            }
            return returnResults;
        } else {
            throw new DriverOperationError(self.errors.LJME_INVALID_ADDRESS.error,'Invalid Address',i,returnResults);
        }
    };
};