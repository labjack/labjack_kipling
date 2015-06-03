
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
var module_manager = require('ljswitchboard-module_manager');
var modbus_map = require('ljswitchboard-modbus_map').getConstants();
var fs = require('fs');


var EventEmitter = require('events').EventEmitter;
var util = require('util');

function createFileBrowser() {
    // var chooser = $('#file-dialog-hidden');
 //    chooser.off('change');
 //    chooser.one('change', function(evt) {
 //        var fileLoc = $(this).val();
 //        console.log('Selected File', fileLoc);
 //        self.updateSelectedFWFile(fileLoc);
 //        // $('#file-loc-input').val(fileLoc);
 //    });

 //    chooser.trigger('click');

    this.fileBrowserDialog = undefined;
    this.fileSaveDialog = undefined;

    this.eventList = {
        FILE_SELECTED: 'FILE_SELECTED',
    };
    this.initialize = function(bundle) {
        var defered = q.defer();

        self.fileBrowserDialog = $('#file-dialog-hidden');
        self.fileSaveDialog = $('#file-save-dialog-hidden');

        defered.resolve(bundle);
        return defered.promise;
    };

    var innerBrowseForFile = function() {
        self.fileBrowserDialog.off('change');
        self.fileBrowserDialog.one('change', function(evt) {
            var fileLoc = $(this).val();
            self.emit(self.eventList.FILE_SELECTED, fileLoc);
            // Reset the selected value to empty
            $(this).val('');
        });

        self.fileBrowserDialog.trigger('click');
    };
    this.browseForFile = function(options) {
        var fileFilters = '';
        if(options) {
            if(options.filters) {
                fileFilters = options.filters.toString();
            }
        }
        // Configuring as per:
        // https://github.com/nwjs/nw.js/wiki/File-dialogs

        // Configure file-filters
        self.fileBrowserDialog.attr('accept', fileFilters);

        setTimeout(innerBrowseForFile, 1);
    };
    var self = this;
}
util.inherits(createFileBrowser, EventEmitter);

var FILE_BROWSER = new createFileBrowser();