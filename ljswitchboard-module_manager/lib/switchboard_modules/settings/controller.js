'use strict';

/* jshint undef: true, unused: true, undef: true */
/* global $, console, MODULE_LOADER, MODULE_CHROME */
/* global handlebars */
/* exported activeModule */

class ModuleInstance {
	constructor() {
		this.moduleData = undefined;
		this.debug = false;

		this.templatesToCompile = [
			'settings'
		];
		this.templates = {};
		this.kipling_updater_service = global.TASK_LOADER.tasks.kipling_updater_service;
		MODULE_LOADER.addPreloadStep((data) => this.preLoadStep(data));
		this.table = undefined;

		const mlEvents = MODULE_LOADER.eventList;
		MODULE_LOADER.on(mlEvents.VIEW_READY, () => this.startModule());
		MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, () => this.stopModule());
	}

	compileTemplate(templateName) {
        try {
            this.templates[templateName] = handlebars.compile(
				this.moduleData.htmlFiles[templateName]
            );
        } catch(err) {
            console.error(
                'Error compiling template',
                templateName,
                err
            );
        }
    }

    // Attach a pre-load step to the Module loader
	async preLoadStep(newModule) {
		newModule.context.pageData = await this.kipling_updater_service.getProgramInfo();
		console.log('prrrr', newModule.context.pageData);
		return newModule;
    }

	startModule(newModule) {
		this.table = $('#ljm_special_addresses_table').DataTable({
			"columns": [
				{'title': 'IP Address',		'data': 'ip'},
				{'title': 'Description', 	'data': 'comments'},
				{'title': 'Device Type',	'data': 'deviceType'},
				{'title': 'Connection Type','data': 'connectionType'},
				{'title': 'Verified',		'data': 'verified'},
			],
			"data": [{
				'ip': '192.168.1.12',
				'comments': 'bla bla bla 1',
				'deviceType': '',
				'connectionType': '',
				'verified': '',
			}, {
				'ip': '192.168.1.13',
				'comments': 'bla bla bla 2',
				'deviceType': '',
				'connectionType': '',
				'verified': '',
			}, {
				'ip': '192.168.1.14',
				'comments': 'bla bla bla 3',
				'deviceType': '',
				'connectionType': '',
				'verified': '',
			}]
		});

		// console.log('device_selector starting', newModule.name, newModule.id);
		this.moduleData = newModule.data;

		// Compile module templates
        this.templatesToCompile.forEach(this.compileTemplate);

		const reportedData = {
			'name': this.moduleData.name,
		};
		MODULE_CHROME.emit('MODULE_READY', reportedData);
		MODULE_LOADER.emit('MODULE_READY', reportedData);
	}
	stopModule() {
		// console.log('device_selector stopped');
		// this.emit(this.eventList.MODULE_STOPPED);
	}
}

global.activeModule = new ModuleInstance();
