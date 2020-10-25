'use strict';

const path = require('path');
const {EventEmitter} = require('events');
const package_loader = global.lj_di_injector.get('package_loader');
const module_manager = package_loader.getPackage('module_manager');
const core = package_loader.getPackage('core');

const handleBarsService = core.handleBarsService;

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
		return new Promise((resolve, reject) => {

		resolve();
		});
	}

	getTaskLoaderDestination() {
		if(this.cachedTaskLoaderDestination) {
			return this.cachedTaskLoaderDestination;
		} else {
			this.cachedTaskLoaderDestination = $('#' + TASK_LOADER_DESTINATION_ID);
			return this.cachedTaskLoaderDestination;
		}
	}

	loadTaskData(task) {
		return new Promise((resolve, reject) => {
			module_manager.loadModuleData(task.task)
			.then((taskData) => {
				task.taskData = taskData;
				resolve(task);
			});
		});
	}

	checkForViewData(task) {
		return new Promise((resolve, reject) => {
		// console.log('in checkForViewData', task, task.task.name);
		let hasViewData = false;

		// Search the current task for the "hasView" attribute and check to see
		// if it is true.  If it is then it should have a view.html and style.css
		// file that needs to be loaded.

		// Search the current task's loaded data for any cssFiles or htmlFiles
		// that should be loaded.

		let viewIndex = -1;
		let styleIndex = -1;

		if(typeof(task.task.data.hasView) !== 'undefined') {
			if(task.task.data.hasView) {
				if(task.task.htmlFiles) {
					viewIndex = task.task.htmlFiles.indexOf('view.html');
				}
				if(task.task.cssFiles) {
					styleIndex = task.task.cssFiles.indexOf('style.css');
				}
				if((viewIndex > -1) && (styleIndex > -1)) {
					hasViewData = true;
				}
			}
		}
		if(hasViewData) {
			task.hasViewData = true;
			task.viewDataIndices = {
				'view': viewIndex,
				'style': styleIndex,
			};
		}

		resolve(task);
		});
	}

	renderViewData(task) {
		return new Promise((resolve, reject) => {
			if(task.hasViewData) {
				const taskViewData = task.taskData.htmlFiles.view;
				const viewTemplate = handlebars.compile(taskViewData);
				try {
					task.compiledViewData = viewTemplate(task.taskData);
				} catch(err) {
					console.error('Error Compiling Task view.html', err);
				}
			}
			resolve(task);
		});
	}

	constructTaskView(task) {
		return new Promise((resolve, reject) => {
		if(task.hasViewData) {
			compileTemplate(TASK_VIEW_TEMPLATE_FILE_NAME, task)
			.then((compiledTask) => {
				// Save the compiled data
				task.constructedTaskHTMLData = compiledTask;
				resolve(task);
			});
		} else {
			resolve(task);
		}
		});
	}

	createAndLoadHTMLElement(task) {
		return new Promise((resolve, reject) => {
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
		if(task.hasViewData) {
			return this.createAndLoadHTMLElement(task);
		} else {
			return Promise.resolve(task);
		}
	}

	constructTaskData(task) {
		return new Promise((resolve, reject) => {
			compileTemplate(TASK_LOADER_TEMPLATE_FILE_NAME, task.taskData)
				.then((compiledTask) => {
					task.compiledData = compiledTask;
					task.taskCreatorName = 'create_task_' + task.taskData.name;
					resolve(task);
				});
		});
	}

	loadTaskIntoPage(task) {
		return new Promise((resolve, reject) => {
		try {
			const newElement = document.createElement('script');
			newElement.setAttribute('type', 'text/javascript');

			// Save the file's data
			task.element = newElement;
			newElement.appendChild(document.createTextNode(task.compiledData));
			task.destination.append(newElement);
			resolve(task);
		} catch(err) {
			console.error('Error Loading Element', err);
			console.error(task.task.name);
			task.element = undefined;
			resolve(task);
		}
		// console.log('Loading task into page....');
		// resolve(task);

		});
	}

	executeLoadedTask(task) {
		return new Promise((resolve, reject) => {
		try {
			const taskName = task.task.name;
			const creatorName = task.taskCreatorName;
			console.log('Saving Task Reference', taskName);
			this.tasks[taskName] = new window[creatorName](task.taskData);
			resolve(task);
		} catch(err) {
			console.error(
				'Error Executing Task',
				task.task.name,
				err,
				err.stack
			);
			resolve(task);
		}
		});
	}

	updateStatistics(task) {
		return new Promise((resolve, reject) => {
		resolve(task);
		});
	}

	loadTask(task) {
		return new Promise((resolve, reject) => {

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
		this.loadTaskData(taskData)
			.then(task => this.checkForViewData(task))
			.then(task => this.renderViewData(task))
			.then(task => this.constructTaskView(task))
			.then(task => this.loadViewData(task))
			.then(task => this.constructTaskData(task))
			.then(task => this.loadTaskIntoPage(task))
			.then(task => this.executeLoadedTask(task))
			.then(task => this.updateStatistics(task))
			.then(resolve, reject);
		});
	}

	internalLoadTasks(tasks) {
		return new Promise((resolve) => {
			const promises = tasks.map(task => this.loadTask(task));
			Promise.allSettled(promises)
				.then((res) => {
					resolve(tasks);
				});
		});
	}

	internalStartTask(taskName) {
		return new Promise((resolve, reject) => {
			if(this.tasks[taskName]) {
				const task = this.tasks[taskName];
				if(task.startTask) {
					console.log('Starting Task');
					try {
						task.startTask()
						.then(resolve, reject);
					} catch(err) {
						console.error('Error Starting task', err);
						resolve();
					}
				} else {
					console.log('task does not have a startTask property', taskName);
					resolve();
				}
			} else {
				resolve();
			}
		});
	}

	startTask(taskName) {
		return new Promise((resolve, reject) => {
			this.internalStartTask(taskName)
				.then(() => {
					this.emit(eventList.STARTED_TASK, taskName);
					resolve();
				});
		});
	}

	startTasks(tasks) {
		return new Promise((resolve, reject) => {
			const keys = Object.keys(this.tasks);
			const promises = keys.map(this.startTask);

			Promise.allSettled(promises)
				.then(() => {
					this.emit(eventList.STARTED_TASKS);
					resolve(tasks);
				});
		});
	}

	internalStopTask(taskName) {
		return new Promise((resolve, reject) => {
			if(this.tasks[taskName]) {
				const task = this.tasks[taskName];
				if(task.stopTask) {
					console.log('Stopping Task');
					try {
						task.stopTask()
						.then(resolve, reject);
					} catch(err) {
						console.error('Error Stopping task', err);
						resolve();
					}
				} else {
					console.log('task does not have a stopTask property', taskName);
					resolve();
				}
			} else {
				resolve();
			}
		});
	}

	stopTask(taskName) {
		return new Promise((resolve, reject) => {
			this.internalStopTask(taskName)
				.then(() => {
					this.tasks[taskName] = null;
					this.tasks[taskName] = undefined;
					delete this.tasks[taskName];

					this.emit(eventList.STOPPED_TASK, taskName);
					resolve();
				});
		});
	}

	stopTasks() {
		return new Promise((resolve, reject) => {
			const keys = Object.keys(this.tasks);
			const promises = keys.map(this.stopTask);

			Promise.allSettled(promises)
				.then(() => {
					this.emit(eventList.STOPPED_TASKS);
					resolve();
				});
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

	loadTasks() {
		return new Promise((resolve, reject) => {
			this.stopTasks()
				.then(() => this.clearTasksFromDOM())
				.then(module_manager.getTaskList)
				.then(tasks => this.internalLoadTasks(tasks))
				.then(tasks => this.startTasks(tasks))
				.then(resolve, reject);
		});
	}
}

global.TASK_LOADER = new TaskLoader();
