
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
    this.folderSelectDialog = undefined;

    this.eventList = {
        FILE_SELECTED: 'FILE_SELECTED',
        FILE_NOT_SELECTED: 'FILE_NOT_SELECTED'
    };
    this.initialize = function(bundle) {
        var defered = q.defer();

        self.fileBrowserDialog = $('#file-dialog-hidden');
        self.fileSaveDialog = $('#file-save-dialog-hidden');
        self.folderSelectDialog = $('#folder-select-dialog-hidden');

        defered.resolve(bundle);
        return defered.promise;
    };

    function innerBrowseForFile() {
        self.fileBrowserDialog.val('');
        self.fileBrowserDialog.off('change');
        self.fileBrowserDialog.one('change', function fileSelected(evt) {
            var fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER file not selected');
                self.emit(self.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER file selected');
                self.emit(self.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });

        self.fileBrowserDialog.trigger('click');
    }
    this.browseForFile = function(options) {
        var fileFilters = '';
        var workingDirectory = fs_facade.getDefaultFilePath();
        if(options) {
            if(options.filters) {
                fileFilters = options.filters.toString();
            }
            if(options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }
        // Configuring as per:
        // https://github.com/nwjs/nw.js/wiki/File-dialogs

        // Configure file-filters
        // self.fileBrowserDialog.attr('accept', fileFilters);
        // self.fileSaveDialog.attr('nwworkingdir', workingDirectory);
        self.fileBrowserDialog[0].setAttribute('accept', fileFilters);
        self.fileBrowserDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(innerBrowseForFile, 1);
    };

    function innerBrowseForFolder() {
        self.folderSelectDialog.val('');
        self.folderSelectDialog.off('change');
        self.folderSelectDialog.one('change', function fileSelected(evt) {
            var fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER folder not selected');
                self.emit(self.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER folder selected');
                self.emit(self.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });
        self.folderSelectDialog.trigger('click');
    }

    this.browseForFolder = function(options) {
        var fileFilters = '';
        var workingDirectory = fs_facade.getDefaultFilePath();
        if(options) {
            if(options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }
        // Configuring as per:
        // https://github.com/nwjs/nw.js/wiki/File-dialogs

        // Configure folder-options
        self.folderSelectDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(innerBrowseForFolder, 1);
    };


    /*
    CODE FROM "luaDeviceController.js":

    var chooser = $(fs_facade.getFileSaveAsID());
    chooser[0].files.append(new File("luaScript", ""));
    chooser.attr('nwsaveas', 'luaScript.lua');
    chooser.attr('accept', '.lua');
    chooser.attr('nwworkingdir',fs_facade.getDefaultFilePath());
    var onChangedSaveToFile = function(event) {
        var fileLoc = $(fs_facade.getFileSaveAsID()).val();
        if(fileLoc === '') {
            console.log('No File Selected');
            fileIODeferred.resolve();
            return;
        }
        var scriptData = self.codeEditorDoc.getValue();

        self.print('Saving Script to file - saveAs', '"' + fileLoc + '"');

        fs_facade.saveDataToFile(
            fileLoc,
            scriptData,
            function(err) {
                // onError function
                console.log('Failed to Save Script to file', err);
                fileIODeferred.reject(err);
            },
            function() {
                // onSuccess function
                self.print('Successfuly Saved Script to File');

                // Update Internal Constants
                self.configureAsUserScript(fileLoc);

                fileIODeferred.resolve();
            }
        );
    };

    chooser.unbind('change');
    chooser.bind('change', onChangedSaveToFile);

    chooser.trigger('click');
    */
    function innerSaveFile() {
        self.fileSaveDialog.val('');
        self.fileSaveDialog.off('change');
        self.fileSaveDialog.one('change', function fileSelected(evt) {
            var fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER file not selected');
                self.emit(self.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER file selected');
                self.emit(self.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });

        self.fileSaveDialog.trigger('click');
    }
    this.saveFile = function(options) {
        var fileFilters = '';
        var suggestedName = '';
        var workingDirectory = fs_facade.getDefaultFilePath();
        if(options) {
            if(options.filters) {
                fileFilters = options.filters.toString();
            }
            if(options.suggestedName) {
                suggestedName = options.suggestedName.toString();
            }
            if(options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }
        // Configuring as per:
        // https://github.com/nwjs/nw.js/wiki/File-dialogs

        // Configure file-filters
        // self.fileSaveDialog.attr('accept', fileFilters);
        // self.fileSaveDialog.attr('nwsaveas', suggestedName);
        // self.fileSaveDialog.attr('nwworkingdir', workingDirectory);
        self.fileSaveDialog[0].setAttribute('accept', fileFilters);
        self.fileSaveDialog[0].setAttribute('nwsaveas', suggestedName);
        self.fileSaveDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(innerSaveFile, 1);
    };
    var self = this;
}
util.inherits(createFileBrowser, EventEmitter);

var FILE_BROWSER = new createFileBrowser();