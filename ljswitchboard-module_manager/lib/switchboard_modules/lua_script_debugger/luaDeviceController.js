'use strict';

/**
 * An accessory file for the Lua script debugger module that defines the
 * luaDeviceController object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/
const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');
const modbus_map = require('ljswitchboard-modbus_map');

class luaDeviceController {

    constructor() {
        this.device = null;
        this.codeEditor = null;
        this.codeEditorSession = null;
        this.codeEditorDoc = null;
        this.debuggingLog = null;
        this.debuggingLogSession = null;
        this.scriptConstants = {};
        this.curScriptFilePath = "";
        this.curScriptType = "";
        this.curScriptOptions = null;

        this.dataToAppendToSource = "";
        this.sourceSizeOffset = 0;
        this.finalPacketSubtraction = 0;

        this.DEBUG_START_EXECUTIONS = false;
        this.DEBUG_HIGH_FREQ_START_EXECUTIONS = false;
        this.DEBUG_SCRIPT_LOADING_EXECUTIONS = false;
        this.luaRunStatusListeners = [];
        this.cachedRunPauseButtonEle = undefined;
    }

    catchError(err) {
        if (typeof(err) !== 'undefined') {
            if (typeof(err.stack) !== 'undefined') {
                console.log('luaControllerErr:',err, err.stack);
            } else {
                console.log('luaControllerErr:',err);
            }
        }
        return Promise.reject();
    }

    printInfo() {
        console.log('Device Name', this.device.cachedName);
        console.log('Num Lines', this.codeEditorDoc.getLength());
        console.log('Num Bytes', this.codeEditorDoc.getValue().length);
    }

    printHighFreq(data) {
        if (this.DEBUG_HIGH_FREQ_START_EXECUTIONS) {
            this.print(data);
        }
    }

    print(data) {
        if (this.DEBUG_START_EXECUTIONS) {
            console.log.apply(console, arguments);
        }
    }

    printLoadedScriptInfo(data) {
        if (this.DEBUG_SCRIPT_LOADING_EXECUTIONS) {
            if (data) {
                console.log('Current Script Info', data, this.curScriptOptions, this.curScriptType);
            } else {
                console.log('Current Script Info', this.curScriptOptions, this.curScriptType);
            }
        }
    }

    isLuaCodeError() {
        return this.codeEditor.errorsExist();
    }

    getErrorLine() {
        let lineNum = '';
        const errors = $('#lua-code-editor .ace_error');
        if (errors.length > 0) {
            lineNum = errors.text();
        }
        return lineNum;
    }

    updateLuaRunStatus(status) {
        this.print('LUA_RUN update:', status);
        const numListeners = this.luaRunStatusListeners.length;
        let numTempListeners;
        const tempListeners = [];
        const curTime = new Date();
        for (let i = 0; i < numListeners; i++) {
            const tempListener = this.luaRunStatusListeners.pop();
            let executeListener = false;
            let executeListenerTimedOut = false;

            if (tempListener.val === status) {
                executeListener = true;
            }

            if (!executeListener) {
                if (curTime - tempListener.startTime > tempListener.maxTime) {
                    executeListener = true;
                    executeListenerTimedOut = true;
                }
            }

            if (executeListener) {
                try {
                    if (executeListenerTimedOut) {
                        console.warn('LUA_RUN timed-out');
                        tempListener.promise.reject();
                    } else {
                        console.log('LUA_RUN has become', tempListener.val);
                        tempListener.promise.resolve();
                    }
                } catch(err) {
                    console.error('Error calling LUA_RUN listener promise');
                }
            } else {
                tempListeners.push(tempListener);
            }
        }

        numTempListeners = tempListeners.length;
        for (let i = 0; i < numTempListeners; i++) {
            this.luaRunStatusListeners.push(tempListeners.pop());
        }

        if (this.luaRunStatusListeners.length === 0) {
            if (!this.cachedRunPauseButtonEle) {
                this.cachedRunPauseButtonEle = $('#run-lua-script-button');
            }
            const runPauseButton = this.cachedRunPauseButtonEle;

            const isDisabled = runPauseButton.prop('disabled');
            if (!isDisabled) {
                runPauseButton.prop('disabled', false);
            }
        }
    }

    addLuaRunStatusListener(val, promise) {
        this.luaRunStatusListeners.push({
            'val': val,
            'promise': promise,
            'startTime': new Date(),
            'maxTime': 500,
        });
    }

    getWaitForLuaRunStateChange(val) {
        return new Promise((resolve, reject) => {
            console.log('Waiting for LUA_RUN to become', val);
            this.addLuaRunStatusListener(val, {resolve, reject});
        });
    }

    async stopLuaScript() {
        this.print('disabling LUA_RUN');
        await this.device.qWrite('LUA_RUN', 0);
        // Wait for the LUA_RUN register to be read-back as the appropriate val.
        return this.getWaitForLuaRunStateChange(0);
    }

    async enableLuaScript() {
        this.print('enabling LUA_RUN');
        await this.device.qWrite('LUA_RUN', 1);
        // Wait for the LUA_RUN register to be read-back as the appropriate val.
        return this.getWaitForLuaRunStateChange(1);
    }

    writeLuaSourceSize() {
        this.print('setting LUA_SOURCE_SIZE');
        const sourceSize = this.codeEditorDoc.getValue().length + 3; // Add space for 3 null characters.
        return this.device.qWrite('LUA_SOURCE_SIZE', sourceSize);
    }
    
    writeLuaScript() {
        this.print('writing to LUA_SOURCE_WRITE');
        return new Promise(resolve => {
            const luaDataArray = [];
            try {
                const luaSource = this.codeEditorDoc.getValue();
                const luaSourceBuf = JSON.parse(JSON.stringify(luaSource));
                for (let i = 0; i < luaSourceBuf.length; i++) {
                    luaDataArray.push(luaSourceBuf.charCodeAt(i));
                }

                // Add 3 null characters
                luaDataArray.push(0);
                luaDataArray.push(0);
                luaDataArray.push(0);
            } catch(err) {
                console.error('Not writing source, in luaDeviceController.writeLuaScript', err);
                resolve();
                return;
            }

            // Perform Device IO
            console.log('Writing Data', luaDataArray.length);
            this.device
                .writeArray('LUA_SOURCE_WRITE',luaDataArray)
                .then(
                    (data) => {
                        resolve(data);
                    },
                    (err) => {
                        console.error('Error on SRC write',err);
                        try {
                            console.error('Error Info', modbus_map.getErrorInfo(err));
                        } catch(newErr) {
                            //
                        }
                        resolve();
                    }
                );
        });
    }

    getAndAddDebugData(numBytes) {
        this.printHighFreq('reading & saving to LUA_DEBUG_DATA');
        return new Promise(resolve => {
            /*
            Future Chris: If you are looking for where the even/odd fix happened
            It was in the "controller.js" file. Function: "numDebugBytes".  It is
            the function that calls this function and makes sure only even amounts
            of data are read at any given time unless there is only 1 remaining
            byte.
            */
            this.device.readArray('LUA_DEBUG_DATA', numBytes)
                .then(
                    // Handle successful reads
                    (data) => {
                        // Define variable to save debug-data to
                        let textData = '';

                        // Loop through read data & convert to ASCII text
                        data.forEach((newChar) => {
                            if (newChar !== 0) {
                                textData += String.fromCharCode(newChar);
                            } else {

                            }
                        });

                        this.debuggingLog.appendText(textData);

                        resolve();
                    },
                    // Handle read errors
                    (err) => {
                        // Report that an error has occurred
                        console.log('Error on LUA_DEBUG_DATA', err);
                        try {
                            console.log('Err Info', modbus_map.getErrorInfo(err));
                        } catch (newError) {
                            console.log('Error getting error info');
                        }
                        // console.log('Check .json for "type" of BYTE');

                        resolve();
                    }
                );
        });
    }

    enableLuaDebugging() {
        this.print('enabling LUA_DEBUG_ENABLE');
        return this.device.qWrite('LUA_DEBUG_ENABLE',1);
    }

    enableLuaDebuggingDefault() {
        this.print('enabling LUA_DEBUG_ENABLE_DEFAULT');
        return this.device.qWrite('LUA_DEBUG_ENABLE_DEFAULT',1);
    }
    
    handleNoScriptError(err) {
        console.log('Handling error',err);
        return this.saveScriptToFlash();
    }

    enableLuaRunDefault() {
        this.print('enabling LUA_RUN_DEFAULT');

        return new Promise(resolve => {
            // Perform Device IO
            this.device.qWrite('LUA_RUN_DEFAULT',1)
                .then(() => resolve(), this.handleNoScriptError);
        });
    }

    disableLuaRunDefault() {
        this.print('disabling LUA_RUN_DEFAULT');

        // Perform Device IO
        return this.device.qWrite('LUA_RUN_DEFAULT',0);
    }

    rebootDevice() {
        this.print('rebooting device LUA_RUN_DEFAULT');

        // Perform Device IO
        return this.device.qWrite('SYSTEM_REBOOT',0x4C4A0002);
    }

    saveEnableLuaSaveToFlash() {
        this.print('saving LUA_SAVE_TO_FLASH');

        // Perform Device IO
        return this.device.qWrite('LUA_SAVE_TO_FLASH',1);
    }

    checkForCodeErrors() {
        return new Promise((resolve, reject) => {
            if (this.isLuaCodeError()) {
                let msg = 'Syntax errors detected:\n';
                this.codeEditor.getLinterErrors().forEach((err) => {
                    msg += err + '\n';
                });
                // const msg = 'Syntax error detected, line: '+this.getErrorLine();

                global.showAlert('Syntax error detected, not running script.');
                // showAlert('Check Script for Errors, line: '+this.getErrorLine());

                this.debuggingLog.setValue(msg);
                this.debuggingLog.scrollToEnd();

                reject();
            } else {
                const compat = this.codeEditor.checkScriptFWCompatibility(this.device);
                if (compat.isError) {
                    global.showAlert('FW Compatibility error detected, not running script.');
                    this.debuggingLog.setValue(compat.message);
                    this.debuggingLog.scrollToEnd();

                    reject();
                } else {
                    resolve();
                }
            }
        });
    }

    async saveScriptToFlash() {
        this.print('loading & saving lua script to flash');

        try {
            await this.onRunSaveScript();

            // Check LUA Script for Errors
            await this.checkForCodeErrors();

            // Disable the LUA script
            await this.stopLuaScript();

            // Set the LUA Source Size
            await this.writeLuaSourceSize();

            // Write the LUA script
            await this.writeLuaScript();

            // Configure LUA_SAVE_TO_FLASH register
            return await this.saveEnableLuaSaveToFlash();
        } catch (err) {
            await this.catchError(err);
        }
    }

    async enableStartupLuaScript() {
        this.print('enabling startup script');

        try {
            // Disable the LUA script
            await this.stopLuaScript();

            // Configure LUA_RUN_DEFAULT register
            await this.enableLuaRunDefault();

            // Configure LUA_DEBUG_ENABLE_DEFAULT register
            return await this.enableLuaDebuggingDefault();
        } catch (err) {
            await this.catchError(err);
        }
    }

    disableStartupLuaScript() {
        this.print('disabling startup script');

        // Disable the LUA script
        return this.stopLuaScript()

        // Configure LUA_RUN_DEFAULT register
        .then(this.disableLuaRunDefault, this.catchError);
    }

    moveDebuggingCursorToEnd() {
        this.debuggingLog.scrollToEnd();
        return Promise.resolve();
    }

    async copyDebuggingConsoleText() {
        const txt = this.debuggingLog.getValue();

        global.CLIPBOARD_MANAGER.set(txt);
        global.showInfoMessage('Console text copied to clipboard');
    }

    clearDebuggingConsoleText() {
        this.debuggingLog.clear();
        return Promise.resolve();
    }

    async loadAndStartScript() {
        this.print('loading & starting Lua script');

        try {
            // perform onRun save script operation
            await this.onRunSaveScript();

            // Check LUA Script for Errors
            await this.checkForCodeErrors();

            // Disable the LUA script
            await this.stopLuaScript();

            // Set the LUA Source Size
            await this.writeLuaSourceSize();

            // Write the LUA script
            await this.writeLuaScript();

            // Enable Debugging
            await this.enableLuaDebugging();

            // Enable Debugging Default
            await this.enableLuaDebuggingDefault();

            // Move debuggingLog cursor to the end of the file
            await this.moveDebuggingCursorToEnd();

            // Enable LUA script
            await this.enableLuaScript();
        } catch (err) {
            await this.catchError(err);
        }
    }

    async loadLuaScript() {
        this.print('loading Lua script');

        try {
            // Check LUA Script for Errors
            await this.checkForCodeErrors();

            // Disable the LUA script
            await this.stopLuaScript();

            // Set the LUA Source Size
            await this.writeLuaSourceSize();

            // Write the LUA script
            await this.writeLuaScript();

            // Enable Debugging
            await this.enableLuaDebugging();

            // Enable Debugging Default
            await this.enableLuaDebuggingDefault();
        } catch (err) {
            await this.catchError(err);
        }
    }

    stopScript() {
        this.print('stopping Lua script');

        // Disable the LUA script
        return this.stopLuaScript();
    }

    createNewScript() {
        this.print('creating new Lua Script');
        // Update Internal Constants
        this.configureAsNewScript();

        // clear the codeEditor
        this.codeEditorDoc.setValue("");

        this.printLoadedScriptInfo('in createNewScript');

        return Promise.resolve();
    }

    loadScriptFromFile(filePath) {
        this.print('loading Lua Script from file');
        return new Promise((resolve, reject) => {

            // Update Internal Constants
            this.configureAsUserScript(filePath);

            // Load File
            fs_facade.loadFile(
                filePath,
                (err) => {
                    this.print('Error loading script', err);
                    this.codeEditorDoc.setValue('-- Failed to load script file: ' + filePath);
                    reject();
                },
                (data) => {
                    this.print('Successfully loaded script');
                    this.codeEditorDoc.setValue(data);
                    resolve();
                }
            );
        });
    }

    loadExampleScript(filePath) {
        this.print('loading example script', filePath);
        return new Promise((resolve, reject) => {

            // Update Internal Constants
            this.configureAsExample(filePath);

            // Load Script File
            fs_facade.readModuleFile(
                filePath,
                (err) => {
                    const scriptLoadErMessage = "Error loading example script: " + filePath + ". Error Message: " + err.toString();

                    console.log(scriptLoadErMessage, err);
                    this.codeEditorDoc.setValue(scriptLoadErMessage);
                    reject();
                },
                (data) => {
                    this.print('Successfully loaded script');
                    this.codeEditorDoc.setValue(data);
                    resolve();
                }
            );

        });
    }

    saveLoadedScriptAs() {
        this.print('Saving Lua Script as...');

        // Perform a saveAs operation
        return this.saveLoadedScriptHandler('saveAs');
    }
    saveLoadedScript() {
        this.print('Saving Lua Script');
        // Perform a save operation

        return this.saveLoadedScriptHandler('save');
    }

    onRunSaveScript() {
        return this.saveLoadedScriptHandler('onRun');
    }

    async saveLoadedScriptHandler(saveType) {
        let saveFileCommand = 'notSaving';

        const canSave = this.curScriptOptions.canSave;
        const saveOnRun = this.curScriptOptions.saveOnRun;
        const filePath = this.curScriptFilePath;
        const scriptData = this.codeEditorDoc.getValue();
        this.printLoadedScriptInfo('in saveLoadedScriptHandler');
        if (saveType === 'onRun') {
            if (saveOnRun) {
                if (canSave) {
                    saveFileCommand = 'save';
                } else {
                    saveFileCommand = 'saveAs';
                }
            }
        } else if (saveType === 'save') {
            if (canSave) {
                saveFileCommand = 'save';
            } else {
                saveFileCommand = 'saveAs';
            }
        } else if (saveType === 'saveAs') {
            saveFileCommand = 'saveAs';
        }
        console.log('Save Command...', saveFileCommand, saveType);
        // Determine if the script can be saved
        // aka: switch between user script & example

        if (saveFileCommand === 'save') {
            // Perform save operation
            this.print('Saving Script to file - save');
            return new Promise((resolve, reject) => {
                fs_facade.saveDataToFile(
                    filePath,
                    scriptData,
                    (err) => {
                        console.error('Failed to Save Script to file', err);
                        reject(err);
                    },
                    () => {
                        this.print('Successfuly Saved Script to File');
                        resolve();
                    }
                );
            });
        } else if (saveFileCommand === 'saveAs') {
            // Perform saveAs command
            this.print('Performing saveAs method, opening file dialog');

            const fileLoc = await global.FILE_BROWSER.saveFile({
                'filters': 'lua',
                'suggestedName': 'luaScript.lua',
            });

            if (fileLoc) {
                const scriptData = this.codeEditorDoc.getValue();

                this.print('Saving Script to file - saveAs', '"' + fileLoc + '"');

                return new Promise((resolve, reject) => {
                    fs_facade.saveDataToFile(
                        fileLoc,
                        scriptData,
                        (err) => {
                            console.error('Failed to Save Script to file', err);
                            reject(err);
                        },
                        () => {
                            this.print('Successfuly Saved Script to File');

                            // Update Internal Constants
                            this.configureAsUserScript(fileLoc);

                            resolve();
                        }
                    );
                });
            } else {
                console.log('No File Selected');
            }

        } else {
            // Don't perform any save operations
            this.print('Not performing any save operations');
        }
    }

    configureAsExample(filePath) {
        this.curScriptType = this.scriptConstants.types[0];
        this.curScriptOptions = this.scriptConstants[this.curScriptType];
        this.curScriptFilePath = filePath;
    }

    configureAsUserScript(filePath) {
        this.curScriptType = this.scriptConstants.types[1];
        this.curScriptOptions = this.scriptConstants[this.curScriptType];
        this.curScriptFilePath = filePath;
    }

    configureAsNewScript() {
        this.curScriptType = this.scriptConstants.types[2];
        this.curScriptOptions = this.scriptConstants[this.curScriptType];
        this.curScriptFilePath = '';
    }

    setDevice(device) {
        this.device = device;
    }

    setCodeEditor(codeEditor) {
        // Save the editor and various attributes
        this.codeEditor = codeEditor;
        this.codeEditorSession = codeEditor.editor.session;
        this.codeEditorDoc = codeEditor;

        // Configure the editor
        this.codeEditorSession.setTabSize(2);
        this.codeEditorSession.setUseSoftTabs(true);
        this.codeEditorSession.setUseWrapMode(true);
    }

    setDebuggingLog(debuggingLog) {
        this.debuggingLog = debuggingLog;
        this.debuggingLogSession = debuggingLog.editor.session;
        this.debuggingLog.editor.setReadOnly(true);

        this.debuggingLogSession.setTabSize(2);
        this.debuggingLogSession.setUseSoftTabs(false);
        this.debuggingLogSession.setUseWrapMode(true);
    }

    setScriptConstants(constants) {
        this.scriptConstants = constants;
    }

    setScriptType(type, options, filePath) {
        this.curScriptType = type;
        this.curScriptOptions = options;
        this.curScriptFilePath = filePath;
    }
}

global.luaDeviceController = luaDeviceController;
