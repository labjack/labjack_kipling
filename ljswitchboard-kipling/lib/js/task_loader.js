'use strict';

const path = require('path');
const {EventEmitter} = require('events');
const package_loader = global.package_loader;
const module_manager = package_loader.getPackage('module_manager');

// Configure the module_manager persistent data path.
const kiplingExtractionPath = package_loader.getExtractionPath();
const moduleDataPath = path.normalize(path.join(
	kiplingExtractionPath,
	'module_data'
));
module_manager.configurePersistentDataPath(moduleDataPath);
module_manager.disableLinting();

const eventList = {
	STOPPED_TASK: 'STOPPED_TASK',
	STOPPED_TASKS: 'STOPPED_TASKS',
	LOADING_TASK: 'LOADING_TASK',
	STARTED_TASK: 'STARTED_TASK',
	STARTED_TASKS: 'STARTED_TASKS',
};

const TASK_LOADER_DESTINATION_ID = 'module-chrome-task-loader';
const TASK_LOADER_TEMPLATE_FILE_NAME = 'task_module.html';

const TASK_VIEW_TEMPLATE_FILE_NAME = 'task_view.html';
const TASK_VIEW_DESTINATION_ID = 'module-chrome-loaded-task-views';

const compileTemplate = global.MODULE_CHROME.compileTemplate; // jshint ignore:line

class TaskLoader extends EventEmitter { // jshint ignore:line

	constructor() {
		super();

		this.eventList = eventList;

		this.tasks = {};
		this.cachedTaskLoaderDestination = undefined;
	}

	renderTaskTemplate(name, context) {
		return Promise.resolve();
	}

	getTaskLoaderDestination() {
		if (this.cachedTaskLoaderDestination) {
			return this.cachedTaskLoaderDestination;
		} else {
			this.cachedTaskLoaderDestination = $('#' + TASK_LOADER_DESTINATION_ID);
			return this.cachedTaskLoaderDestination;
		}
	}

	loadTaskData(task) {
		return module_manager
			.loadModuleData(task.task)
			.then((taskData) => {
				task.taskData = taskData;
				return task;
			});
	}

	async checkForViewData(task) {
		let hasViewData = false;

		// Search the current task for the "hasView" attribute and check to see
		// if it is true.  If it is then it should have a view.html and style.css
		// file that needs to be loaded.

		// Search the current task's loaded data for any cssFiles or htmlFiles
		// that should be loaded.

		let viewIndex = -1;
		let styleIndex = -1;

		if (typeof(task.task.data.hasView) !== 'undefined') {
			if (task.task.data.hasView) {
				if (task.task.htmlFiles) {
					viewIndex = task.task.htmlFiles.indexOf('view.html');
				}
				if (task.task.cssFiles) {
					styleIndex = task.task.cssFiles.indexOf('style.css');
				}
				if ((viewIndex > -1) && (styleIndex > -1)) {
					hasViewData = true;
				}
			}
		}
		if (hasViewData) {
			task.hasViewData = true;
			task.viewDataIndices = {
				'view': viewIndex,
				'style': styleIndex,
			};
		}

		return task;
	}

	async renderViewData(task) {
		if (task.hasViewData) {
			const taskViewData = task.taskData.htmlFiles.view;
			const viewTemplate = global.handlebars.compile(taskViewData);
			try {
				task.compiledViewData = viewTemplate(task.taskData);
			} catch(err) {
				console.error('Error Compiling Task view.html', err);
			}
		}
		return task;
	}

	async constructTaskView(task) {
		if (task.hasViewData) {
			const compiledTask = await compileTemplate(TASK_VIEW_TEMPLATE_FILE_NAME, task);
			// Save the compiled data
			task.constructedTaskHTMLData = compiledTask;
			return task;
		} else {
			return task;
		}
	}

	createAndLoadHTMLElement(task) {
		return new Promise((resolve) => {
			try {
				// Create the new element
				const newElement = $(task.constructedTaskHTMLData);

				// Insert newly created element into the DOM
				const taskViewHolder = $('#' + TASK_VIEW_DESTINATION_ID);
				taskViewHolder.append(newElement);

				// Wait for the task's view to be ready & resolve.
				const taskID = '#' + task.task.name + '_task_view';
				$(taskID).ready(() => {
					resolve(task);
				});
			} catch(err) {
				console.error('Error in createAndLoadHTMLElement, task_loader.js', err);
			}
		});
	}

	loadViewData(task) {
		if (task.hasViewData) {
			return this.createAndLoadHTMLElement(task);
		} else {
			return Promise.resolve(task);
		}
	}

