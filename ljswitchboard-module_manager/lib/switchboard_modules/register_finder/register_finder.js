console.log('in register_finder.js', moduleData);
var self = this;
var notifications = {};

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
	self.tableManager = new dataTableCreator();
	
	return Promise.resolve();
};
var linkTableManagersControls = function() {
	self.tableManager.saveControls({
		'getRegisterWatchStatus': self.getRegisterWatchStatus,
		'saveRegisterWatchStatus': self.saveRegisterWatchStatus,
	});

	return Promise.resolve();
};
var updateTableManagerTemplates = function() {
	self.tableManager.updateTemplates(self.templates);
	return Promise.resolve();
};
var updateCachedTableData = function() {
	self.tableManager.updateData();
	return Promise.resolve();
};
var createDataTable = function() {
	self.table = self.tableManager.createDataTable(dataTableID);
	return Promise.resolve();
};

try {
	global.require('ljmmm-parse');
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
	console.log('in register_finder, showRegisterFinder');

	$(primary_module_id).hide();
	$(register_finder_view_id).show();
	
	return Promise.resolve();
};

/**
 * Create an externally accessable method to hide the register finder tool.
 */
this.hideRegisterFInder = function() {
	console.log('in register_finder, hideRegisterFInder');

	$(register_finder_view_id).hide();
	$(primary_module_id).show();

	return Promise.resolve();
};
