var functionLocation = {
	//Device Functions
	'open': 'device',
	'readRaw': 'device',
	'read': 'device',
	'readMany': 'device',
	'writeRaw': 'device',
	'write': 'device',
	'writeMany': 'device',
	'getHandleInfo': 'device',
	'close': 'device',
	'rwMany': 'device',

	//Driver Functions
	'listAll': 'driver',
	'errToStr': 'driver',
	'loadConstants': 'driver',
	'closeAll': 'driver',
	'readLibrary': 'driver',
	'writeLibrary': 'driver',
	'logS': 'driver',
	'resetLog': 'driver',
};
exports.getList = function() {
	return functionLocation
}
exports.search = function(arg) {
	console.log(arg);
	return functionLocation[arg];
}