	constructTaskData(task) {
		return compileTemplate(TASK_LOADER_TEMPLATE_FILE_NAME, task.taskData)
			.then((compiledTask) => {
				task.compiledData = compiledTask;
				task.taskCreatorName = 'create_task_' + task.taskData.name;
				return task;
			});
	}

	async loadTaskIntoPage(task) {
		try {
			const newElement = document.createElement('script');
			newElement.setAttribute('type', 'text/javascript');

			// Save the file's data
			task.element = newElement;
			newElement.appendChild(document.createTextNode(task.compiledData));
			task.destination.append(newElement);
			return task;
		} catch(err) {
			console.error('Error Loading Element', err);
			console.error(task.task.name);
			task.element = undefined;
			throw task;
		}
	}

	async executeLoadedTask(task) {
		try {
			const taskName = task.task.name;
			const creatorName = task.taskCreatorName;
			console.log('Saving Task Reference', taskName, creatorName);
			this.tasks[taskName] = new window[creatorName](task.taskData);
			return task;
		} catch(err) {
			console.error(
				'Error Executing Task',
				task.task.name,
				err,
				err.stack
			);
			throw task;
		}
	}

	updateStatistics(task) {
		return Promise.resolve(task);
	}

	loadTask(task) {
		this.emit(eventList.LOADING_TASK, task);

		const taskData = {
			'task': task,
			'taskData': {},
			'compiledData': '',
			'taskCreatorName': '',
			'destination': this.getTaskLoaderDestination(),
			'element': undefined,
			'hasViewData': false,
			'viewDataIndices': undefined,
			'compiledViewData': '',
			'constructedTaskHTMLData': ''
		};
		// module_manager.loadModuleDataByName(testTaskName)
		return this.loadTaskData(taskData)
			.then(task => this.checkForViewData(task))
			.then(task => this.renderViewData(task))
			.then(task => this.constructTaskView(task))
			.then(task => this.loadViewData(task))
			.then(task => this.constructTaskData(task))
			.then(task => this.loadTaskIntoPage(task))
			.then(task => this.executeLoadedTask(task))
			.then(task => this.updateStatistics(task));
	}

	internalLoadTasks(tasks) {
		const promises = tasks.map(task => this.loadTask(task).catch((err) => {
			console.error(err);
		}));
		return Promise.allSettled(promises)
			.then((res) => {
				return tasks;
			});
	}

	async internalStartTask(taskName) {
		if (this.tasks[taskName]) {
			const task = this.tasks[taskName];
			if (task.startTask) {
				console.log('Starting Task', taskName);
				try {
					return task.startTask();
				} catch(err) {
					console.error('Error Starting task', err);
				}
			} else {
				console.log('task does not have a startTask property', taskName);
			}
		}
	}

	startTask(taskName) {
		return this.internalStartTask(taskName)
			.then(() => {
				this.emit(eventList.STARTED_TASK, taskName);
			});
	}

	startTasks(tasks) {
		const keys = Object.keys(this.tasks);
		const promises = keys.map((taskName) => this.startTask(taskName).catch(err => {
			console.error(err);
		}));

		return Promise.allSettled(promises)
			.then(() => {
				this.emit(eventList.STARTED_TASKS);
				return tasks;
			});
	}

	async internalStopTask(taskName) {
		if (this.tasks[taskName]) {
			const task = this.tasks[taskName];
			if (task.stopTask) {
				console.log('Stopping Task');
				try {
					return task.stopTask();
				} catch(err) {
					console.error('Error Stopping task', err);
				}
			} else {
				console.log('task does not have a stopTask property', taskName);
			}
		}
	}

	stopTask(taskName) {
		return this.internalStopTask(taskName)
			.then(() => {
				this.tasks[taskName] = null;
				this.tasks[taskName] = undefined;
				delete this.tasks[taskName];

				this.emit(eventList.STOPPED_TASK, taskName);
			});
	}

	stopTasks() {
		const keys = Object.keys(this.tasks);
		const promises = keys.map(this.stopTask);

		return Promise.allSettled(promises)
			.then(() => {
				this.emit(eventList.STOPPED_TASKS);
			});
	}

	clearTasksFromDOM() {
		return new Promise((resolve, reject) => {
			try {
				this.getTaskLoaderDestination().empty();
			} catch(err) {
				console.error('Failed to clearTasksFromDOM', err, err.stack);
			}
			resolve();
		});
	}

	async loadTasks() {
		await this.stopTasks();
		await this.clearTasksFromDOM();

		const tasks = await module_manager.getTaskList();
		console.log('Load tasks', tasks.map(t => t.name));

		await this.internalLoadTasks(tasks);
		await this.startTasks(tasks);

		return tasks;
	}
}

global.TASK_LOADER = new TaskLoader();
