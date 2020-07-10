

// Load native UI library
var gui = require('nw.gui');
gui.Window.get().showDevTools();
var nodeunit = require('nodeunit');

var nodeunit_recorder = require('./test/nodeunit_recorder');

// var tests = {
// 	'Test LJSwitchboard': global.require('./test/test_ljswitchboard'),
// };
var files = [
	'./test/test_ljswitchboard.js'
];

// var reporter = nodeunit.reporters.html;
var outputHTML = nodeunit_recorder.run(files, {}, function(err) {
	if(err) {
		console.log('Error Running Test');
	} else {
		var savedText = nodeunit_recorder.getSavedText();
		var testDiv = $('#test_output');
		testDiv.html(savedText);
	}
	
});

// var testOutput = nodeunit.runFiles(tests, {
// 	'moduleStart': function(name) {
// 		console.log('Started Module', name);
// 	},
// 	'moduleDone': function(name, assertions) {
// 		console.log()
// 	}
// });


