exports.info = {
	'type': 'library'
};


var path = require('path');
var fs = require('fs');
var q;
try {
	q = global.require('q');
} catch(err) {
	q = require('q');
}

var file_linter = require('./file_linter');

var MODULES_DIR_NAME = 'switchboard_modules';
var cwd = path.dirname(module.filename);
var MODULES_DIR = path.join(cwd, MODULES_DIR_NAME);
var MODULES_DATA_FILE_NAME = 'modules.json';
var MODULE_DATA_FILE_NAME = 'module.json';
var MODULES_LIST_FILE = path.join(MODULES_DIR, MODULES_DATA_FILE_NAME);






var FRAMEWORK_PATHS = {
	'singleDevice': path.join(
		MODULES_DIR,
		'framework',
		'kipling-module-framework'
	)
};

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
		},
		'html': {
			'replace': [
				{'searchFile': 'view.html', 'replacementFile': 'view.html'}
			]
		}
	}
};

var moduleManagerFileCache = {};
exports.getFileCache = function() {
	return moduleManagerFileCache;
};

var cachedReadFile = function(fileName) {
	var defered = q.defer();
	if(moduleManagerFileCache[fileName]) {
		defered.resolve(moduleManagerFileCache[fileName].toString());
	} else {
		fs.readFile(fileName, function(err, data) {
			if(err) {
				// console.error('Error Reading File', err);
				defered.resolve('');
			} else {
				moduleManagerFileCache[fileName] = data;
				defered.resolve(moduleManagerFileCache[fileName].toString());
			}
		});
	}
	return defered.promise;
};


var innerCachedReadFile = function(filePath) {
	var defered = q.defer();
	cachedReadFile(filePath)
	.then(file_linter.getLinter(filePath))
	.then(function(lintData) {
		// if(lintData.lintResult) {
		// 	if(!lintData.lintResult.overallResult) {
		// 		console.log(
		// 			'Bad File Detected:',
		// 			path.basename(filePath)
		// 		);
		// 		console.log(filePath);
		// 		console.log(lintData.lintResult);
		// 	}
		// }
		defered.resolve({
			'fileName': path.basename(filePath),
			'filePath': filePath,
			'fileData': lintData.fileData,
			'lintResult': lintData.lintResult
		});
	});
	return defered.promise;
};
var cachedReadFiles = function(fileNames) {
	var defered = q.defer();
	var promises = [];
	fileNames.forEach(function(fileName) {
		promises.push(innerCachedReadFile(fileName));
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(results) {
		var readFiles = [];
		results.forEach(function(result) {
			readFiles.push(result.value);
		});
		defered.resolve(readFiles);
	}, defered.reject);
	return defered.promise;
};
var parseJSONFile = function(fileData) {
	var defered = q.defer();
	var parsedData;
	try {
		if(fileData !== '') {
			parsedData = JSON.parse(fileData);
		} else {
			parsedData = {};
		}
	} catch(err) {
		console.error('Error parsing .json', err);
		parsedData = {};
	}
	defered.resolve(parsedData);
	return defered.promise;
};
var internalParseJSONFile = function(cachedFile) {
	var defered = q.defer();
	parseJSONFile(cachedFile.fileData)
	.then(function(parsedData) {
		cachedFile.fileData = parsedData;
		defered.resolve(cachedFile);
	});
	return defered.promise;
};
var parseCachedJSONFiles = function(files) {
	var defered = q.defer();
	var promises = [];
	files.forEach(function(file) {
		promises.push(internalParseJSONFile(file));
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(results) {
		var parsedData = [];
		results.forEach(function(result) {
			parsedData.push(result.value);
		});
		defered.resolve(parsedData);
	}, defered.reject);
	return defered.promise;
};

var filterOutInactiveModules = function(modules) {
	var defered = q.defer();
	var moduleTypes = Object.keys(modules);
	var activeModules = {};
	moduleTypes.forEach(function(moduleType) {
		activeModulesByType = [];
		modules[moduleType].forEach(function(module) {
			if(module.active) {
				activeModulesByType.push(module);
			}
		});
		activeModules[moduleType] = activeModulesByType;
	});
	defered.resolve(activeModules);
	return defered.promise;
};
var filterOutTaskModules = function(modules) {
	var defered = q.defer();
	var moduleTypes = Object.keys(modules);
	var nonTaskModules = {};
	moduleTypes.forEach(function(moduleType) {
		nonTaskModulesByType = [];
		modules[moduleType].forEach(function(module) {
			if(module.isTask) {
				// Module is a task
			} else {
				nonTaskModulesByType.push(module);
			}
		});
		nonTaskModules[moduleType] = nonTaskModulesByType;
	});
	defered.resolve(nonTaskModules);
	return defered.promise;
};
var loadModuleAttributes = function(module) {
	var defered = q.defer();
	var filePath = path.join(MODULES_DIR, module.name, MODULE_DATA_FILE_NAME);
	cachedReadFile(filePath)
	.then(parseJSONFile)
	.then(function(moduleData) {
		var keys = Object.keys(moduleData);
		keys.forEach(function(key) {
			module[key] = moduleData[key];
		});
		module.data = moduleData;
		defered.resolve(module);
	}, defered.reject);
	return defered.promise;
};

var loadFoundModuleAttributes = function(modules) {
	var defered = q.defer();
	var promises = [];
	var i,j;
	var moduleKeys = Object.keys(modules);
	moduleKeys.forEach(function(moduleKey) {
		var moduleSection = modules[moduleKey];
		moduleSection.forEach(function(module) {
			promises.push(loadModuleAttributes(module));
		});
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(collectedData) {
		defered.resolve(modules);
	}, defered.reject);
	return defered.promise;
};

var getModulesList = function() {
	var defered = q.defer();

	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(filterOutInactiveModules)
	.then(filterOutTaskModules)
	.then(loadFoundModuleAttributes)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.getModulesList = getModulesList;

var resolveToHeaderModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.header);
	return defered.promise;
};
var resolveToBodyModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.body);
	return defered.promise;
};
var resolveToFooterModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.footer);
	return defered.promise;
};

