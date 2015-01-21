/**
 * Entry point for the rest of the module.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

var master_process = require('./master_process');
var slave_process = require('./slave_process');
var constants = require('./process_manager_constants');

exports.master_process = master_process.createNewMasterProcess;
exports.slave_process = function() {
	return slave_process;
};

exports.getStats = function() {
	return {
		'master_process': master_process.getStats(),
		'slave_process': slave_process.getStats()
	};
};
exports.constants = constants;


/**
example master process:

var pm = require('./process_manager');
var mp = new pm.master_process();
mp.init();
mp.qStart('[your_new_child_process_to_fork]');

**/