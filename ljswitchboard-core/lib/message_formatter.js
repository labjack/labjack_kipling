'use strict';

const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs');

const cwd = path.dirname(module.filename);
const pageTemplateName = 'message_template.html';
const pageTemplatePath = path.join(cwd, pageTemplateName);

class MessageFormatter {

	constructor(injector) {
		this.injector = injector;
	}

	_loadTemplateFile() {
		return new Promise((resolve) => {
			fs.readFile(pageTemplatePath, function (err, data) {
				if (err) {
					resolve('');
				} else {
					resolve(data.toString());
				}
			});
		});
	}

	renderTemplate(context) {
		return new Promise(async (resolve) => {

			const textStyling = {
				'passed': 'bs-callout-success',
				'failed': 'bs-callout-danger'
			}[context.result];
			const stepAppend = {
				'passed': '',
				'failed': 'Error '
			}[context.result];

			if (context.result === 'failed') {
				const window_manager = this.injector.get('window_manager');
				window_manager.showWindow('core');
			}
			const builtContext = {
				'styling': textStyling,
				'step': stepAppend + context.step,
				'title': context.step.split(' ').join('_'),
				'message': context.message,
				'messages': context.messages,
				'code': context.code
			};

			if (this.pageTemplate) {
				const compiledData = this.pageTemplate(builtContext);
				resolve(compiledData);
			} else {
				const pageData = await this._loadTemplateFile();
				this.pageTemplate = handlebars.compile(pageData);
				const compiledData = this.pageTemplate(builtContext);
				resolve(compiledData);
			}
		});
	}

}

/*
exports.configure = configure;

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
*/

exports.MessageFormatter = MessageFormatter;
