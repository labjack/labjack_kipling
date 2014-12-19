/**
 * Wrapper around LabJack LJM driver.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
**/

var driver_const = require('./driver_const');
var ref = require('ref');//http://tootallnate.github.io/ref/#types-double
var util = require('util');//
var driverLib = require('./driver_wrapper');
var jsonConstants = require('./json_constants_parser');
var ffi = require('ffi');//

var LIST_ALL_EXTENDED_MAX_NUM_TO_FIND = driver_const.LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;

var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

// For problems encountered while in driver DLL
function DriverOperationError(code,description) {
    this.code = code;
    this.description = description;
    console.log('in DriverOperationError',code,description);
}


// For problem with using this layer
function DriverInterfaceError(description) {
    this.description = description;
}


/**
 * Constructor for an object acting as LJM driver wrapper.
 */
exports.ljmDriver = function() {
    this.ljm = driverLib.getDriver();
    this.constants = jsonConstants.getConstants();

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

        var self = this;
        if ((isNaN(devT)) && (isNaN(conT))) {
            errorResult = this.ljm.LJM_ListAllS.async(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses, 
                function (err, res) {
                    if (err) throw err;
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
                        return onError(res);
                    }
                }
            );
            return 0;
        } else if ((!isNaN(devT))&&(!isNaN(conT))) {
            errorResult = this.ljm.LJM_ListAll.async(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses, 
                function (err, res){
                    if(err) throw err;
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
                        return onError(res);
                    }
                }
            );
            return 0;
        } else {
            return onError("Weird-Error, listAll");
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
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
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
            errorResult = this.ljm.LJM_ListAllS(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses
            );
        } else if ((!isNaN(devT)) && (!isNaN(conT))) {
            errorResult = this.ljm.LJM_ListAll(
                devT, 
                conT, 
                numFound, 
                aDeviceTypes, 
                aConnectionTypes, 
                aSerialNumbers, 
                aIPAddresses
            );
        } else {
            throw new DriverInterfaceError("Weird-Error, listAll");
            return "Weird-Error, listAll";
        }
        if (errorResult === 0) {
            var devArray = this.buildListAllArray(
                numFound,
                aDeviceTypes,
                aConnectionTypes,
                aSerialNumbers,
                aIPAddresses
            );
            return devArray;
        } else {
            throw new DriverOperationError(errorResult);
            return errorResult;
        }

    };
    this.interpretResult = function(buffer,type,index) {
        var retVar;
        var strInterpret = function(input) {
            var output = '';
            var i = 0;
            while(input.charCodeAt(i) !== 0) {
                output += input[i];
                i += 1;
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
            throw new DriverInterfaceError(message);
        }

        if (typeof(regs) !== 'object') {
            message = 'Invalid Argument parsed as desired read registers';
            return onErr(message);
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
            var info = this.constants.getAddressInfo(reg, 'R');
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

        var self = this;
        errorResult = this.ljm.LJM_ListAllExtended.async(
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
                if (err) throw err;
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
                    console.log('LJM_ListAllExtended Err');
                    console.log(self.errToStrSync(res));
                    return onErr(res);
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
            throw new DriverInterfaceError(message);
        }

        if (typeof(regs) !== 'object') {
            console.log(regs,typeof(regs));
            message = 'Invalid Argument parsed as desired read registers-listAllExtendedSync';
            throw new DriverInterfaceError(message);
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
            var info = this.constants.getAddressInfo(reg, 'R');
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

        var self = this;
        errorResult = this.ljm.LJM_ListAllExtended(
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
            throw new DriverOperationError(errorResult,self.errToStrSync(errorResult));
            return 'DriverOperationError: ' + errorResult.toString() + ', ' + self.errToStrSync(errorResult);
        }
        
    };

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
        errorResult = this.ljm.LJM_ErrorToString.async(
            errNum, 
            strRes, 
            function (err, res){
                if (err) throw err;
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
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
     */
    this.errToStrSync = function(errNum) {
        var errorResult=0;

        var strRes = new Buffer(50);
        strRes.fill(0);

        errorResult = this.ljm.LJM_ErrorToString(errNum, strRes);
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
        errorResult = this.ljm.LJM_LoadConstants.async(
            function (err, res){
                if (err) throw err;
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(res);
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
        errorResult = this.ljm.LJM_LoadConstants();
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
        errorResult = this.ljm.LJM_CloseAll.async(
            function (err, res){
                if (err) throw err;
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(res);
                }
            }
        );
        return 0;
    };

    /**
     * Synchronous version of closeAll.
     *
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
     */
    this.closeAllSync = function() {
        var errorResult;
        errorResult = this.ljm.LJM_CloseAll();
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

            errorResult = this.ljm.LJM_ReadLibraryConfigS.async(
                parameter, 
                returnVar, 
                function (err, res){
                    if (err) throw err;
                    if (res === 0) {
                        return onSuccess(returnVar.deref());
                    } else {
                        return onError(res);
                    }
                }
            );
            return 0;
        } else {
            return onError('Invalid Input Parameter Type');
        }
    };
    
    /**
     * Synchronous version of readLibrary.
     *
     * @param  {string} parameter The name of the configuration setting to read.
     * @return {number} The value of the provided configuration setting.
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
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

            errorResult = this.ljm.LJM_ReadLibraryConfigS(
                parameter, 
                returnVar
            );
            if (errorResult !== 0) {
                return errorResult;
            }
            return returnVar.deref();
        } else {
            throw DriverInterfaceError('Invalid Input Parameter Type');
            return 'Invalid Input Parameter Type';
        }
    };
    this.readLibraryS = function (parameter, onError, onSuccess) {
        if (isNaN(parameter)) {
            var errorResult;

            //Allocate a buffer for the result
            var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
            //Clear the buffer
            strBuffer.fill(0);

            errorResult = this.ljm.LJM_ReadLibraryConfigStringS.async(
                parameter,
                strBuffer,
                function (err, res){
                    if (err) throw err;
                    if ( res === 0 ) {
                        //Calculate the length of the string
                        var i=0;
                        while(strBuffer[i] !== 0) {
                            i++;
                        }
                        return onSuccess(strBuffer.toString('utf8',0,i));
                    } else {
                        return onError(res);
                    }
                }
            );
            return 0;
        } else {
            return onError('Invalid Input Parameter Type');
        }
    };
    this.readLibrarySSync = function (parameter) {
        if(isNaN(parameter)) {
            var errorResult;
            //Allocate a buffer for the result
            var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
            //Clear the buffer
            strBuffer.fill(0);

            errorResult = this.ljm.LJM_ReadLibraryConfigStringS(
                parameter,
                strBuffer
            );
            if (errorResult !== 0) {
                //Calculate the length of the string
                var i=0;
                while(strBuffer[i] !== 0) {
                    i++;
                }
                return strBuffer.toString('utf8',0,i);
            }
            return strBuffer.toString('utf8',0,i);
        } else {
            throw DriverInterfaceError('Invalid Input Parameter Type');
            return 'Invalid Input Parameter Type';
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
            errorResult = this.ljm.LJM_WriteLibraryConfigS.async(
                parameter, 
                value, 
                function (err, res) {
                    if (err) throw err;
                    if (res === 0) {
                        return onSuccess();
                    } else {
                        return onError(res);
                    }
                }
            );
            return 0;
        } else if((isNaN(parameter))&&(isNaN(value))) {

            errorResult = this.ljm.LJM_WriteLibraryConfigStringS.async(
                parameter, 
                value, 
                function (err, res) {
                    if (err) throw err;
                    if (res === 0) {
                        return onSuccess();
                    } else {
                        return onError(res);
                    }
                }
            );
            return 0;
        } else {
            return onError('Invalid Input Parameter Types');
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
            errorResult = this.ljm.LJM_WriteLibraryConfigS(
                parameter, 
                value
            );
        } else if ((isNaN(parameter))&&(isNaN(value))) {
            errorResult = this.ljm.LJM_WriteLibraryConfigStringS(
                parameter, 
                value
            );
        } else {
            throw DriverInterfaceError('Invalid Input Parameter Types');
            return 'Invalid Input Parameter Types';
        }
        //Check for an error from driver & throw error
        if (errorResult !== 0) {
            throw new DriverOperationError(errorResult);
            return errorResult;
        } else {
            return 0;
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
            onError('wrong types');
            return 0;
        }
        var errorResult;
        if(str.length >= driver_const.LJM_MAX_STRING_SIZE) {
            onError('string to long');
            return 0;
        }
        errorResult = this.ljm.LJM_Log.async(
            level, 
            str,
            function (err, res) {
                if (err) throw err;
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(res);
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
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
    **/
    this.logSync = function(level, str) {
        str = str.toString();
        if ((isNaN(level))||(!isNaN(str))) {
            throw new DriverInterfaceError('wrong types');
            return 'wrong types';
        }
        var errorResult;
        if(str.length >= driver_const.LJM_MAX_STRING_SIZE) {
            throw new DriverInterfaceError('string to long');
        }

        errorResult = this.ljm.LJM_Log(level, str);
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
        errorResult = this.ljm.LJM_ResetLog.async(
            function (err, res) {
                if (err) throw err;
                if (res === 0) {
                    return onSuccess();
                } else {
                    return onError(res);
                }
            }
        );
    };

    /**
     * Synchronously calls resetLog.
     *
     * @throws {DriverInterfaceError} Thrown if an exception is encountered in
     *      the Node.js wrapper around the driver.
     * @throws {DriverOperationError} Thrown if an exception is encountered in
     *      the LJM driver itself.
     */
    this.resetLogSync = function() {
        var errorResult;
        errorResult = this.ljm.LJM_ResetLog();
        if (errorResult !== 0) {
            return errorResult;
        }
        return 0;
    };

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
};