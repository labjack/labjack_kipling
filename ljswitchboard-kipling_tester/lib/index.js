console.log("ljswitchboard-kipling_tester index.js");

const path = require('path');
const testunit_recorder = require('./nodeunit_recorder');

const testFiles = [
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

const getUpdateTestResults = function(divID) {
	const updateTestResults = function() {
		const savedText = testunit_recorder.getSavedText();
		const cachedTestDiv = document.getElementById(divID);
		cachedTestDiv.innerHTML = savedText;
	};
	return updateTestResults;
};
function runTest(testFile, testDiv) {
	const testName = path.basename(testFile);
	const fileEnding = path.extname(testName);
	const fileName = path.basename(testFile).split(fileEnding).join('');

	const divID = fileName + '-test';
	return new Promise((resolve, reject) => {
		const str = [
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
			const outputHTML = testunit_recorder.run(
				[testFile],
				{},
				getUpdateTestResults(divID),
				function(err) {
					const testResults = $('#' + divID);
					let status;
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

					const btn = $('#' + divID + '_button');
					btn.on('click', function() {
						testResults.slideToggle();
					});
					resolve();
				});
		} catch(err) {
			console.error('Error Running nodeunit tester', err, testFile);
			reject();
		}
	});
}

window.addEventListener('runTests', async (event) => {
	console.log('runTestsrunTests');
	const testDiv = $('#nodeunit_test_results');
	// testDiv.empty();
	for (const testFile of testFiles) {
		const normalizedFile = path.resolve(__dirname, '..', 'test', testFile);
		await runTest(normalizedFile, testDiv);
	}
});
