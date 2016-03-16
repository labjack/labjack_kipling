

var LJM_FUNCTIONS = {};

LJM_FUNCTIONS.LJM_AddressesToMBFB = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'MaxBytesPerMBFB': 		'int'},
		{'aAddresses': 				'a-int*'},
		{'aTypes': 					'a-int*'},
		{'aWrites': 				'a-int*'},
		{'aNumValues': 				'a-int*'},
		{'aValues': 				'a-double*'},
		{'NumFrames': 				'int*'},
		{'aMBFBCommand': 			'a-char*'},
	],
};

LJM_FUNCTIONS.LJM_MBFBComm = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'UnitID': 					'char'},
		{'aMBFB': 					'a-char*'},
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_UpdateValues = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'aMBFBResponse': 			'a-char*'},
		{'aTypes': 					'a-int*'},
		{'aWrites': 				'a-int*'},
		{'aNumValues': 				'a-int*'},
		{'NumFrames': 				'int'},
		{'aValues': 				'a-double*'},
	]
};

LJM_FUNCTIONS.LJM_NamesToAddresses = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'NumFrames': 				'int'},
		{'aNames': 					'a-char**'},
		{'aAddresses': 				'a-int*'},
		{'aTypes': 					'a-int*'},
	]
};

LJM_FUNCTIONS.LJM_NameToAddress = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Name': 					'string'},
		{'Address': 				'int*'},
		{'Type': 					'int*'},
	]
};

LJM_FUNCTIONS.LJM_AddressesToTypes = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'NumAddress': 				'int'},
		{'aAddresses': 				'a-int*'},
		{'aTypes': 					'a-int*'},
	]
};

LJM_FUNCTIONS.LJM_AddressToType = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Address': 				'int'},
		{'Type': 					'int*'},
	]
};

LJM_FUNCTIONS.LJM_ListAll = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'int'},
		{'ConnectionType': 			'int'},
		{'NumFound': 				'int*'},
		{'aDeviceTypes': 			'a-int*'},
		{'aConnectionTypes': 		'a-int*'},
		{'aSerialNumbers': 			'a-int*'},
		{'aIPAddresses': 			'a-int*'},
	]
};

LJM_FUNCTIONS.LJM_ListAllS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'string'},
		{'ConnectionType': 			'string'},
		{'NumFound': 				'int*'},
		{'aDeviceTypes': 			'a-int*'},
		{'aConnectionTypes': 		'a-int*'},
		{'aSerialNumbers': 			'a-int*'},
		{'aIPAddresses': 			'a-int*'},
	]
};

LJM_FUNCTIONS.LJM_ListAllExtended = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'int'},
		{'ConnectionType': 			'int'},
		{'NumAddresses': 			'int'},
		{'aAddresses': 				'a-int*'},
		{'aNumRegs': 				'a-int*'},
		{'MaxNumFound': 			'int'},
		{'NumFound': 				'int*'},
		{'aDeviceTypes': 			'a-int*'},
		{'aConnectionTypes': 		'a-int*'},
		{'aSerialNumbers': 			'a-int*'},
		{'aIPAddresses': 			'a-int*'},
		{'aBytes': 					'a-char*'},
	]
};

LJM_FUNCTIONS.LJM_Open = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'int'},
		{'ConnectionType': 			'int'},
		{'Identifier': 				'string'},
		{'handle': 					'int*'},
	]
};

LJM_FUNCTIONS.LJM_OpenS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'string'},
		{'ConnectionType': 			'string'},
		{'Identifier': 				'string'},
		{'handle': 					'int*'},
	]
};

LJM_FUNCTIONS.LJM_GetHandleInfo = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'DeviceType': 				'int*'},
		{'ConnectionType': 			'int*'},
		{'SerialNumber': 			'int*'},
		{'IPAddress': 				'uint*'},
		{'Port': 					'int*'},
		{'MaxBytesPerMB': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_NumberToIP = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Number': 					'int'},
		{'IPv4String': 				'ex-char*'},
	]
};

LJM_FUNCTIONS.LJM_ErrorToString = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'ErrCode': 				'int'},
		{'ErrString': 				'int*'},
	]
};

LJM_FUNCTIONS.LJM_LoadConstants = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': []						//No Args
};

LJM_FUNCTIONS.LJM_Close = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
	]
};

LJM_FUNCTIONS.LJM_CloseAll = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': []						//No Args
};

LJM_FUNCTIONS.LJM_WriteRaw = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'aData': 					'a-char*'},
		{'NumBytes': 				'int'},
	]
};

LJM_FUNCTIONS.LJM_ReadRaw = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'aData': 					'a-char*'},
		{'NumBytes': 				'int'},
	]
};

LJM_FUNCTIONS.LJM_eWriteAddress = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'Type': 					'int'},
		{'Value': 					'double'},
	]
};

LJM_FUNCTIONS.LJM_eReadAddress = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'Type': 					'int'},
		{'Value': 					'double*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteName = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'Value': 					'double'},
	]
};

LJM_FUNCTIONS.LJM_eReadName = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'Value': 					'double*'},
	]
};

