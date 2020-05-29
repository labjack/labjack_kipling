
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var package_loader = require.main.require('ljswitchboard-package_loader');

var io_manager;
var io_interface;

var initialize = function(test) {
	// Require the io_manager library
	io_manager = require.main.require('ljswitchboard-io_manager');

	// Require the io_interface that gives access to the ljm driver, 
	// device controller, logger, and file_io_controller objects.
	io_interface = io_manager.io_interface();

	io_interface.initialize()
	.then(function(res) {
		test.done();
	});
};
exports.initialize = initialize;

var destruct = function(test) {
	setTimeout(function() {
		io_interface.destroy()
		.then(function(res) {
			// io_interface process has been shut down
			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'io_interface failed to shut down' + JSON.stringify(err));
			test.done();
		});
	}, 2);
};
exports.destruct = destruct;


