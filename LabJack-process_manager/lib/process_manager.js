'use strict';

/**
 * Entry point for the rest of the module.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

const master_process = require('./master_process');
const constants = require('./process_manager_constants');

exports.master_process = master_process.NewMasterProcess;
exports.slave_process = function() {
	return require('./slave_process');
};

exports.constants = constants;

/**
example master process:

var pm = require('./process_manager');
var mp = new pm.master_process();
mp.init();
mp.qStart('[your_new_child_process_to_fork]');

**/