var getHeaderModules = function() {
	return getModulesList()
	.then(resolveToHeaderModules);
};
exports.getHeaderModules = getHeaderModules;

var getBodyModules = function() {
	return getModulesList()
	.then(resolveToBodyModules);
};
exports.getBodyModules = getBodyModules;

var filterBodyModules = function(filters) {
	var modules = [];
	var i;
	var num = Math.floor(Math.random()*11);
	for(i = 0; i < num; i ++) {
		modules.push({
			'name': 'Test ' + i.toString(),
			'humanName': 'Test ' + i.toString(),
			'type': 'body',
		});
	}
	return modules;
};
exports.filterBodyModules = filterBodyModules;

var getFooterModules = function() {
	return getModulesList()
	.then(resolveToFooterModules);
};
exports.getFooterModules = getFooterModules;


var getModuleInfo = function(data) {
	var defered = q.defer();
	var filePath = path.join(data.path, MODULE_DATA_FILE_NAME);
	cachedReadFile(filePath)
	.then(parseJSONFile)
	.then(function(moduleData) {
		data.data = moduleData;
		defered.resolve(data);
	});
	return defered.promise;
};
var resolveModuleFilePaths = function(modulePath, files) {
	var paths = [];
	files.forEach(function(file) {
		paths.push(path.normalize(path.join(modulePath, file)));
	});
	return paths;
};