LJM_FUNCTIONS.LJM_eReadAddresses = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},		// (Number of Registers being accessed)
		{'aAddresses': 				'a-int*'},	// (Registers to read from)
		{'aTypes': 					'a-int*'},
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};
LJM_FUNCTIONS.LJM_eReadNames = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},		// (Number of Registers being accessed)
		{'aNames': 					'a-char**'},	// (Registers to read from)
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eReadAddressArray = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'Type': 					'int'},
		{'NumValues': 				'int'},
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eReadNameArray = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'NumValues': 				'int'},
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteAddresses = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},		// (Number of Registers being accessed)
		{'aAddresses': 				'a-int*'},	// (Registers to write to)
		{'aTypes': 					'a-int*'},
		{'aValues': 				'a-double*'},	// (Values to write)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteNames = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},		// (Number of Registers being accessed)
		{'aNames': 					'a-char*'},	// (Registers to write to)
		{'aValues': 				'a-double*'},	// (Values to write)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteAddressArray = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'Type': 					'int'},
		{'NumValues': 				'int'},
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteNameArray = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'NumValues': 				'int'},
		{'aValues': 				'a-double*'},	// (Readings)
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eAddresses = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},
		{'aAddresses': 				'a-int*'},
		{'aTypes': 					'a-int*'},
		{'aWrites': 				'a-int*'},	// (Directions)
		{'aNumValues': 				'a-int*'},
		{'aValues': 				'a-double*'},
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eNames = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumFrames': 				'int'},
		{'aNames': 					'a-char**'},
		{'aWrites': 				'a-int*'},	// (Directions)
		{'aNumValues': 				'a-int*'},
		{'aValues': 				'a-double*'},
		{'ErrorAddress': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eStreamStart = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'ScansPerRead': 			'int'},
		{'NumAddresses': 			'int'},
		{'aScanList': 				'a-int*'},
		{'ScanRate': 				'double*'},
	]
};

LJM_FUNCTIONS.LJM_eStreamRead = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'aData': 					'a-double*'},
		{'DeviceScanBacklog': 		'int*'},
		{'LJMScanBacklog': 			'int*'},
	]
};

LJM_FUNCTIONS.LJM_eStreamStop = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
	]
};

LJM_FUNCTIONS.LJM_StreamBurst = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'NumAddresses': 			'int'},
		{'aScanList': 				'a-int*'},
		{'ScanRate': 				'double*'},
		{'NumScans': 				'uint'},
		{'aData': 					'a-double*'},
	]
};

LJM_FUNCTIONS.LJM_eReadNameString = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'String': 					'char*'},
	]
};

LJM_FUNCTIONS.LJM_eReadAddressString = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'String': 					'char*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteNameString = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Name': 					'string'},
		{'String': 					'char*'},
	]
};

LJM_FUNCTIONS.LJM_eWriteAddressString = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Handle': 					'int'},
		{'Address': 				'int'},
		{'String': 					'char*'},
	]
};

LJM_FUNCTIONS.LJM_WriteLibraryConfigS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Parameter': 				'string'},
		{'Value': 					'double'},
	]
};

LJM_FUNCTIONS.LJM_WriteLibraryConfigStringS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Parameter': 				'string'},
		{'String': 					'string'},
	]
};

LJM_FUNCTIONS.LJM_ReadLibraryConfigS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Parameter': 				'string'},
		{'Value': 					'double*'},
	]
};

LJM_FUNCTIONS.LJM_ReadLibraryConfigStringS = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Parameter': 				'string'},
		{'String': 					'ex-char*'},
	]
};

LJM_FUNCTIONS.LJM_LoadConfigurationFile = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'FileName': 				'string'},
	]
};

LJM_FUNCTIONS.LJM_GetSpecificIPsInfo = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'InfoHandle':				'int*'},
		{'Info':					'char**'},
	]
};

LJM_FUNCTIONS.LJM_CleanInfo = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'InfoHandle': 				'int'},
	]
};

LJM_FUNCTIONS.LJM_Log = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'Level': 					'int'},
		{'String': 					'string'},
	]
};

LJM_FUNCTIONS.LJM_ResetLog = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': []						//No Args
};

/*
 * Define some internal LJM functions.  These functions should not be used by
 * third party applications as they may change at any given point in time.  They
 * are meant for alpha/beta testing and internal use only.
 */

LJM_FUNCTIONS.Internal_LJM_OpenAll = {
	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
	'args': [
		{'DeviceType': 				'int'},
		{'ConnectionType': 			'int'},
		{'NumOpened': 				'int*'},
		{'aHandles': 				'a-int*'},
		{'NumErrors': 				'int*'},
		{'InfoHandle':				'int*'},
		{'Info':					'char**'},
	]
};



var functionNames = Object.keys(LJM_FUNCTIONS);
functionNames.forEach(function(functionName) {
	var functionRef = LJM_FUNCTIONS[functionName];
	functionRef.name = functionName;
	
	functionRef.returnArgNames = [];
	functionRef.returnArgTypes = [];
	functionRef.ret.forEach(function(ret) {
		var retKeys = Object.keys(ret);
		var retKey = retKeys[0];
		functionRef.returnArgNames.push(retKey);
		functionRef.returnArgTypes.push(ret[retKey]);
	});

	functionRef.requiredArgNames = [];
	functionRef.requiredArgTypes = [];
	functionRef.args.forEach(function(arg) {
		var argKeys = Object.keys(arg);
		var argKey = argKeys[0];
		functionRef.requiredArgNames.push(argKey);
		functionRef.requiredArgTypes.push(arg[argKey]);
	});
});
exports.LJM_FUNCTIONS = LJM_FUNCTIONS;