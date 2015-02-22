
var async = require('async');
var dict = require('dict');
var q = require('q');
var driver_const = require('labjack-nodejs').driver_const;



var getVersion = function(device) {
	var defered = q.defer();

	defered.resolve(1.1);
	return defered.promise;
};

exports.getVersion = getVersion;