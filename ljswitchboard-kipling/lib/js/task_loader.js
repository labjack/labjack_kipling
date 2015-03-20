

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
	};
	this.eventList = eventList;

	this.tasks = {};

	var TASK_LOADER_DESTINATION_ID = 'module-chrome-task-loader';
	var TASK_LOADER_TEMPLATE_FILE_NAME = 'task_module.html';
	var TASK_CREATOR_TEMPLATE_STR = 'create_task_{{name}}';
	var TASK_CREATOR_TEMPLATE = handlebars.compile(TASK_CREATOR_TEMPLATE_STR);


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
		// console.log('Loading Task Data', task);
		module_manager.loadModuleData(task.task)
		.then(function(taskData) {
			task.taskData = taskData;
			defered.resolve(task);
		});
		
		return defered.promise;
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
		};
		// module_manager.loadModuleDataByName(testTaskName)
		loadTaskData(taskData)
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
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	var self = this;
}
util.inherits(createTaskLoader, EventEmitter);

var TASK_LOADER = new createTaskLoader();