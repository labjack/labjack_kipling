var assert = require('chai').assert;

var path = require('path');

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
exports.getLoadedFiles = function() {
	return loadedFiles;
};
exports.clearLoadedFiles = function() {
	loadedFiles = {};
};

var checkLoadedFiles = function(fileObj) {
	var fileObjkeys = Object.keys(fileObj);
	var expectedKeys = ['fileName', 'filePath', 'fileData', 'lintResult'];
	loadedFiles[fileObj.filePath] = fileObj;
	assert.deepEqual(fileObjkeys, expectedKeys, 'invalid cssFile keys');
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

var checkLoadedModuleData = function(moduleData) {
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
			assert.isOk(isValid, 'module name invalid');
		},
		'css': function(cssFiles) {
			var isValid = Array.isArray(cssFiles);
			assert.isOk(isValid,'cssFiles should be an array');
			var loadedCSSFiles = [];
			var loadedEmptyFile = false;
			cssFiles.forEach(function(cssFile) {
				checkLoadedFiles(cssFile);
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
				assert.isOk(!loadedEmptyFile, 'a loaded file was empty: ' + moduleData.name);
			}
			assert.deepEqual(
				loadedCSSFiles,
				requiredCSSFiles,
				'all js files not loaded: ' + moduleData.name
			);
		},
		'js': function(jsFiles) {
			var isValid = Array.isArray(jsFiles);
			assert.isOk(isValid,'jsFiles should be an array');
			var loadedJSFiles = [];
			var loadedEmptyFile = false;
			jsFiles.forEach(function(jsFile) {
				checkLoadedFiles(jsFile);
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
				assert.isOk(!loadedEmptyFile, 'a loaded file was empty: ' + moduleData.name);
			}
			assert.deepEqual(
				loadedJSFiles,
				requiredJSFiles,
				'all js files not loaded: ' + moduleData.name
			);
		},
		'html': function(htmlFiles) {
			var isValid = Array.isArray(htmlFiles);
			assert.isOk(isValid,'htmlFiles should be an array');
			var foundCoreHTMLFile = false;
			var htmlFilePaths = [];
			htmlFiles.forEach(function(htmlFile) {
				checkLoadedFiles(htmlFile);
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
								assert.isOk(false, 'File not properly loaded');
							} else {
								assert.isOk(true, 'File properly loaded');
							}
						} else {
							assert.isOk(false, 'Unsupported framework type');
						}
					}
				}
				htmlFilePaths.push(htmlFile.filePath);
			});
			assert.isOk(foundCoreHTMLFile, 'did not find view.html file');
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
		assert.isOk(exists, 'Required Key not found: ' + requiredKey);
	});
	// console.log('loaded data keys', moduleDataKeys);
};
exports.checkLoadedModuleData = checkLoadedModuleData;

var printQueue = [];
var delayPrint = function() {
	var str = '';
	var i;
	for(i = 0; i < arguments.length; i++) {
		str += JSON.stringify(arguments[i]);
		str += ' ';
		str = str.split('"').join('');
		str = str.split('\\t').join('');
		// str = str.replace('"', '');
	}
	printQueue.push(str);
	// console.log(str);
};
var flushPrintQueue = function() {
	var i;
	for(i = 0; i < printQueue.length; i++) {
		console.log(printQueue[i]);
	}
	printQueue = [];
};
var printLintError = function(lintResult) {
	delayPrint(
		'Num:', lintResult.messages.length,
		'Error:', lintResult.isError,
		'Warning:', lintResult.isWarning
	);
	lintResult.messages.forEach(function(message, i) {
		var strA = i.toString() + '. ';
		strA += '(' + message.type +'): ' + message.message;
		var strB = '   ';
		strB += '(line: '+message.location.line+', char: ';
		strB += message.location.character+'): ';
		strB += message.evidence;
		delayPrint(strA);
		delayPrint(strB);
	});
};
exports.printLintError = printLintError;

var getCheckForLintErrors = function(printWarnings) {
	var checkForLintErrors = function(done) {
		var loadedFileKeys = Object.keys(loadedFiles);
		delayPrint('aa', 'ab');
		delayPrint('');
		delayPrint('Num Checked Files', loadedFileKeys.length);
		var numLintedFiles = 0;
		var warnings = [];
		var errors = [];
		loadedFileKeys.forEach(function(loadedFileKey) {
			var loadedFile = loadedFiles[loadedFileKey];
			if(loadedFile.lintResult) {
				numLintedFiles += 1;
				if(loadedFile.lintResult.isWarning) {
					warnings.push(loadedFile);
				}
				if(loadedFile.lintResult.isError) {
					errors.push(loadedFile);
				}

				if(!loadedFile.lintResult.overallResult) {
					delayPrint(
						'-------------------',
						'Lint Error Detected: ' + loadedFile.fileName,
						'-------------------'
					);
					delayPrint(loadedFile.fileName);
					delayPrint(loadedFile.filePath);
					printLintError(loadedFile.lintResult);
					delayPrint('');
				}
				if(loadedFile.lintResult.isWarning && printWarnings) {
					delayPrint(
						'-------------------',
						'Lint Warning Detected: ' + loadedFile.fileName,
						'-------------------'
					);
					delayPrint(loadedFile.fileName);
					delayPrint(loadedFile.filePath);
					printLintError(loadedFile.lintResult);
					delayPrint('');
				}
			}
		});

		delayPrint(' - Number of linted files', numLintedFiles);
		delayPrint(' - Number of warnings', warnings.length);
		delayPrint(' - Number of errors', errors.length);
		delayPrint('');
		var printLintResults = false;
		if(warnings.length > 0) {
			printLintResults = true;
		}
		if(errors.length > 0) {
			printLintResults = true;
		}
		if(printLintResults) {
			flushPrintQueue();
		}

		done();
	};
	return checkForLintErrors;
};
exports.getCheckForLintErrors = getCheckForLintErrors;

