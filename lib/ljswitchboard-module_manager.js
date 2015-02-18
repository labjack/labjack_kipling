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
	.then(function(fileData) {
		defered.resolve({
			'fileName': path.basename(filePath),
			'filePath': filePath,
			'fileData': fileData
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
		parsedData = JSON.parse(fileData);
	} catch(err) {
		console.error('Error parsing .json', err);
		parsedData = {};
	}
	defered.resolve(parsedData);
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

	jsFiles = jsFiles.concat(thirdPartyJSFiles);
	jsFiles = jsFiles.concat(jsLibFiles);
	jsFiles = jsFiles.concat(requiredJSFiles);

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
	cachedReadFiles(htmlFiles)
	.then(function(loadedFiles) {
		data.html = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};
var loadModuleJSON = function(data) {
	var defered = q.defer();
	var jsonFiles = [];
	jsonFiles = resolveModuleFilePaths(data.path, jsonFiles);
	cachedReadFiles(jsonFiles)
	.then(function(loadedFiles) {
		data.json = loadedFiles;
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
		'json': [],
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
		'json': [],
		'data': moduleData,
	};
	innerLoadModuleData(collectedModuleData)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.loadModuleData = loadModuleData;