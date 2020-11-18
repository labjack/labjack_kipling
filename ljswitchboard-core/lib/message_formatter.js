'use strict';

const path = require('path');

const cwd = path.dirname(module.filename);
const pageTemplateName = 'message_template.html';
const pageTemplatePath = path.join(cwd, pageTemplateName);

class MessageFormatter {

	constructor(package_loader) {
		this.package_loader = package_loader;
		this.handleBarsService = package_loader.getPackage('handleBarsService');
	}

	async renderTemplate(context) {
		const textStyling = {
			'passed': 'bs-callout-success',
			'failed': 'bs-callout-danger'
		}[context.result];
		const stepAppend = {
			'passed': '',
			'failed': 'Error '
		}[context.result];

		if (context.result === 'failed') {
			const window_manager = this.package_loader.getPackage('window_manager');
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

		return await this.handleBarsService.renderTemplate(pageTemplatePath, builtContext);
	}

}

exports.MessageFormatter = MessageFormatter;
