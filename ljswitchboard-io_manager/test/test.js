var io_manager;
var io_interface;

exports.basic_test = {
	'require io_manager': function(test) {
		// Require the io_manager
		io_manager = require('../lib/io_manager');

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
			} else {
				test.ok(true);
			}
		});
		// var msg = 'io_interface not created properly';
		// test.deepEqual(keys, expectedKeys, msg);
		test.done();
	},
	'initialize io_interface': function(test) {
		io_interface.initialize();
	}
};
