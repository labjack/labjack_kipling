
console.log('in device_selector view_generator.js');

var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var q = global.require('q');

var createDeviceSelectorViewGenerator = function() {

	this.displayScanResults = function(scanResults) {
		var defered = q.defer();

		defered.resolve();
		return defered.promise;
	};
	var self = this;
};