
var vm = require('vm');
var path = require('path');
var fs = require('fs');
var util = require('util');


function CREATE_EXECUTOR(location, scriptText, sandbox, options) {

	this.location = path.normalize(location);
	var cwd = 
	this.strategyPath = '';
	var resolvedLocation = '';
	var firstPath = module.paths[0];
	var parsedFirstPath = path.parse(firstPath);
	var moduleDirPath = parsedFirstPath.dir;

	if(path.isAbsolute(location)) {
		resolvedLocation = path.resolve(location);
	} else {
		resolvedLocation = path.join(moduleDirPath, location);
	}
	this.strategyPath = path.parse(resolvedLocation).dir;

	// console.log('Strategy Path', path.isAbsolute(location));
	// console.log('Strategy Path', this.strategyPath);
	// console.log('Resolved Location', resolvedLocation);

	this.cachedReqs = [];
	function localRequire(reqText) {
		if(typeof(self.cachedReqs) === 'undefined') {
			self.cachedReqs = [];
		}
		var reqObj;
		var isCached = false;
		var isError = false;
		var error;
		
		self.cachedReqs.some(function(cachedReq) {
			if(cachedReq.reqText === reqText) {
				reqObj = cachedReq.obj;
				isCached = true;
				return true;
			}
		});

		if(isCached) {
			return reqObj;
		} else {
			var strs = [];
			// Try using the standard require
			strs.push(reqText);

			// Try using the module's base-dir.
			var parsedRequireText = path.parse(reqText);
			var strategyDirPath = path.resolve(path.join(
				self.strategyPath, reqText
			));
			strs.push(strategyDirPath);

			// try the module's node_modules folder.
			var modulesDirPath = path.resolve(path.join(
				self.strategyPath,
				'node_modules',
				reqText
			));
			strs.push(modulesDirPath);
			strs.some(function(str, i) {
				try {
					reqObj = require(str);
					isError = false;
					error = undefined;
					self.cachedReqs.push({reqText: reqText, obj: reqObj});
					return true;
				} catch(err) {
					// console.log('Error', str, err, i)
					if(typeof(err.code)) {
						if(err.code === 'MODULE_NOT_FOUND') {
							isError = true;
							error = err;
							return false;
						} else {
							isError = true;
							error = err;
							return true;
						}
					} else {
						isError = true;
						error = err;
						return true;
					}
				}
			});
		}
		if(isError) {
			throw error;
		}
		return reqObj;
	}
	// file/script type variables.
	this.file = '';
	this.script = undefined;
	if(scriptText) {
		this.file = scriptText;
	} else {
		this.file = require(location).file;
	}
	this.script = new vm.Script(this.file);

	// Sandbox/context type variables.
	this.sandbox = undefined;
	this.context = undefined;
	if(sandbox) {
		sandbox.require = localRequire;
		sandbox.console = console;
		this.sandbox = sandbox;
	} else {
		sandbox = {
			'var': 0,
			'require': localRequire,
			'console': console,
		};
	}
	this.sandbox = sandbox;
	this.context = vm.createContext(this.sandbox);
	
	// Run-time options
	this.runOptions = {
		'filename': resolvedLocation
	};
	if(options) {
		if(options.timeout) {
			this.runOptions.timeout = options.timeout;
		}
	}

	this.run = function() {
		try {
			// console.log('in user_code_executor run', util.inspect(self.context), self.runOptions);
			self.script.runInContext(self.context, self.runOptions);
		} catch(err) {
			console.log('Error Executing "runInContext"', self.location, err, err.stack);
		}
		// console.log('Finished running', self.location);
	};

	var self = this;
	vm.createContext(self.sandbox);
}

exports.create = CREATE_EXECUTOR;