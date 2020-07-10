
console.log('in register_finder.js', moduleData);
var self = this;
var notifications = {};
var q = global.require('q');

// Templates:
this.templates = {};
var templatesToCompile = [
	'child_table',
	'register_details'
];
templatesToCompile.forEach(function(key) {
	try {
		self.templates[key] = handlebars.compile(moduleData.htmlFiles[key]);
	} catch(err) {
		console.error('Error compiling template, register_finder.js', err);
	}
});

this.tableWatchRegisterCache = {};
this.getRegisterWatchStatus = function(registerName) {
    if(typeof(self.tableWatchRegisterCache[registerName]) === 'undefined') {
        return false;
    } else {
        return self.tableWatchRegisterCache[registerName];
    }
};
this.saveRegisterWatchStatus = function(registerName, newState) {
    if(newState) {
        console.log('Adding to watch-list', registerName);
    } else {
        console.log('Removing from watch-list', registerName);
    }
    // console.log('Saving register watch status', registerName, newState);
    self.tableWatchRegisterCache[registerName] = newState;
    return self.tableWatchRegisterCache[registerName];
};
this.tableManager = undefined;




this.table = undefined;
var dataTableID = '#modbus_map_table';

var initializeDataTable = function() {
	var defered = q.defer();

	self.tableManager = new dataTableCreator();
	
	defered.resolve();
	return defered.promise;
};
var linkTableManagersControls = function() {
	var defered = q.defer();

	self.tableManager.saveControls({
		'getRegisterWatchStatus': self.getRegisterWatchStatus,
		'saveRegisterWatchStatus': self.saveRegisterWatchStatus,
	});

	defered.resolve();
	return defered.promise;
};
var updateTableManagerTemplates = function() {
	var defered = q.defer();

	// Update the tableManager's templates
	self.tableManager.updateTemplates(self.templates);

	defered.resolve();
	return defered.promise;
};
var updateCachedTableData = function() {
	var defered = q.defer();
	self.tableManager.updateData();

	defered.resolve();
	return defered.promise;
};
var createDataTable = function() {
	var defered = q.defer();

	self.table = self.tableManager.createDataTable(dataTableID);
	defered.resolve();
	return defered.promise;
};

try {
	global.require('@labjack/ljmmm-parse');
	console.log('Required ljmmm-parse');
} catch(err) {
	console.log('Error requiring ljmmm-parse');
}

initializeDataTable()
.then(linkTableManagersControls)
.then(updateTableManagerTemplates)
.then(updateCachedTableData)
.then(createDataTable)
.done();

var register_finder_view_id = '#register_finder_task_view';
var primary_module_id = '#module-chrome-loaded-module-view';
/**
 * Create an externally accessibal method to display the register finder tool.
 */
this.showRegisterFinder = function(options) {
	var defered = q.defer();


	console.log('in register_finder, showRegisterFinder');

	$(primary_module_id).hide();

	// configure what device registers are shown:
	// TASK_LOADER.tasks.register_finder.tableManager.dataTableData.headers.devices
	// TASK_LOADER.tasks.register_finder.table.column(12).search('Digit').draw()
	// TASK_LOADER.tasks.register_finder.table.column(12).search('T7').draw()
	// TASK_LOADER.tasks.register_finder.table.column(12).search('').draw()

	var initialActiveRegisters = {};
	if(options.activeRegisters) {

	}
	var activeDevices = [];
	if(options.activeDevices) {

	}
	

	$(register_finder_view_id).show();
	
	defered.resolve();
	return defered.promise;
};

/**
 * Create an externally accessable method to hide the register finder tool.
 */
this.hideRegisterFInder = function() {
	var defered = q.defer();

	console.log('in register_finder, hideRegisterFInder');

	$(register_finder_view_id).hide();
	$(primary_module_id).show();

	defered.resolve();
	return defered.promise;
};
;