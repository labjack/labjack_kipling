
var q = require('q');

var io_manager;
var io_interface;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

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

exports.basic_test = {
	'setUp': function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	},
	'tearDown': function(callback) {
		callback();
	},
	'require io_manager': function(test) {
		// Require the io_manager
		try {
			io_manager = require('../lib/io_manager');
		} catch(err) {
			stopTest(test, err);
		}
		

		var keys = Object.keys(io_manager);
		test.deepEqual(keys, ['io_interface'], 'io_manager not required properly');
		test.done();
	},
	'create new io_interface': function(test) {
		io_interface = io_manager.io_interface();

		var keys = Object.keys(io_interface);
		var requiredKeys = [
			'driver_manager',
			'device_manager',
			'logger_manager',
			'file_io_manager'
		];
		var foundRequiredKeys = true;
		requiredKeys.forEach(function(requiredKey) {
			if (keys.indexOf(requiredKey) < 0) {
				foundRequiredKeys = false;
				var mesg = 'io_interface missing required key: ' + requiredKey;
				test.ok(false, mesg);
				process.exit(1);
			} else {
				test.ok(true);
			}
		});
		// var msg = 'io_interface not created properly';
		// test.deepEqual(keys, expectedKeys, msg);
		test.done();
	},
	'initialize io_interface': function(test) {
			qRunner(test, io_interface.initialize)
			.then(function(res) {
				test.ok(true, res);
				setTimeout(test.done, 5000);
			});	
	},
	'destroy io_interface': function(test) {
		qRunner(test, io_interface.destroy)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});
	},
};
