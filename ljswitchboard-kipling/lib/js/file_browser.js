'use strict';

const {EventEmitter} = require('events');

class FileBrowser extends EventEmitter {

    constructor() {
        super();

        this.fileBrowserDialog = undefined;
        this.fileSaveDialog = undefined;
        this.folderSelectDialog = undefined;

        this.eventList = {
            FILE_SELECTED: 'FILE_SELECTED',
            FILE_NOT_SELECTED: 'FILE_NOT_SELECTED'
        };
    }

    initialize(bundle) {
        this.fileBrowserDialog = $('#file-dialog-hidden');
        this.fileSaveDialog = $('#file-save-dialog-hidden');
        this.folderSelectDialog = $('#folder-select-dialog-hidden');

        return Promise.resolve(bundle);
    }

    innerBrowseForFile() {
        this.fileBrowserDialog.val('');
        this.fileBrowserDialog.off('change');
        this.fileBrowserDialog.one('change', (evt) => {
            const fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER file not selected');
                this.emit(this.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER file selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });

        this.fileBrowserDialog.trigger('click');
    }

    browseForFile(options) {
        let fileFilters = '';
        let workingDirectory = fs_facade.getDefaultFilePath();
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
        // this.fileBrowserDialog.attr('accept', fileFilters);
        // this.fileSaveDialog.attr('nwworkingdir', workingDirectory);
        this.fileBrowserDialog[0].setAttribute('accept', fileFilters);
        this.fileBrowserDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(() => this.innerBrowseForFile(), 1);
    }

    innerBrowseForFolder() {
        this.folderSelectDialog.val('');
        this.folderSelectDialog.off('change');
        this.folderSelectDialog.one('change', (evt) => {
            const fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER folder not selected');
                this.emit(this.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER folder selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });
        this.folderSelectDialog.trigger('click');
    }

    browseForFolder(options) {
        let workingDirectory = fs_facade.getDefaultFilePath();
        if(options) {
            if(options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }
        // Configuring as per:
        // https://github.com/nwjs/nw.js/wiki/File-dialogs

        // Configure folder-options
        this.folderSelectDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(() => this.innerBrowseForFolder(), 1);
    }

    innerSaveFile() {
        this.fileSaveDialog.val('');
        this.fileSaveDialog.off('change');
        this.fileSaveDialog.one('change', (evt) => {
            const fileLoc = $(this).val();

            if(fileLoc === '') {
                console.log('FILE_BROWSER file not selected');
                this.emit(this.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER file selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
            }

            // Reset the selected value to empty
            $(this).val('');
        });

        this.fileSaveDialog.trigger('click');
    }

    saveFile(options) {
        let fileFilters = '';
        let suggestedName = '';
        let workingDirectory = fs_facade.getDefaultFilePath();
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
        // this.fileSaveDialog.attr('accept', fileFilters);
        // this.fileSaveDialog.attr('nwsaveas', suggestedName);
        // this.fileSaveDialog.attr('nwworkingdir', workingDirectory);
        this.fileSaveDialog[0].setAttribute('accept', fileFilters);
        this.fileSaveDialog[0].setAttribute('nwsaveas', suggestedName);
        this.fileSaveDialog[0].setAttribute('nwworkingdir', workingDirectory);

        setTimeout(() => this.innerSaveFile(), 1);
    }
}

const FILE_BROWSER = new FileBrowser();
