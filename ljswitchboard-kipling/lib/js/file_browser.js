'use strict';

const electron = require('electron');
const {EventEmitter} = require('events');
const path = require('path');

const dialog = electron.remote.dialog;
const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

class FileBrowser extends EventEmitter {

    constructor() {
        super();

        this.fileSaveDialog = undefined;
        this.folderSelectDialog = undefined;

        this.eventList = {
            FILE_SELECTED: 'FILE_SELECTED',
            FILE_NOT_SELECTED: 'FILE_NOT_SELECTED'
        };
    }

    initialize(bundle) {
        this.fileSaveDialog = $('#file-save-dialog-hidden');
        this.folderSelectDialog = $('#folder-select-dialog-hidden');

        return Promise.resolve(bundle);
    }

    async browseForFile(options) {
        let fileFilters = '';
        let workingDirectory = fs_facade.getDefaultFilePath();
        if (options) {
            if (options.filters) {
                fileFilters = options.filters.toString();
            }
            if (options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }

        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            defaultPath: workingDirectory,
            filters: [
                {
                    name: fileFilters,
                    extensions: [fileFilters]
                }
            ]
        });
        if (result.filePaths && result.filePaths.length > 0) {
            const fileLoc = result.filePaths[0];
            if(fileLoc === '') {
                console.log('FILE_BROWSER file not selected');
                this.emit(this.eventList.FILE_NOT_SELECTED);
            } else {
                console.log('FILE_BROWSER file selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
                return fileLoc;
            }
        } else {
            console.log('FILE_BROWSER file not selected');
            this.emit(this.eventList.FILE_NOT_SELECTED);
        }
    }

    async browseForFolder(options) {
        let workingDirectory = fs_facade.getDefaultFilePath();
        if (options) {
            if (options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }

        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            defaultPath: workingDirectory,
        });
        if (result.filePaths && result.filePaths.length > 0) {
            const fileLoc = result.filePaths[0];
            if(fileLoc === '') {
                console.log('FILE_BROWSER folder not selected');
                this.emit(this.eventList.FILE_NOT_SELECTED, fileLoc);
            } else {
                console.log('FILE_BROWSER folder selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
                return fileLoc;
            }
        }
    }

    async saveFile(options) {
        let fileFilters = '';
        let suggestedName = '';
        let workingDirectory = fs_facade.getDefaultFilePath();
        if (options) {
            if (options.filters) {
                fileFilters = options.filters.toString();
            }
            if (options.suggestedName) {
                suggestedName = options.suggestedName.toString();
            }
            if (options.workingDirectory) {
                workingDirectory = options.workingDirectory.toString();
            }
        }

        if (suggestedName) {
            workingDirectory = path.join(workingDirectory, suggestedName);
        }

        // TODO suggestedName
        const result = await dialog.showSaveDialog({
            defaultPath: workingDirectory,
            filters: [
                {
                    name: fileFilters,
                    extensions: [fileFilters]
                }
            ]
        });

        if (result.filePath) {
            const fileLoc = result.filePath;
            if (fileLoc === '') {
            } else {
                console.log('FILE_BROWSER file selected');
                this.emit(this.eventList.FILE_SELECTED, fileLoc);
                return fileLoc;
            }
        }

        console.log('FILE_BROWSER file not selected');
        this.emit(this.eventList.FILE_NOT_SELECTED);
    }
}

global.FILE_BROWSER = new FileBrowser();
