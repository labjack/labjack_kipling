

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
try {
	handlebars.registerHelper('printContext', function() {
		return new handlebars.SafeString(JSON.stringify({'context': this}, null, 2));
	});
} catch(err) {
	console.log('HErE', err);
}
var module_manager = require('ljswitchboard-module_manager');
var fs = require('fs');
var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var static_files = require('ljswitchboard-static_files');

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
		var defered = q.defer();

		defered.resolve();
		return defered.promise;
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
		var defered = q.defer();
		module_manager.loadModuleData(task.task)
		.then(function(taskData) {
			task.taskData = taskData;
			defered.resolve(task);
		});
		
		return defered.promise;
	};
	var checkForViewData = function(task) {
		var defered = q.defer();
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

		defered.resolve(task);
		return defered.promise;
	};
	var renderViewData = function(task) {
		var defered = q.defer();
		if(task.hasViewData) {
			var taskViewData = task.taskData.htmlFiles.view;
			var viewTemplate = handlebars.compile(taskViewData);
			try {
				task.compiledViewData = viewTemplate(task.taskData);
			} catch(err) {
				console.error('Error Compiling Task view.html', err);
			}
		}
		defered.resolve(task);
		return defered.promise;
	};
	var constructTaskView = function(task) {
		var defered = q.defer();
		if(task.hasViewData) {
			compileTemplate(TASK_VIEW_TEMPLATE_FILE_NAME, task)
			.then(function(compiledTask) {
				// Save the compiled data
				task.constructedTaskHTMLData = compiledTask;
				defered.resolve(task);
			});
		} else {
			defered.resolve(task);
		}
		return defered.promise;
	};
	var createAndLoadHTMLElement = function(task) {
		var defered = q.defer();
		try {
			// Create the new element
			var newElement = $(task.constructedTaskHTMLData);

			// Insert newly created element into the DOM
			var taskViewHolder = $('#' + TASK_VIEW_DESTINATION_ID);
			taskViewHolder.append(newElement);
			
			// Wait for the task's view to be ready & resolve.
			var taskID = '#' + task.task.name + '_task_view';
			$(taskID).ready(function() {
				defered.resolve(task);
			});
		} catch(err) {
			console.error('Error in createAndLoadHTMLElement, task_loader.js', err);
		}
		return defered.promise;
	};
	var loadViewData = function(task) {
		if(task.hasViewData) {
			return createAndLoadHTMLElement(task);
		} else {
			var defered = q.defer();
			defered.resolve(task);
			return defered.promise;
		}
	};
	var constructTaskData = function(task) {
		var defered = q.defer();

		compileTemplate(TASK_LOADER_TEMPLATE_FILE_NAME, task.taskData)
		.then(function(compiledTask) {
			task.compiledData = compiledTask;
			task.taskCreatorName = TASK_CREATOR_TEMPLATE(task.taskData);
			defered.resolve(task);
		});
		return defered.promise;
	};
	var loadTaskIntoPage = function(task) {
		var defered = q.defer();
		try {
			var newElement = document.createElement('script');
			newElement.setAttribute('type', 'text/javascript');
			
			// Save the file's data
			task.element = newElement;
			newElement.appendChild(document.createTextNode(task.compiledData));
			task.destination.append(newElement);
			defered.resolve(task);
		} catch(err) {
			console.error('Error Loading Element', err);
			console.error(task.task.name);
			task.element = undefined;
			defered.resolve(task);
		}
		// console.log('Loading task into page....');
		// defered.resolve(task);
		
		return defered.promise;
	};
	var executeLoadedTask = function(task) {
		var defered = q.defer();
		try {
			var taskName = task.task.name;
			var creatorName = task.taskCreatorName;
			console.log('Saving Task Reference', taskName);
			self.tasks[taskName] = new window[creatorName](task.taskData);
			defered.resolve(task);
		} catch(err) {
			console.error(
				'Error Executing Task',
				task.task.name,
				err,
				err.stack
			);
			defered.resolve(task);
		}
		return defered.promise;
	};
	var updateStatistics = function(task) {
		var defered = q.defer();
		defered.resolve(task);
		return defered.promise;
	};
	var loadTask = function(task) {
		var defered = q.defer();

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
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	var internalLoadTasks = function(tasks) {
		var defered = q.defer();
		var promises = tasks.map(loadTask);

		q.allSettled(promises)
		.then(function(res) {
			defered.resolve(tasks);
		});
		return defered.promise;
	};
	var internalStartTask = function(taskName) {
		var defered = q.defer();
		
		var task;
		if(self.tasks[taskName]) {
			task = self.tasks[taskName];
			if(task.startTask) {
				console.log('Starting Task');
				try {
					task.startTask()
					.then(defered.resolve, defered.reject);
				} catch(err) {
					console.error('Error Starting task', err);
					defered.resolve();
				}
			} else {
				console.log('task does not have a startTask property', taskName);
				defered.resolve();
			}
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	this.startTask = function(taskName) {
		var defered = q.defer();
		
		internalStartTask(taskName)
		.then(function() {
			self.emit(eventList.STARTED_TASK, taskName);
			defered.resolve();
		});
		return defered.promise;
	};
	this.startTasks = function(tasks) {
		var defered = q.defer();
		var keys = Object.keys(self.tasks);
		var promises = keys.map(self.startTask);

		q.allSettled(promises)
		.then(function() {
			self.emit(eventList.STARTED_TASKS);
			defered.resolve(tasks);
		});
		return defered.promise;
	};
	var internalStopTask = function(taskName) {
		var defered = q.defer();
		
		var task;
		if(self.tasks[taskName]) {
			task = self.tasks[taskName];
			if(task.stopTask) {
				console.log('Stopping Task');
				try {
					task.stopTask()
					.then(defered.resolve, defered.reject);
				} catch(err) {
					console.error('Error Stopping task', err);
					defered.resolve();
				}
			} else {
				console.log('task does not have a stopTask property', taskName);
				defered.resolve();
			}
		} else {
			defered.resolve();
		}
		return defered.promise;
	};

	this.stopTask = function(taskName) {
		var defered = q.defer();
		
		internalStopTask(taskName)
		.then(function() {
			self.tasks[taskName] = null;
			self.tasks[taskName] = undefined;
			delete self.tasks[taskName];

			self.emit(eventList.STOPPED_TASK, taskName);
			defered.resolve();
		});
		return defered.promise;
	};
	this.stopTasks = function() {
		var defered = q.defer();
		var keys = Object.keys(self.tasks);
		var promises = keys.map(self.stopTask);

		q.allSettled(promises)
		.then(function() {
			self.emit(eventList.STOPPED_TASKS);
			defered.resolve();
		});
		return defered.promise;
	};
	var clearTasksFromDOM = function() {
		var defered = q.defer();
		try {
			self.getTaskLoaderDestination().empty();
		} catch(err) {
			console.error('Failed to clearTasksFromDOM', err, err.stack);
		}
		defered.resolve();
		return defered.promise;
	};

	this.loadTasks = function() {
		var defered = q.defer();

		self.stopTasks()
		.then(clearTasksFromDOM)
		.then(module_manager.getTaskList)
		.then(internalLoadTasks)
		.then(self.startTasks)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	var self = this;
}
util.inherits(createTaskLoader, EventEmitter);

var TASK_LOADER = new createTaskLoader();