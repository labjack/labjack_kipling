

global.ljswitchboardData = {};

var gns = 'ljswitchboardData';
exports.setNameSpace = function(namespace) {
	global[namespace] = {};
	var curKeys = Object.keys(global[gns]);
	curKeys.forEach(function(curKey) {
		global[namespace][curKey] = global[gns][curKey];
		global[gns][curKey] = null;
		delete global[gns][curKey];
	});
	global[gns] = null;
	delete global[gns];

	gns = namespace;
};
exports.loadPackage = function(packageLocation) {
	try {
		if(require) {
			global[gns][packageLocation] = require(packageLocation);
		} else {
			global[gns][packageLocation] = global.require(packageLocation);
		}
	} catch (err) {
		console.error('Failed to load package', err);
	}
	
};