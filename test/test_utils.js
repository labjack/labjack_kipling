
var q = require('q');
var path = require('path');
var fs = require('fs.extra');
var module_manager = require('../lib/ljswitchboard-module_manager');

var FRAMEWORK_ADDITIONS = {
	'singleDevice': {
		'css': {
			'prepend': [
				'style.css',
			],
		},
		'js': {
			'prepend': [
				'device_constants.js',
				'presenter_framework.js',
			],
			'append': [
				'framework_connector.js'
			],
		}
	}
};

var unfinishedModules = ['device_selector', 'settings'];
var loadedFiles = {};
var checkLoadedFiles = function(test, fileObj) {
	var fileObjkeys = Object.keys(fileObj);
	var expectedKeys = ['fileName', 'filePath', 'fileData', 'lintResult'];
	loadedFiles[fileObj.filePath] = fileObj;
	test.deepEqual(fileObjkeys, expectedKeys, 'invalid cssFile keys');
};
exports.checkLoadedFiles = checkLoadedFiles;

var addFrameworkFiles = function(fileType, frameworkType, origFiles) {
	var outputData = [];
	var isValidFramework = false;
	if(frameworkType) {
		if(FRAMEWORK_ADDITIONS[frameworkType]) {
			if(FRAMEWORK_ADDITIONS[frameworkType][fileType]) {
				isValidFramework = true;
				var additions = FRAMEWORK_ADDITIONS[frameworkType][fileType];
				if(additions.prepend) {
					outputData = outputData.concat(additions.prepend);
				}
				outputData = outputData.concat(origFiles);
				if(additions.append) {
					outputData = outputData.concat(additions.append);
				}
			}
		}
	}
	if(!isValidFramework) {
		outputData = standardData;
	}
	return outputData;
};
exports.addFrameworkFiles = addFrameworkFiles;

var checkLoadedModuleData = function(test, moduleData) {
	var moduleDataKeys = Object.keys(moduleData);
	var requiredKeys = [
		'name',
		'path',
		'css',
		'js',
		'html',
		'json',
		'data'
	];
	var attributeStrategies = {
		'name': function(given) {
			var isValid = false;
			if(given) {
				isValid = true;
			}
			test.ok(isValid, 'module name invalid');
		},
		'css': function(cssFiles) {
			var isValid = Array.isArray(cssFiles);
			test.ok(isValid,'cssFiles should be an array');
			var loadedCSSFiles = [];
			var loadedEmptyFile = false;
			cssFiles.forEach(function(cssFile) {
				checkLoadedFiles(test, cssFile);
				loadedCSSFiles.push(cssFile.fileName);
				if(cssFile.fileData.length === 0) {
					loadedEmptyFile = true;
				}
			});

			var requiredCSSFiles = [
				'style.css'
			];
			if(moduleData.data.framework) {
				requiredCSSFiles = addFrameworkFiles(
					'css',
					moduleData.data.framework,
					requiredCSSFiles
				);
			}

			if(unfinishedModules.indexOf(moduleData.name) < 0) {
				test.ok(!loadedEmptyFile, 'a loaded file was empty');
			}
			test.deepEqual(
				loadedCSSFiles,
				requiredCSSFiles,
				'all js files not loaded: ' + moduleData.name
			);
		},
		'js': function(jsFiles) {
			var isValid = Array.isArray(jsFiles);
			test.ok(isValid,'jsFiles should be an array');
			var loadedJSFiles = [];
			var loadedEmptyFile = false;
			jsFiles.forEach(function(jsFile) {
				checkLoadedFiles(test, jsFile);
				loadedJSFiles.push(jsFile.fileName);
				if(jsFile.fileData.length === 0) {
					loadedEmptyFile = true;
				}
			});
			var thirdPartyFiles = [];
			if(moduleData.data.third_party_code) {
				moduleData.data.third_party_code.forEach(function(fn) {
					thirdPartyFiles.push(path.basename(fn));
				});
			}

			var jsLibFiles = [];
			if(moduleData.data.jsFiles) {
				moduleData.data.jsFiles.forEach(function(fn) {
					jsLibFiles.push(path.basename(fn));
				});
			}

			var requiredFiles = [
				'controller.js'
			];
			if(moduleData.data.framework) {
				requiredFiles = addFrameworkFiles(
					'js',
					moduleData.data.framework,
					requiredFiles
				);
			}

			var requiredJSFiles = [];
			requiredJSFiles = requiredJSFiles.concat(thirdPartyFiles);
			requiredJSFiles = requiredJSFiles.concat(jsLibFiles);
			requiredJSFiles = requiredJSFiles.concat(requiredFiles);
			if(unfinishedModules.indexOf(moduleData.name) < 0) {
				test.ok(!loadedEmptyFile, 'a loaded file was empty');
			}
			test.deepEqual(
				loadedJSFiles,
				requiredJSFiles,
				'all js files not loaded: ' + moduleData.name
			);
		},
		'html': function(htmlFiles) {
			var isValid = Array.isArray(htmlFiles);
			test.ok(isValid,'htmlFiles should be an array');
			var foundCoreHTMLFile = false;
			var htmlFilePaths = [];
			htmlFiles.forEach(function(htmlFile) {
				checkLoadedFiles(test, htmlFile);
				if(htmlFile.fileName === 'view.html') {
					foundCoreHTMLFile = true;

					// If the found module declares the use of a framework
					if(moduleData.data.framework) {
						var fwType = moduleData.data.framework;
						// If that framework is supported
						if(FRAMEWORK_ADDITIONS[fwType]) {
							// Make sure that the view.html file is loaded out
							// of the framework folder
							var splitPath = htmlFile.filePath.split(path.sep);
							var index = splitPath.indexOf('framework');
							if(index < 0) {
								test.ok(false, 'File not properly loaded');
							} else {
								test.ok(true, 'File properly loaded');
							}
						} else {
							test.ok(false, 'Unsupported framework type');
						}
					}
				}
				htmlFilePaths.push(htmlFile.filePath);
			});
			test.ok(foundCoreHTMLFile, 'did not find view.html file');
		}
	};

	requiredKeys.forEach(function(requiredKey) {
		var exists = false;
		if(moduleDataKeys.indexOf(requiredKey) >= 0) {
			exists = true;
			if(attributeStrategies[requiredKey]) {
				attributeStrategies[requiredKey](moduleData[requiredKey]);
			}
		}
		test.ok(exists, 'Required Key not found: ' + requiredKey);
	});
	// console.log('loaded data keys', moduleDataKeys);
};
exports.checkLoadedModuleData = checkLoadedModuleData;

var printLintError = function(lintResult) {
	console.log(
		'Num:', lintResult.messages.length,
		'Error:', lintResult.isError,
		'Warning:', lintResult.isWarning
	);
	lintResult.messages.forEach(function(message, i) {
		var str = i.toString() + '. ';
		str += '(' + message.type +'): ' + message.message + '\r\n   ';
		str += '(line: '+message.location.line+', char: ';
		str += message.location.character+'): ';
		str += message.evidence;
		console.log(str);
	});
};
exports.printLintError = printLintError;

