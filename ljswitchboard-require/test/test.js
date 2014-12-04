
var rek = require('rekuire');
var ljs_req = rek('ljswitchboard-require');
var req = ljs_req.require;
var path = require('path');

var testDirectory = process.cwd().split(path.sep).join('/') + '/test';
var expectedDirectories = [''];
exports.basic_test = {
	'add a directory': function(test) {
		expectedDirectories.push(testDirectory);
		ljs_req.addDirectory(testDirectory);

		// Test the directory addition
		var msg = 'ljs-req search directories var is invalid';
		test.deepEqual(ljs_req.getDirectories(), expectedDirectories, msg);
		test.done();
	},
	'add multiple directories': function(test) {
		var directories = ['dir_a','dir_b'];
		for(var i = 0; i < directories.length; i++) {
			directories[i] = testDirectory + '/' + directories[i];
		}
		expectedDirectories.push.apply(expectedDirectories, directories);

		ljs_req.addDirectories(directories);

		// Test the addition of directories
		var msg = 'ljs-req search directories var is invalid';
		test.deepEqual(ljs_req.getDirectories(), expectedDirectories, msg);
		test.done();
	},
	'require "sub_test"': function(test) {

		try {
			var sub_test = req('sub_test.js');
			console.log('sub_test module:', sub_test);
		} catch (err) {
			console.log(err);
		}
		
		test.done();
	}
};