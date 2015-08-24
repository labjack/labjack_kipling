console.log("ljswitchboard-kipling_tester index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();

var documentURL;
try {
	documentURL = document.URL.split('file:///')[1];
} catch(err) {
	documentURL = '';
}
var cwd = path.dirname(documentURL);
try {
	cwd = decodeURIComponent(cwd);
} catch(err) {
	cwd = cwd.split('%20').join(' ');
}
if(!path.isAbsolute(cwd)) {
	cwd = path.resolve(path.sep, cwd);
}

var nodeunit = require(path.normalize(path.join(cwd, '../node_modules/nodeunit')));
var nodeunit_recorder = require(path.normalize(path.join(cwd, 'nodeunit_recorder')));

var testFiles = [
	'test_kipling.js',
	// Execute Mock-Device compatable Tests
	'mock_module_tests/mock_device_selector.js',
	// 'mock_module_tests/mock_device_info.js',
	// 'mock_module_tests/mock_dashboard.js',
	// 'mock_module_tests/mock_register_matrix.js',
	

	// Execute Live-Device tests
	// 'module_tests/test_device_info.js',
	// 'module_tests/test_device_updater.js',

	// 'mock_module_tests/mock_lua_script_debugger.js',

	'finish_testing.js',
];
var test_dir = '../test';
for(var i = 0; i < testFiles.length; i++) {
	testFiles[i] = path.normalize(path.join(cwd, test_dir, testFiles[i]));
}


var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var window_manager = require('ljswitchboard-window_manager');
var startDir = global[gns].info.startDir;
var handlebars = require('handlebars');
/*
	Function called to load the application's core resources.
	The resources are loaded from the ljswitchboard-static_files/static
	directory.
*/
var coreResourcesLoaded = false;
var loadCoreResources = function(resources) {
	global[gns].static_files.loadResources(document, resources)
	.then(function(res) {
		coreResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

/*
	Function called to load the application's local resources.
	The resources are loaded starting from the directory of the 
	index.html/index.js file aka the cwd of the window.
*/
var localResourcesLoaded = false;
var loadLocalResources = function(resources) {
	global[gns].static_files.loadResources(document, resources, true)
	.then(function(res) {
		localResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

var loadResources = function(resources, isLocal) {
	var defered = q.defer();
	global[gns].static_files.loadResources(document, resources, isLocal)
	.then(function(res) {
		defered.resolve();
	}, function(err) {
		console.error('Error Loading resources', err);
		defered.reject(err);
	});
	return defered.promise;
};


var getUpdateTestResults = function(divID) {
	var cachedTestDiv;
	cachedTestDiv = undefined;
	var updateTestResults = function() {

		var savedText = nodeunit_recorder.getSavedText();
		if(cachedTestDiv) {
			cachedTestDiv.html(savedText);
		} else {
			cachedTestDiv = $(divID);
			cachedTestDiv.html(savedText);
		}
	};
	return updateTestResults;
};
var getRunTest = function(testFile, testDiv) {
	var testName = path.basename(testFile);
	var fileName = path.basename(testFile);
	var fileEnding = path.extname(testName);
	fileName = fileName.split(fileEnding).join('');

	var divID = fileName + '-test';
	var runTest = function() {
		var defered = q.defer();
		var str = [
			'<li id="{{id}}_result">',
			'<div class="no_select">',
				'<span>Test: {{testName}}</span>',
				'<div class="results_button">',
					'<span>Status: <span id="{{id}}_status">In Progress</span></span>',
					'<span id="{{id}}_button"class="icon-list-2 toggle_button"></span>',
				'</div>',
			'</div>',
			'<div id="{{id}}"><p>Test!</p></div>',
			'</li>'
		].join('');
		var template = handlebars.compile(str);
		var newTxt = template({
			'id': divID,
			'testName':testName,
			'fileName': fileName
		});
		testDiv.append($(newTxt));
		try {
			var outputHTML = nodeunit_recorder.run(
				[testFile],
				{},
				getUpdateTestResults('#' + divID),
				function(err) {
					var testResults = $('#' + divID);
					if(err) {
						console.log('Error running test', err, testFile);
						var status = $('#' + divID + '_status');
						status.text('Error');
						status.css('color', 'red');
					} else {
						var status = $('#' + divID + '_status');
						status.text('Success');
						status.css('color', 'green');
						testResults.slideUp();
						// console.log('Finished running test', testFile);
					}
					
					var btn = $('#' + divID + '_button');
					btn.on('click', function() {
						testResults.slideToggle();
					})
					defered.resolve();
				});
		} catch(err) {
			console.error('Error Running nodeunit tester', err, testFile);
			defered.resolve();
		}
		return defered.promise;
	};
	return runTest;
};

var runTests = function() {
	var testDiv = $('#nodeunit_test_results');
	// testDiv.empty();
	var testFuncs = [];
	testFiles.forEach(function(testFile) {
		testFuncs.push(getRunTest(testFile, testDiv));
	});
	return testFuncs.reduce(q.when, q({}));
};

var numLoadDelay = 0;
var startCoreApp = function() {
	if(coreResourcesLoaded && localResourcesLoaded) {
		// win.showDevTools();
	} else {
		numLoadDelay += 1;
		if(numLoadDelay > 5) {
			win.showDevTools();
			console.log('numLoadDelay', numLoadDelay);
			setTimeout(startCoreApp, 100);
		} else {
			setTimeout(startCoreApp, 10);
		}
	}
};

/*
	When the window finishes loading start the core application.

	The application is started in a timeout-loop because some of the resources
	are asynchronously loaded upon start.  The application attempts to start
	every 10ms until those resources are loaded.
*/
window.onload = function(e) {
	setTimeout(startCoreApp, 10);
};

// gui.App.sharedData.appWindows.core.show();
// gui.App.sharedData.appWindows.core.showDevTools();