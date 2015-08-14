

/*
This file is the basic test for the data_group_manager object.

It tests for syntax errors (ability to properly require & use) as well as some
basic functionality.

*/
var path = require('path');
var q = require('q');
var async = require('async');

var data_group_manager;

/* Code that is required to load a logger-configuration */
var config_loader = require('../../lib/config_loader');
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');
var basic_config = undefined;

var driver_const = require('ljswitchboard-ljm_driver_constants');


/* What devices should be logged from */
data_groups = [
{
	'serialNumber': 1,
	'isFound': true,
},
{
	'serialNumber': 2,
	'isFound': true,
},
{
	'serialNumber': 3,
	'isFound': false,
}
];



/*
Begin defining test cases.
*/
exports.basic_tests = {
	'Require data_group_manager': function(test) {
		try {
			data_group_manager = require('../../lib/data_group_manager');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading data_group_manager');
		}
		test.done();
	},
	
};