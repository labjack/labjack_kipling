
var q = require('q');
var util = require('util');

var qRunner = function(test, func) {
	var defered = q.defer();
	try {
		func()
		.then(function(res) {
			defered.resolve(res);
		}, function(err) {
			console.log('qRunner defered error err', err);
			test.ok(false, err);
			test.done();
		}, function(err) {
			console.log('qRunner syntax error err', err);
			test.ok(false, err);
			test.done();
		});
	} catch(err) {
			console.log('qRunner critical error err', err);
			test.ok(false, err);
			test.done();
		}
	return defered.promise;
};
exports.qRunner = qRunner;

// define a q function that calls an object's function and saves data into an 
// array
var qExec = function(obj, func, argA, argB, argC) {
	return function(bundle) {
		var defered = q.defer();
		obj[func](argA, argB, argC)
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
exports.qExec = qExec;

var pResults = function(results, pIndividual, expectedErrorsList) {
	var defered = q.defer();
	var numSuccess = 0;
	var numFail = 0;
	if(pIndividual) {
		console.log(' - Num Results', results.length);
	}
	results.forEach(function(result) {
		var message = '   - ';
		var data;
		var keys = Object.keys(result);
		if(keys.indexOf('retData') >= 0) {
			message += 'Success: ';
			data = result.retData;
			numSuccess += 1;
		} else {
			if(expectedErrorsList.indexOf(result.functionCall) < 0) {
				message += 'Error: ';
				data = result.errData;
				numFail += 1;
			} else {
				message += 'Expected Error: ';
				data = result.errData;
				numSuccess += 1;
			}
			
		}
		message += result.functionCall;
		if(pIndividual) {
			console.log(message + util.format(', %j',data));
		}
	});

	if(!pIndividual) {
		var num = results.length;
		var ratio = (numSuccess/num*100).toFixed(3);
		console.log(' - Num Results %d, %d% successful', num, ratio);
	}
	
	defered.resolve(results);
	return defered.promise;
};
exports.pResults = pResults;