var replaceElements = function(frameworkType, standardData, replacements) {
	var standardDataFiles = [];
	standardData.forEach(function(stdFilePath) {
		standardDataFiles.push(path.basename(stdFilePath));
	});
	replacements.forEach(function(replacement, i) {
		var index = standardDataFiles.indexOf(replacement.searchFile);
		if(index >= 0) {
			standardData[index] = path.normalize(path.join(
				FRAMEWORK_PATHS[frameworkType],
				replacement.replacementFile
			));
		}
	});
	return standardData;
};
var applyFrameworkAdditions = function(fileType, frameworkType, standardData) {
	var outputData = [];
	var isValidFramework = false;
	if(frameworkType) {
		if(FRAMEWORK_ADDITIONS[frameworkType]) {
			if(FRAMEWORK_ADDITIONS[frameworkType][fileType]) {
				if(FRAMEWORK_PATHS[frameworkType]) {
					isValidFramework = true;
					var additions = FRAMEWORK_ADDITIONS[frameworkType][fileType];
					if(additions.prepend) {
						var prependPaths = resolveModuleFilePaths(
							FRAMEWORK_PATHS[frameworkType],
							additions.prepend
						);
						outputData = outputData.concat(prependPaths);
					}
					if(additions.replace) {
						standardData = replaceElements(
							frameworkType,
							standardData,
							additions.replace
						);
					}

					outputData = outputData.concat(standardData);
					if(additions.append) {
						var appendPaths = resolveModuleFilePaths(
							FRAMEWORK_PATHS[frameworkType],
							additions.append
						);
						outputData = outputData.concat(appendPaths);
					}
				}
			}
		}
	}

	if(!isValidFramework) {
		outputData = standardData;
	}
	return outputData;
};
var loadModuleCSS = function(data) {
	var defered = q.defer();

	var cssFiles = [
		'style.css'
	];
	cssFiles = resolveModuleFilePaths(data.path, cssFiles);
	
	// Perform logic for modules loading a framework
	if(data.data.framework) {
		cssFiles = applyFrameworkAdditions(
			'css',
			data.data.framework,
			cssFiles
		);
	}

	var extCSSFiles = [];
	if(data.data.cssFiles) {
		if(Array.isArray(data.data.cssFiles)) {
			extCSSFiles = data.data.cssFiles;
			extCSSFiles = resolveModuleFilePaths(data.path, extCSSFiles);
		}
	}

	var i;
	for(i = 0; i < extCSSFiles.length; i++) {
		cssFiles.push(extCSSFiles[i]);
	}

	cachedReadFiles(cssFiles)
	.then(function(loadedFiles) {
		data.css = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};


var loadModuleJS = function(data) {
	var defered = q.defer();
	var requiredJSFiles = ['controller.js'];
	requiredJSFiles = resolveModuleFilePaths(data.path, requiredJSFiles);

	var thirdPartyJSFiles = [];
	if(data.data.third_party_code) {
		if(Array.isArray(data.data.third_party_code)) {
			var thirdPartyJSFilesPath = path.join(
				MODULES_DIR, 'third_party_code'
			);
			thirdPartyJSFiles = data.data.third_party_code;
			thirdPartyJSFiles = resolveModuleFilePaths(
				thirdPartyJSFilesPath,
				thirdPartyJSFiles
			);
		}
	}

	var jsLibFiles = [];
	if(data.data.jsFiles) {
		if(Array.isArray(data.data.jsFiles)) {
			jsLibFiles = data.data.jsFiles;
			jsLibFiles = resolveModuleFilePaths(data.path, jsLibFiles);
		}
	}
	
	// Perform logic for modules loading a framework
	if(data.data.framework) {
		requiredJSFiles = applyFrameworkAdditions(
			'js',
			data.data.framework,
			requiredJSFiles
		);
	}
			
	var jsFiles = [];

	var i;
	for(i = 0; i < thirdPartyJSFiles.length; i++) {
		jsFiles.push(thirdPartyJSFiles[i]);
	}
	for(i = 0; i < jsLibFiles.length; i++) {
		jsFiles.push(jsLibFiles[i]);
	}
	for(i = 0; i < requiredJSFiles.length; i++) {
		jsFiles.push(requiredJSFiles[i]);
	}

	cachedReadFiles(jsFiles)
	.then(function(loadedFiles) {
		data.js = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};
var loadModuleHTML = function(data) {
	var defered = q.defer();
	var htmlFiles = [
		'view.html'
	];
	htmlFiles = resolveModuleFilePaths(data.path, htmlFiles);


	// Perform logic for modules loading a framework
	if(data.data.framework) {
		htmlFiles = applyFrameworkAdditions(
			'html',
			data.data.framework,
			htmlFiles
		);
	}

	var extHTMLFiles = [];
	if(data.data.htmlFiles) {
		if(Array.isArray(data.data.htmlFiles)) {
			extHTMLFiles = data.data.htmlFiles;
			extHTMLFiles = resolveModuleFilePaths(data.path, extHTMLFiles);
		}
	}

	var i;
	for(i = 0; i < extHTMLFiles.length; i++) {
		htmlFiles.push(extHTMLFiles[i]);
	}

	cachedReadFiles(htmlFiles)
	.then(function(loadedFiles) {
		data.html = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};
var loadModuleJSON = function(data) {
	var defered = q.defer();
	var jsonFiles = [
		'moduleData.json',
		'moduleConstants.json'
	];
	jsonFiles = resolveModuleFilePaths(data.path, jsonFiles);

	var extJSONFiles = [];
	if(data.data.jsonFiles) {
		if(Array.isArray(data.data.jsonFiles)) {
			extJSONFiles = data.data.jsonFiles;
			extJSONFiles = resolveModuleFilePaths(data.path, extJSONFiles);
		}
	}
	
	var i;
	for(i = 0; i < extJSONFiles.length; i++) {
		jsonFiles.push(extJSONFiles[i]);
	}

	cachedReadFiles(jsonFiles)
	.then(parseCachedJSONFiles)
	.then(function(loadedFiles) {
		// console.log('JSON Data', loadedFiles);
		loadedFiles.forEach(function(loadedFile) {
			var baseName = path.basename(loadedFile.fileName);
			var extName = path.extname(loadedFile.fileName);
			var loadedFileName = baseName.split(extName).join('');
			data.json[loadedFileName] = loadedFile.fileData;

			data.jsonFiles.push({
				'fileName': loadedFile.fileName,
				'filePath': loadedFile.filePath
			});
		});
		defered.resolve(data);
	});
	return defered.promise;
};

var innerLoadModuleData = function(data) {
	var defered = q.defer();
	var promises = [
		loadModuleCSS(data),
		loadModuleJS(data),
		loadModuleHTML(data),
		loadModuleJSON(data)
	];

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(collectedData) {
		defered.resolve(data);
	}, defered.reject);
	return defered.promise;
};


var loadModuleDataByName = function(moduleName) {
	var defered = q.defer();
	var collectedModuleData = {
		'name': moduleName,
		'path': path.join(MODULES_DIR, moduleName),
		'css': [],
		'js': [],
		'html': [],
		'json': {},
		'jsonFiles': [],
		'data': {},
	};
	getModuleInfo(collectedModuleData)
	.then(innerLoadModuleData)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.loadModuleDataByName = loadModuleDataByName;

var loadModuleData = function(moduleData) {
	var defered = q.defer();
	var collectedModuleData = {
		'name': moduleData.name,
		'path': path.join(MODULES_DIR, moduleData.name),
		'css': [],
		'js': [],
		'html': [],
		'json': {},
		'jsonFiles': [],
		'data': moduleData,
	};
	innerLoadModuleData(collectedModuleData)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.loadModuleData = loadModuleData;