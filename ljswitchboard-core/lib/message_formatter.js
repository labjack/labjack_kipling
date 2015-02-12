
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
var fs = require('fs');

var cwd = path.dirname(module.filename);
var pageTemplateName = 'message_template.html';
var pageTemplatePath = path.join(cwd, pageTemplateName);

var pageTemplate;

var pageReference;
var $;

var configure = function(jquery, bodyElement) {
	$ = jquery;
	pageReference = bodyElement;
};
exports.configure = configure;

var loadTemplateFile = function() {
	var defered = q.defer();
	fs.readFile(pageTemplatePath, function(err, data) {
		var pageStr = '';
		if(err) {
			defered.resolve(pageStr);
		} else {
			defered.resolve(data.toString());
		}
	});
	return defered.promise;
};
var renderTemplate = function(context) {
	var defered = q.defer();
	var compiledData;
	textStyling = {
		'passed': 'bs-callout-success',
		'failed': 'bs-callout-danger'
	}[context.result];

	var builtContext = {
		'styling': textStyling,
		'step': context.step,
		'title': context.step.split(' ').join('_'),
		'message': context.message,
		'messages': context.messages,
		'code': context.code
	};

	if(pageTemplate) {
		compiledData = pageTemplate(builtContext);
		pageReference.append($(compiledData));
		defered.resolve(compiledData);
	} else {
		loadTemplateFile()
		.then(function(pageData) {
			pageTemplate = handlebars.compile(pageData);
			compiledData = pageTemplate(builtContext);
			pageReference.append($(compiledData));
			defered.resolve(compiledData);
		});
	}
	return defered.promise;
};
exports.renderTemplate = renderTemplate;

exports.testRender = function(data) {
	renderTemplate({
		'result': 'passed',
		'step': 'Hello!!',
		'message': 'Boo Yeah!'
	})
	.then(function(res) {
		console.log('Rendered data', res);
	});
};
exports.testFunc = function() {
	return cwd;
};