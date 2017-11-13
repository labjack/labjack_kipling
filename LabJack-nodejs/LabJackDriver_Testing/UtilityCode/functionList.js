var functionLocation = {
	//Device Functions
	'open': 'device',
	'readRaw': 'device',
	'read': 'device',
	'readArray': 'device',
	'readMany': 'device',
	'writeRaw': 'device',
	'write': 'device',
	'writeArray': 'device',
	'writeMany': 'device',
	'getHandleInfo': 'device',
	'close': 'device',
	'rwMany': 'device',
	'readUINT64': 'device',
	'streamStart': 'device',
	'streamRead': 'device',
	'streamStop': 'device',
	'isAuthorized': 'device',

	//Driver Functions
	'listAll': 'driver',
	'listAllExtended': 'driver',
	'openAll': 'driver',
	'errToStr': 'driver',
	'loadConstants': 'driver',
	'closeAll': 'driver',
	'readLibrary': 'driver',
	'readLibraryS': 'driver',
	'writeLibrary': 'driver',
	'logS': 'driver',
	'resetLog': 'driver',
	'controlLog': 'driver',
	'enableLog': 'driver',
	'disableLog': 'driver',
};
exports.getList = function() {
	return functionLocation;
};
exports.search = function(arg) {
	console.log(arg);
	return functionLocation[arg];
};