console.log("ljswitchboard-kipling_tester index.js");

const gui = global.gui;
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

var testunit_recorder = require(path.normalize(path.join(cwd, 'nodeunit_recorder')));

var testFiles = [
	'test_kipling.js',
	// Execute Mock-Device compatable Tests
	'mock_module_tests/mock_device_selector.js',
	// 'mock_module_tests/mock_device_info.js',
	// 'mock_module_tests/mock_dashboard.js',
	// 'mock_module_tests/mock_register_matrix.js',
	// 'mock_module_tests/mock_simple_logger.js',

	/* T4 Mock Tests */


	// Execute Mock-Settings test.
	// 'mock_module_tests/settings.js',

	// Execute stand-alone mock tests
	// 'mock_module_tests/mock_file_browser.js',

	// Execute Live-Device tests
	// 'module_tests/test_device_info.js', //Perform a live-device scan and select a USB-T7
	// 'module_tests/test_device_updater.js',

	// 'mock_module_tests/mock_lua_script_debugger.js',

	'finish_testing.js',
];
var test_dir = '../test';
for(var i = 0; i < testFiles.length; i++) {
	testFiles[i] = path.normalize(path.join(cwd, test_dir, testFiles[i]));
}


var package_loader = require('ljswitchboard-package_loader');
const static_files = package_loader.getPackage('static_files');
/*
	Function called to load the application's core resources.
	The resources are loaded from the ljswitchboard-static_files/static
	directory.
*/
var coreResourcesLoaded = false;
var loadCoreResources = function(resources) {
	static_files.loadResources(document, resources)
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
	static_files.loadResources(document, resources, true)
	.then(function(res) {
		localResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

var loadResources = function(resources, isLocal) {
	var defered = q.defer();
	static_files.loadResources(document, resources, isLocal)
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

		var savedText = testunit_recorder.getSavedText();
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
			'<li id="' + divID + '_result">',
			'<div class="no_select">',
				'<span>Test: ' + testName + '</span>',
				'<div class="results_button">',
					'<span>Status: <span id="' + divID + '_status">In Progress</span></span>',
					'<span id="' + divID + '_button" class="icon-list-2 toggle_button"></span>',
				'</div>',
			'</div>',
			'<div id="' + divID + '"><p>Test!</p></div>',
			'</li>'
		].join('');
		testDiv.append($(str));
		try {
			var outputHTML = testunit_recorder.run(
				[testFile],
				{},
				getUpdateTestResults('#' + divID),
				function(err) {
					var testResults = $('#' + divID);
					var status;
					if(err) {
						console.log('Error running test', err, testFile);
						status = $('#' + divID + '_status');
						status.text('Error');
						status.css('color', 'red');
					} else {
						status = $('#' + divID + '_status');
						status.text('Success');
						status.css('color', 'green');
						testResults.slideUp();
						// console.log('Finished running test', testFile);
					}

					var btn = $('#' + divID + '_button');
					btn.on('click', function() {
						testResults.slideToggle();
					});
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
