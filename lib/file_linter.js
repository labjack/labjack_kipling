

var path = require('path');
var fs = require('fs');
var q;
try {
	q = global.require('q');
} catch(err) {
	q = require('q');
}
var handlebars = require('./handlebars');

var LINTERS_ENABLED = true;
exports.configure = function(val) {
	LINTERS_ENABLED = val;
};
exports.getStatus = function() {
	return LINTERS_ENABLED;
};

var LINTERS = {
	'css': {
		'enabled': false,
		'run': null,
	},
	'js': {
		'enabled': false,
		'run': null,
	},
	'html': {
		'enabled': false,
		'run': null,
	},
	'defaultLinter': function(fileData) {
		var defered = q.defer();
		var result = {
			'fileData': fileData,
			'lintResult': undefined
		};
		defered.resolve(result);
		return defered.promise;
	}
};

var csslint;
try {
	csslint = require('csslint');
	LINTERS.css.enabled = true;
	LINTERS.css.run = function(fileData) {
		var defered = q.defer();

		
		var isError = false;
		var isWarning = false;
		var overallResult = true;
		var messages = [];
		if(fileData !== '') {
			// Execute Linter
			var lintResult = csslint.CSSLint.verify(fileData);

			// Parse linter results
			lintResult.messages.forEach(function(message) {
				// Detect errors
				if(message.type === 'error') {
					isError = true;
					overallResult = false;
				}

				// Detect warnings
				if(message.type === 'warning') {
					isWarning = true;
				}

				// Build message object
				messages.push({
					'type': message.type,
					'location': {
						'line': message.line,
						'character': message.col
					},
					'message': message.message,
					'evidence': message.evidence
				});
			});
		}

		var result = {
			'fileData': fileData,
			'lintResult': {
				'overallResult': overallResult,
				'isError': isError,
				'isWarning': isWarning,
				'messages': messages
			}
		};
		defered.resolve(result);
		return defered.promise;
	};
} catch (err) {
	// csslint not found
}

var jshint;
try {
	jshint = require('jshint');
	LINTERS.js.enabled = true;
	LINTERS.js.run = function(fileData) {
		var defered = q.defer();

		var isError = false;
		var isWarning = false;
		var overallResult = true;
		var messages = [];
		if(fileData !== '') {
			// Execute Linter
			var lintResult = jshint.JSHINT(fileData);
			var lintData = jshint.JSHINT.data();

			// Parse linter results
			if(lintData.errors) {
				lintData.errors.forEach(function(error) {
					var type = '';
					// Detect errors
					if(error.code.indexOf('E') >= 0) {
						isError = true;
						overallResult = false;
						type = 'error';
					}

					// Detect warnings
					if(error.code.indexOf('W') >= 0) {
						isWarning = true;
						type = 'warning';
					}

					// build message object
					messages.push({
						'type': type,
						'location': {
							'line': error.line,
							'character': error.character
						},
						'message': error.reason,
						'evidence': error.evidence
					});
				});
			}
			if(lintData.unused) {
				lintData.unused.forEach(function(unusedData) {
					isWarning = true;
					messages.push({
						'type': 'warning',
						'location': {
							'line': unusedData.line,
							'character': unusedData.character
						},
						'message': 'Unused Variable: ' + unusedData.name,
						'evidence': 'Line: ' + unusedData.line.toString()
					});
				});
			}
		}

		var result = {
			'fileData': fileData,
			'lintResult': {
				'overallResult': overallResult,
				'isError': isError,
				'isWarning': isWarning,
				'messages': messages,
			}
		};
		defered.resolve(result);
		return defered.promise;
	};
} catch (err) {
	// js-hint not found
	console.log('!!!!! Error Defining js linter', err);
}

var htmllint;
try {
	// for htmllint
	// htmllint = require('htmllint');

	// for html5-lint
	htmllint = require('html5-lint');
	LINTERS.html.enabled = true;
	var ignoredHTMLLintMessages = [
		// IMPORTANT NOTE!!! This linter uses unicode " characters aka "\u201C" and "\u201D"
		// To get rid of <!DOCTYPE error messages
		'<!DOCTYPE html>',
		'Expected \u201C<!DOCTYPE html>\u201D',

		// To get rid of error message saying that the <head> element was 
		// missing from templates
		'Element \u201Chead\u201D is missing a required instance of child element',

		// To get rid of error message thrown when a table is populated by a 
		// template.
		'Row 2 of a row group established by a',

		// To get rid of error message thrown by lable elements having child
		// elements.
		'not allowed as child of element \u201Clabel\u201D in this context. '
	];
	LINTERS.html.run = function(fileData) {
		var defered = q.defer();

		// Execute Linter
		// htmllint(fileData)
		// .then(function(lintData) {
		// console.log('htmlLint data', lintData);
		// defered.resolve(result);
		// // This gives us some data.  currently stuck on it constantly giving errors
		// // when line endings are '\r\n' and its not really checking for errors appropriately.
		// });
		if(fileData !== '') {
			var dataToLint = handlebars.compile(fileData)();
			htmllint(dataToLint, function(err, results) {
				var isError = false;
				var isWarning = false;
				var overallResult = true;
				var messages = [];
				
				if(err) {
					// Don't check the results
					isError = true;
					overallResult = false;
					messages.push({
						'type': 'error',
						'location': {
							'line': 0,
							'character': 0,
						},
						'message': 'Failed to execute linter: ' + JSON.stringify(err),
						'evidence': ''
					});
				} else {
					
					results.messages.forEach(function(message) {
						var isIgnored = false;

						ignoredHTMLLintMessages.some(function(ignoreStr) {
							if(message.message.indexOf(ignoreStr) >= 0) {
								isIgnored = true;
								return true;
							}
						});

						if(!isIgnored) {
							if(message.type === 'error') {
								isError = true;
								overallResult = false;
							}
							if(message.type === 'info') {
								isWarning = true;
							}
							messages.push({
								'type': message.type,
								'location': {
									'line': message.lastLine,
									'character': message.firstColumn,
								},
								'message': message.message,
								'evidence': message.extract,
							});
						}
					});
				}
				var result = {
					'fileData': fileData,
					'lintResult': {
						'overallResult': overallResult,
						'isError': isError,
						'isWarning': isWarning,
						'messages': messages,
					}
				};
				defered.resolve(result);
			});
		} else {
			var result = {
				'fileData': fileData,
				'lintResult': {
					'overallResult': true,
					'isError': false,
					'isWarning': false,
					'messages': [],
				}
			};
			defered.resolve(result);
		}
		
		return defered.promise;
	};
} catch (err) {
	// htmllint not found
}

var getLinter = function(filePath) {
	var fileType = path.extname(filePath).replace('.','');
	var linter = LINTERS.defaultLinter;
	
	if(LINTERS_ENABLED) {
		if(LINTERS[fileType]) {
			if(LINTERS[fileType].enabled) {
				linter = LINTERS[fileType].run;
			}
		}
		}
	return linter;
};
exports.getLinter = getLinter;
exports.LINTERS = LINTERS;