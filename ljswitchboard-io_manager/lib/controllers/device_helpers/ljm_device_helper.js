
var q = require('q');

var getDeviceAttribute = function(device, attribute, isRegister) {
	var saveAttribute = function(bundle) {
		var defered = q.defer();
		var onSucc = function(res) {
			bundle[attribute] = {'result': res};
			defered.resolve(bundle);
		};
		var onErr = function(err) {
			bundle[attribute] = {'result': "----", 'error': err};
			defered.resolve(bundle);
		};

		if(isRegister) {
			// Perform Device IO & save result to bundle
			device.read(attribute)
			.then(onSucc, onErr);
		} else {
			// Perform query for Device Attribute
			device[attribute]()
			.then(onSucc, onErr);
		}
		return defered.promise;
	};
	return saveAttribute;
};
var getDeviceKey = function(device) {
	var defered = q.defer();

	var bundle = {};
	getDeviceAttribute(device, 'deviceType')(bundle)
	.then(getDeviceAttribute(device, 'connectionType'))
	.then(getDeviceAttribute(device, 'serialNumber'))
	.then(function(bundle) {
		var key = bundle.deviceType.toString() + '_';
		key += bundle.connectionType.toString() + '_';
		key += serialNumber.toString();

		defered.resolve(key);
	});
	return defered.promise;
};
exports.getKey = getKey;