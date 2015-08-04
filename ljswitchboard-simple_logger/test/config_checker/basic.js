
var path = require('path');


var config_checker;
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');

var testFiles = [{
	'name': 'Invalid .json file',
	'file_name': 'invalid_json_file.json',
	'pass': false,
	'partial_err_str': 'Invalid .json file',
}, {
	'name': 'Missing Core Keys',
	'file_name': 'missing_core_keys.json',
	'pass': false,
	'partial_err_str': 'Missing keys: ',
}, {
	'name': 'Undefined data groups',
	'file_name': 'undefined_data_groups.json',
	'pass': false,
	'partial_err_str': 'Missing defined data_groups',
}, {
	'name': 'Undefined view',
	'file_name': 'undefined_views.json',
	'pass': false,
	'partial_err_str': 'Missing defined views',
}, {
	'name': 'Passing test/basic_config',
	'file_name': 'basic_config.json',
	'pass': true,
}];

exports.tests = {
	'Require config_checker': function(test) {
		try {
			config_checker = require('../../lib/config_checker');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading config_checker');
		}
		test.done();
	},
};

function createConfigCheckerTest (options) {
	exports.tests[options.name] = function(test) {
		var filePath = path.join(logger_config_files_dir, options.file_name);
		config_checker.verifyConfigFile(filePath)
		.then(function(results) {
			if(options.pass) {
				test.ok(true, 'Test is supposed to pass');
			} else {
				test.ok(false, 'Test should have failed: ' + options.name);
			}
			test.done();
		}, function(error) {

			test.equals(error.isValid, false, 'isValid should be false: ' + options.name);
			if(options.pass) {
				test.ok(false, 'Test is supposed to fail: ' + options.name);
			} else {
				test.ok(true, 'Test is supposed to fail');
				var searchRes = error.message.indexOf(options.partial_err_str);
				if(searchRes >= 0) {
					test.ok(true, 'Partial error string was found');
				} else {
					test.ok(false, 'Partial error string was not found: ' + JSON.stringify(error.message, null, 2));
				}
			}
			test.done();
		});
	};
}
testFiles.forEach(createConfigCheckerTest);
