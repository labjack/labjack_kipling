// Require npm modules
var q = require('q');

// master_process object
var mp;
var mpEventEmitter;

var DEBUG_TEST = false;
var print = function(argA, argB) {
    if(DEBUG_TEST) {
        var msg = 'AT:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};


exports.tests = {
	'test 0_11_13<->0_10_33': function(test) {
		test.done();
	}
};
exports.setImports = function(imports) {
	process_manager = imports.process_manager;
	utils = imports.utils;
	getExecution = utils.getExecution;
};
