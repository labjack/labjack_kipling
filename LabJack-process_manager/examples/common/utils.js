var q = require('q');

// define a q function that will be used to call the master_process object
var getExecution = function(obj, func, argA, argB) {
	return function(bundle) {
		var defered = q.defer();
		obj[func](argA, argB)
		.then(function(data) {
			bundle.push({'functionCall':func, 'retData': data});
			defered.resolve(bundle);
		}, function(err) {
			bundle.push({'functionCall':func, 'errData': err});
			defered.resolve(bundle);
		});
		return defered.promise;
	};
};

exports.getExecution = getExecution;