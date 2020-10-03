var assert = require('chai').assert;

var io_manager;
var io_interface;

var initialize = function(done) {
	// Require the io_manager library
	io_manager = require.main.require('ljswitchboard-io_manager');

	// Require the io_interface that gives access to the ljm driver,
	// device controller, logger, and file_io_controller objects.
	io_interface = io_manager.io_interface();

	io_interface.initialize()
	.then(function(res) {
		done();
	});
};
exports.initialize = initialize;

var destruct = function(done) {
	setTimeout(function() {
		io_interface.destroy()
		.then(function(res) {
			// io_interface process has been shut down
			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'io_interface failed to shut down' + JSON.stringify(err));
			done();
		});
	}, 2);
};
exports.destruct = destruct;


