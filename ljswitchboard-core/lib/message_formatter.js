'use strict';

const path = require('path');
const {handleBarsService} = require('./handlebar_service');

const cwd = path.dirname(module.filename);
const pageTemplateName = 'message_template.html';
const pageTemplatePath = path.join(cwd, pageTemplateName);

class MessageFormatter {

	constructor(injector) {
		this.injector = injector;
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

		return await handleBarsService.renderTemplate(pageTemplatePath, builtContext);
	}

}

exports.MessageFormatter = MessageFormatter;
