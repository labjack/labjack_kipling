const EventEmitter = require('events').EventEmitter;
const util = require('util');
const path = require('path');
const handlebars = global.require('handlebars');
try {
	handlebars.registerHelper('printContext', function() {
		return new handlebars.SafeString(JSON.stringify({'context': this}, null, 2));
	});
} catch(err) {
	console.log('HErE', err);
}
var module_manager = require('ljswitchboard-module_manager');
var package_loader = require('ljswitchboard-package_loader');

// Configure the module_manager persistent data path.
var kiplingExtractionPath = package_loader.getExtractionPath();
var moduleDataPath = path.normalize(path.join(
	kiplingExtractionPath,
	'module_data'
));
module_manager.configurePersistentDataPath(moduleDataPath);
module_manager.disableLinting();

function createTaskLoader() {

	var eventList = {
		STOPPED_TASK: 'STOPPED_TASK',
		STOPPED_TASKS: 'STOPPED_TASKS',
		LOADING_TASK: 'LOADING_TASK',
		STARTED_TASK: 'STARTED_TASK',
		STARTED_TASKS: 'STARTED_TASKS',
	};
	this.eventList = eventList;

	this.tasks = {};

	var TASK_LOADER_DESTINATION_ID = 'module-chrome-task-loader';
	var TASK_LOADER_TEMPLATE_FILE_NAME = 'task_module.html';
	var TASK_CREATOR_TEMPLATE_STR = 'create_task_{{name}}';
	var TASK_CREATOR_TEMPLATE = handlebars.compile(TASK_CREATOR_TEMPLATE_STR);

	var TASK_VIEW_TEMPLATE_FILE_NAME = 'task_view.html';
	var TASK_VIEW_DESTINATION_ID = 'module-chrome-loaded-task-views';

	this.cachedTaskLoaderDestination = undefined;

	var compileTemplate = MODULE_CHROME.compileTemplate;
	var renderTaskTemplate = function(name, context) {
		return new Promise((resolve, reject) => {

		resolve();
		});
	};

	this.getTaskLoaderDestination = function() {
		if(self.cachedTaskLoaderDestination) {
			return self.cachedTaskLoaderDestination;
		} else {
			self.cachedTaskLoaderDestination = $(
				'#' + TASK_LOADER_DESTINATION_ID
			);
			return self.cachedTaskLoaderDestination;
		}
	};

	var loadTaskData = function(task) {
		return new Promise((resolve, reject) => {
			module_manager.loadModuleData(task.task)
			.then(function(taskData) {
				task.taskData = taskData;
				resolve(task);
			});
		});
	};
	var checkForViewData = function(task) {
		return new Promise((resolve, reject) => {
		// console.log('in checkForViewData', task, task.task.name);
		var hasViewData = false;

		// Search the current task for the "hasView" attribute and check to see
		// if it is true.  If it is then it should have a view.html and style.css
		// file that needs to be loaded.

		// Search the current task's loaded data for any cssFiles or htmlFiles
		// that should be loaded.

		var viewIndex = -1;
		var styleIndex = -1;

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
	};
	var renderViewData = function(task) {
		return new Promise((resolve, reject) => {
		if(task.hasViewData) {
			var taskViewData = task.taskData.htmlFiles.view;
			var viewTemplate = handlebars.compile(taskViewData);
			try {
				task.compiledViewData = viewTemplate(task.taskData);
			} catch(err) {
				console.error('Error Compiling Task view.html', err);
			}
		}
		resolve(task);
		});
	};
	var constructTaskView = function(task) {
		return new Promise((resolve, reject) => {
		if(task.hasViewData) {
			compileTemplate(TASK_VIEW_TEMPLATE_FILE_NAME, task)
			.then(function(compiledTask) {
				// Save the compiled data
				task.constructedTaskHTMLData = compiledTask;
				resolve(task);
			});
		} else {
			resolve(task);
		}
		});
	};
	var createAndLoadHTMLElement = function(task) {
		return new Promise((resolve, reject) => {
		try {
			// Create the new element
			var newElement = $(task.constructedTaskHTMLData);

			// Insert newly created element into the DOM
			var taskViewHolder = $('#' + TASK_VIEW_DESTINATION_ID);
			taskViewHolder.append(newElement);

			// Wait for the task's view to be ready & resolve.
			var taskID = '#' + task.task.name + '_task_view';
			$(taskID).ready(function() {
				resolve(task);
			});
		} catch(err) {
			console.error('Error in createAndLoadHTMLElement, task_loader.js', err);
		}
		});
	};
	var loadViewData = function(task) {
		if(task.hasViewData) {
			return createAndLoadHTMLElement(task);
		} else {
			return new Promise((resolve, reject) => {
			resolve(task);
			});
		}
	};
	var constructTaskData = function(task) {
		return new Promise((resolve, reject) => {

		compileTemplate(TASK_LOADER_TEMPLATE_FILE_NAME, task.taskData)
		.then(function(compiledTask) {
			task.compiledData = compiledTask;
			task.taskCreatorName = TASK_CREATOR_TEMPLATE(task.taskData);
			resolve(task);
		});
		});
	};
	var loadTaskIntoPage = function(task) {
		return new Promise((resolve, reject) => {
		try {
			var newElement = document.createElement('script');
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
	};
	var executeLoadedTask = function(task) {
		return new Promise((resolve, reject) => {
		try {
			var taskName = task.task.name;
			var creatorName = task.taskCreatorName;
			console.log('Saving Task Reference', taskName);
			self.tasks[taskName] = new window[creatorName](task.taskData);
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
	};
	var updateStatistics = function(task) {
		return new Promise((resolve, reject) => {
		resolve(task);
		});
	};
	var loadTask = function(task) {
		return new Promise((resolve, reject) => {

		self.emit(eventList.LOADING_TASK, task);

		var taskData = {
			'task': task,
			'taskData': {},
			'compiledData': '',
			'taskCreatorName': '',
			'destination': self.getTaskLoaderDestination(),
			'element': undefined,
			'hasViewData': false,
			'viewDataIndices': undefined,
			'compiledViewData': '',
			'constructedTaskHTMLData': ''
		};
		// module_manager.loadModuleDataByName(testTaskName)
		loadTaskData(taskData)
		.then(checkForViewData)
		.then(renderViewData)
		.then(constructTaskView)
		.then(loadViewData)
		.then(constructTaskData)
		.then(loadTaskIntoPage)
		.then(executeLoadedTask)
		.then(updateStatistics)
		.then(resolve, reject);
		});
	};
	var internalLoadTasks = function(tasks) {
		return new Promise((resolve, reject) => {
		var promises = tasks.map(loadTask);

		Promise.allSettled(promises)
			.then(function(res) {
				resolve(tasks);
			});
		});
	};
	var internalStartTask = function(taskName) {
		return new Promise((resolve, reject) => {

		var task;
		if(self.tasks[taskName]) {
			task = self.tasks[taskName];
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
	};
	this.startTask = function(taskName) {
		return new Promise((resolve, reject) => {

		internalStartTask(taskName)
		.then(function() {
			self.emit(eventList.STARTED_TASK, taskName);
			resolve();
		});
		});
	};
	this.startTasks = function(tasks) {
		return new Promise((resolve, reject) => {
			var keys = Object.keys(self.tasks);
			var promises = keys.map(self.startTask);

			Promise.allSettled(promises)
				.then(function() {
					self.emit(eventList.STARTED_TASKS);
					resolve(tasks);
				});
		});
	};
	var internalStopTask = function(taskName) {
		return new Promise((resolve, reject) => {

		var task;
		if(self.tasks[taskName]) {
			task = self.tasks[taskName];
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
	};

	this.stopTask = function(taskName) {
		return new Promise((resolve, reject) => {

		internalStopTask(taskName)
		.then(function() {
			self.tasks[taskName] = null;
			self.tasks[taskName] = undefined;
			delete self.tasks[taskName];

			self.emit(eventList.STOPPED_TASK, taskName);
			resolve();
		});
		});
	};
	this.stopTasks = function() {
		return new Promise((resolve, reject) => {
			var keys = Object.keys(self.tasks);
			var promises = keys.map(self.stopTask);

			Promise.allSettled(promises)
				.then(function() {
					self.emit(eventList.STOPPED_TASKS);
					resolve();
				});
		});
	};
	var clearTasksFromDOM = function() {
		return new Promise((resolve, reject) => {
		try {
			self.getTaskLoaderDestination().empty();
		} catch(err) {
			console.error('Failed to clearTasksFromDOM', err, err.stack);
		}
		resolve();
		});
	};

	this.loadTasks = function() {
		return new Promise((resolve, reject) => {

		self.stopTasks()
		.then(clearTasksFromDOM)
		.then(module_manager.getTaskList)
		.then(internalLoadTasks)
		.then(self.startTasks)
		.then(resolve, reject);
		});
	};
	var self = this;
}
util.inherits(createTaskLoader, EventEmitter);

var TASK_LOADER = new createTaskLoader();
