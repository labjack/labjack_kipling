
var path = require('path');


var data_collector;
var config_loader = require('../../lib/config_loader');

var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');


exports.tests = {
	'Require data_collector': function(test) {
		try {
			data_collector = require('../../lib/data_collector');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading data_collector');
		}
		test.done();
	},
};