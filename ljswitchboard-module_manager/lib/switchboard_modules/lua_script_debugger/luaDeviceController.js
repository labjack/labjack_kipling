/**
 * An accessory file for the Lua script debugger module that defines the
 * luaDeviceController object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/


function luaDeviceController() {
    var device;
    var codeEditor;
    var codeEditorSession;
    var codeEditorDoc;
    var debuggingLog;
    var debuggingLogSession;
    var scriptConstants = {};
    var curScriptFilePath = "";
    var curScriptType = "";
    var curScriptOptions;
    var codeEditorHeight = 0;
    var debuggingLogHeight = 0;

    this.dataToAppendToSource = "";
    this.sourceSizeOffset = 0;
    this.finalPacketSubtraction = 0;

    this.DEBUG_START_EXECUTIONS = false;
    this.DEBUG_HIGH_FREQ_START_EXECUTIONS = false;
    this.DEBUG_SCRIPT_LOADING_EXECUTIONS = false;
    var MAX_ARRAY_PACKET_SIZE = 32; //Set packet size to be 32 bytes

    this.catchError = function(err) {
        var errDeferred = q.defer();
        if(typeof(err) !== 'undefined') {
            if(typeof(err.stack) !== 'undefined') {
                console.log('luaControllerErr:',err, err.stack);
            } else {
                console.log('luaControllerErr:',err);
            }
        }
        errDeferred.reject();
        return errDeferred.promise;
    };
    this.printInfo = function() {
        console.log('Device Name',self.device.cachedName);
        console.log('Num Lines',self.codeEditorDoc.getLength());
        console.log('Num Bytes',self.codeEditorDoc.getValue().length);
    };
    this.printHighFreq = function(data) {
        if(self.DEBUG_HIGH_FREQ_START_EXECUTIONS) {
            self.print(data);
        }
    };
    this.print = function(data) {
        if(self.DEBUG_START_EXECUTIONS) {
            console.log.apply(console, arguments);
        }
    };
    this.printLoadedScriptInfo = function(data) {
        if(self.DEBUG_SCRIPT_LOADING_EXECUTIONS) {
            if(data) {
                console.log('Current Script Info', data, self.curScriptOptions, self.curScriptType);
            } else {
                console.log('Current Script Info', self.curScriptOptions, self.curScriptType);
            }
        }
    };
    this.isLuaCodeError = function() {
        return self.codeEditor.errorsExist();
    };
    this.getErrorLine = function() {
        var lineNum = '';
        var errors = $('#lua-code-editor .ace_error');
        if(errors.length > 0) {
            lineNum = errors.text();
        }
        return lineNum;
    };

    this.luaRunStatusListeners = [];
    var cachedRunPauseButtonEle = undefined;
    this.updateLuaRunStatus = function(status) {
        self.print('LUA_RUN update:', status);
        var numListeners = self.luaRunStatusListeners.length;
        var i, numTempListeners;
        var tempListeners = [];
        var curTime = new Date();
        for(i = 0; i < numListeners; i++) {
            var tempListener = self.luaRunStatusListeners.pop();
            var executeListener = false;
            var executeListenerTimedOut = false;

            if(tempListener.val == status) {
                executeListener = true;
            }

            if(!executeListener) {
                if(curTime - tempListener.startTime > tempListener.maxTime) {
                    executeListener = true;
                    executeListenerTimedOut = true;
                }
            }

            if(executeListener) {
                try {
                    if(executeListenerTimedOut) {
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
        for(i = 0; i < numTempListeners; i++) {
            self.luaRunStatusListeners.push(tempListeners.pop());
        }

        if(self.luaRunStatusListeners.length === 0) {
            var runPauseButton;
            if(cachedRunPauseButtonEle) {
                runPauseButton = cachedRunPauseButtonEle;
            } else {
                cachedRunPauseButtonEle = $('#run-lua-script-button');
                runPauseButton = cachedRunPauseButtonEle;
            }

            var isDisabled = runPauseButton.prop('disabled');
            if(!isDisabled) {
                runPauseButton.prop('disabled', false);
            }
        }
    };
    this.addLuaRunStatusListener = function(val, promise) {
        self.luaRunStatusListeners.push({
            'val': val,
            'promise': promise,
            'startTime': new Date(),
            'maxTime': 500,
        });
    };
    this.getWaitForLuaRunStateChange = function(val) {
        var waitForLuaRunStateChange = function() {
            var innerDeferred = q.defer();
            console.log('Waiting for LUA_RUN to become', val);
            self.addLuaRunStatusListener(val, innerDeferred);
            return innerDeferred.promise;
        };
        return waitForLuaRunStateChange;
    };
    this.stopLuaScript = function() {
        self.print('disabling LUA_RUN');
        var innerDeferred = q.defer();
        // Disable the LUA script
        self.device.qWrite('LUA_RUN',0)

        // Wait for the LUA_RUN register to be read-back as the appropriate val.
        .then(self.getWaitForLuaRunStateChange(0))

        // Handle errors & return
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableLuaScript = function() {
        self.print('enabling LUA_RUN');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN',1)

        // Wait for the LUA_RUN register to be read-back as the appropriate val.
        .then(self.getWaitForLuaRunStateChange(1))

        // Handle errors & return
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.writeLuaSourceSize = function() {
        self.print('setting LUA_SOURCE_SIZE');
        var innerDeferred = q.defer();
        var sourceSize = self.codeEditorDoc.getValue().length;

        // Add space for 3 null characters.
        sourceSize += 3;

        // Perform Device IO
        self.LUA_SOURCE_SIZE_written = sourceSize;
        self.device.qWrite('LUA_SOURCE_SIZE',sourceSize)
        .then(innerDeferred.resolve, innerDeferred.reject);

        return innerDeferred.promise;
    };
    
    this.LUA_SOURCE_SIZE_written = null;
    this.lastScriptWrittenData = {};
    
    
    this.writeLuaScript = function() {
        self.print('writing to LUA_SOURCE_WRITE');
        var innerDefered = q.defer();

        var luaSource;
        var luaSourceBuf;
        var luaDataArray = [];
        try {
            luaSource = self.codeEditorDoc.getValue();
            luaSourceBuf = JSON.parse(JSON.stringify(luaSource));
            for(var i = 0; i < luaSourceBuf.length; i++) {
                luaDataArray.push(luaSourceBuf.charCodeAt(i));
            }

            // Add 3 null characters
            luaDataArray.push(0);
            luaDataArray.push(0);
            luaDataArray.push(0);
        } catch(err) {
            console.error('Not writing source, in luaDeviceController.writeLuaScript', err);
            innerDefered.resolve();
            return;
        }

        // Perform Device IO
        console.log('Writing Data', luaDataArray.length);
        self.device.writeArray('LUA_SOURCE_WRITE',luaDataArray)
        .then(
            function(data) {
                innerDefered.resolve();
            },
            function(err) {
                console.error('Error on SRC write',err);
                try {
                    console.error('Error Info', modbus_map.getErrorInfo(err));
                } catch(newErr) {
                    //
                }
                innerDefered.resolve();
            }
        );
        return innerDefered.promise;
    };
    this.oldWriteLuaScript = function() {
        self.print('writing to LUA_SOURCE_WRITE');
        self.lastDataWritten = [];
        var innerDeferred = q.defer();
        var numPackets = 0;
        var luaSource = self.codeEditorDoc.getValue();
        luaSource += self.dataToAppendToSource;
        var luaSourceBuf = luaSource;
        var luaSourceSize = luaSource.length;
        var packetSize = MAX_ARRAY_PACKET_SIZE;

        var packetData = [];
        var i,j;

        // Determine how many packets need to be sent
        numPackets = (luaSourceSize - (luaSourceSize % packetSize));
        numPackets = numPackets / packetSize;

        // Determine if an extra packet of a smaller size should be sent
        if ((luaSourceSize % packetSize) !== 0) {
            numPackets += 1;
        }

        console.log('Num Packets', numPackets);
        // Push data into packetData array
        for (i = 0; i < numPackets; i++) {
            var subPacketSize = 0;
            var srcData = "";
            var binaryData = [];

            // Determine how much data to add to buffer, add at most the max
            // packet size
            if (luaSourceBuf.length >= packetSize) {
                subPacketSize = packetSize;
            } else {
                subPacketSize = luaSourceBuf.length - self.finalPacketSubtraction;
            }

            // Get the data that should be sent
            srcData = luaSourceBuf.slice(0,subPacketSize);
            
            // Parse the string data into bytes
            for (j = 0; j < srcData.length; j++) {
                binaryData.push(srcData.charCodeAt(j));
            }
            

            // Modify the luaSourceBuf to only have what is remaining
            luaSourceBuf = luaSourceBuf.slice(subPacketSize);

            // Add the srcData to the packetData buffer
            packetData.push(binaryData);
        }

        var resultingDataBytesWritten = 0;
        var resultingPacketSizes = [];
        packetData.forEach(function(data) {
            resultingDataBytesWritten += data.length;
            resultingPacketSizes.push(data.length);
        });
        self.lastScriptWrittenData = {
            'numPackets': packetData.length,
            'packetSizes': resultingPacketSizes,
            'sourceSize': luaSourceSize,
            'numBytesWritten': resultingDataBytesWritten,
            'editorSize': self.codeEditorDoc.getValue().length,
            'LUA_SOURCE_SIZE': self.LUA_SOURCE_SIZE_written,
            'data': packetData,
        };
        // Synchronously write each packet of data to the device
        async.eachSeries(
            packetData,
            function(data, callback) {
                // Perform Device IO
                self.device.writeArray('LUA_SOURCE_WRITE',data)
                .then(
                    function(data) {
                        callback();
                    },
                    function(err) {
                        console.log('Error on SRC write',err);
                        console.log('Check .json for "type" of BYTE');
                        callback(err);
                    }
                );
            },
            function(err) {
                self.print('Finished writing to LUA_SOURCE_WRITE');
                innerDeferred.resolve();
            }
        );
        return innerDeferred.promise;
    };
    this.getAndAddDebugData = function(numBytes) {
        self.printHighFreq('reading & saving to LUA_DEBUG_DATA');
        var innerDefered = q.defer();
        /*
        Future Chris: If you are looking for where the even/odd fix happened
        It was in the "controller.js" file. Function: "numDebugBytes".  It is 
        the function that calls this function and makes sure only even amounts
        of data are read at any given time unless there is only 1 remaining
        byte.
        */
        self.device.readArray('LUA_DEBUG_DATA', numBytes)
        .then(
            // Handle successful reads
            function(data) {
                // Define variable to save debug-data to
                var textData = '';

                // Loop through read data & convert to ASCII text
                data.forEach(function(newChar){
                    if(newChar !== 0) {
                        textData += String.fromCharCode(newChar);
                    } else {

                    }
                });

                self.debuggingLog.appendText(textData);

                innerDefered.resolve();
            },
            // Handle read errors
            function(err) {
                // Report that an error has occurred
                console.log('Error on LUA_DEBUG_DATA',err);
                try {
                    console.log('Err Info', modbus_map.getErrorInfo(err));
                } catch(newError) {
                    console.log('Error getting error info');
                }
                // console.log('Check .json for "type" of BYTE');

                innerDefered.resolve();
            }
        );
        return innerDefered.promise;
    };
    this.enableLuaDebugging = function() {
        self.print('enabling LUA_DEBUG_ENABLE');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_DEBUG_ENABLE',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableLuaDebuggingDefault = function() {
        self.print('enabling LUA_DEBUG_ENABLE_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_DEBUG_ENABLE_DEFAULT',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    
    this.handleNoScriptError = function(err) {
        console.log('Handling error',err);
        var innerDeferred = q.defer();
        self.saveScriptToFlash()
        .then(self.enableStartupLuaScript, innerDeferred.reject)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;

    };
    this.enableLuaRunDefault = function() {
        self.print('enabling LUA_RUN_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN_DEFAULT',1)
        .then(function(){
            innerDeferred.resolve();
        }, self.handleNoScriptError)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.disableLuaRunDefault = function() {
        self.print('disabling LUA_RUN_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN_DEFAULT',0)
        .then(function(){
            innerDeferred.resolve();
        }, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.rebootDevice = function() {
        self.print('rebooting device LUA_RUN_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('SYSTEM_REBOOT',0x4C4A0002)
        .then(function(){
            innerDeferred.resolve();
        }, innerDeferred.reject);
        return innerDeferred.promise;
    }
    this.saveEnableLuaSaveToFlash = function() {
        self.print('saving LUA_SAVE_TO_FLASH');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_SAVE_TO_FLASH',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.checkForCodeErrors = function() {
        var codeDeferred = q.defer();
        if(self.isLuaCodeError()) {
            var msg = 'Syntax errors detected:\n';
            self.codeEditor.getLinterErrors().forEach(function(err) {
                msg += err + '\n';
            });
            // var msg = 'Syntax error detected, line: '+self.getErrorLine();

            showAlert('Syntax error detected, not running script.');
            // showAlert('Check Script for Errors, line: '+self.getErrorLine());

            self.debuggingLog.setValue(msg);
            self.debuggingLog.scrollToEnd();
            
            codeDeferred.reject();
        } else {
            var compat = self.codeEditor.checkScriptFWCompatibility(self.device);
            if(compat.isError) {
                showAlert('FW Compatibility error detected, not running script.');
                self.debuggingLog.setValue(msg);
                self.debuggingLog.scrollToEnd();
            
                codeDeferred.reject();
            } else {
                codeDeferred.resolve();
            }
        }
        return codeDeferred.promise;
    };
    this.saveScriptToFlash = function() {
        self.print('loading & saving lua script to flash');
        var innerDeferred = q.defer();

        // perform onRun save script operation
        self.onRunSaveScript()

        // Check LUA Script for Errors
        .then(self.checkForCodeErrors, self.catchError)

        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)

        // Configure LUA_SAVE_TO_FLASH register
        .then(self.saveEnableLuaSaveToFlash, self.catchError)

        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableStartupLuaScript = function() {
        self.print('enabling startup script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Configure LUA_RUN_DEFAULT register
        .then(self.enableLuaRunDefault, self.catchError)

        // Configure LUA_DEBUG_ENABLE_DEFAULT register
        .then(self.enableLuaDebuggingDefault, self.catchError)

        .then(ioDeferred.resolve, ioDeferred.reject);
        return ioDeferred.promise;
    };
    this.disableStartupLuaScript = function() {
        self.print('disabling startup script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Configure LUA_RUN_DEFAULT register
        .then(self.disableLuaRunDefault, self.catchError)

        .then(ioDeferred.resolve, ioDeferred.reject);
        return ioDeferred.promise;
    };
    this.moveDebuggingCursorToEnd = function() {
        var defered = q.defer();
        self.debuggingLog.scrollToEnd();
        defered.resolve();
        return defered.promise;
    };
    this.copyDebuggingConsoleText = function() {
        var defered = q.defer();
        var txt = self.debuggingLog.getValue();

        CLIPBOARD_MANAGER.set(txt);
        showInfoMessage('Console text copied to clipboard');
        defered.resolve();
        return defered.promise;
    };
    this.clearDebuggingConsoleText = function() {
        var defered = q.defer();
        self.debuggingLog.clear();
        defered.resolve();
        return defered.promise;
    };

    this.loadAndStartScript = function() {
        self.print('loading & starting Lua script');
        var ioDeferred = q.defer();

        // perform onRun save script operation
        self.onRunSaveScript()

        // Check LUA Script for Errors
        .then(self.checkForCodeErrors, self.catchError)
        
        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)
        
        // Enable Debugging
        .then(self.enableLuaDebugging, self.catchError)

        // Enable Debugging Default
        .then(self.enableLuaDebuggingDefault, self.catchError)

        // Move debuggingLog cursor to the end of the file
        .then(self.moveDebuggingCursorToEnd, self.catchError)

        // Enable LUA script
        .then(self.enableLuaScript, self.catchError)

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };

    this.loadLuaScript = function() {
        self.print('loading Lua script');
        var ioDeferred = q.defer();

        // Check LUA Script for Errors
        self.checkForCodeErrors()
        
        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)

        // Enable Debugging
        .then(self.enableLuaDebugging, self.catchError)

        // Enable Debugging Default
        .then(self.enableLuaDebuggingDefault, self.catchError)

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };
    this.stopScript = function() {
        self.print('stopping Lua script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };
    this.createNewScript = function() {
        self.print('creating new Lua Script');
        var ioDeferred = q.defer();

        // Update Internal Constants
        self.configureAsNewScript();

        // clear the codeEditor
        self.codeEditorDoc.setValue("");

        self.printLoadedScriptInfo('in createNewScript');

        ioDeferred.resolve();

        // Return q instance
        return ioDeferred.promise;
    };

    this.loadScriptFromFile = function(filePath) {
        self.print('loading Lua Script from file');
        var ioDeferred = q.defer();

        // Update Internal Constants
        self.configureAsUserScript(filePath);

        // Load File
        fs_facade.loadFile(
            filePath,
            function(err) {
                self.print('Error loading script',err);
                self.codeEditorDoc.setValue('-- Failed to load script file: ' + filePath);
                ioDeferred.reject();
            },
            function(data) {
                self.print('Successfully loaded script');
                self.codeEditorDoc.setValue(data);
                ioDeferred.resolve();
            }
        );
        // Return q instance
        return ioDeferred.promise;
    };
    this.loadExampleScript = function(filePath) {
        self.print('loading example script', filePath);
        var ioDeferred = q.defer();

        // Update Internal Constants
        self.configureAsExample(filePath);

        // Load Script File
        fs_facade.readModuleFile(
            filePath,
            function(err) {
                var scriptLoadErMessage = "Error loading example script: ";
                scriptLoadErMessage += filePath + ". Error Message: ";
                scriptLoadErMessage += err.toString();

                console.log(scriptLoadErMessage,err);
                self.codeEditorDoc.setValue(scriptLoadErMessage);
                ioDeferred.reject();
            },
            function(data) {
                self.print('Successfully loaded script');
                self.codeEditorDoc.setValue(data);
                ioDeferred.resolve();
            }
        );

        // Return q instance
        return ioDeferred.promise;
    };

    this.saveLoadedScriptAs = function() {
        self.print('Saving Lua Script as...');
        var fileIODeferred = q.defer();
        
        // Perform a saveAs operation
        self.saveLoadedScriptHandler('saveAs')
        .then(fileIODeferred.resolve, fileIODeferred.reject);

        // Return q instance
        return fileIODeferred.promise;
    };
    this.saveLoadedScript = function() {
        self.print('Saving Lua Script');
        var fileIODeferred = q.defer();
        
        // Perform a save operation
        self.saveLoadedScriptHandler('save')
        .then(fileIODeferred.resolve, fileIODeferred.reject);

        // Return q instance
        return fileIODeferred.promise;
    };
    this.onRunSaveScript = function() {
        var fileIODeferred = q.defer();

        self.saveLoadedScriptHandler('onRun')
        .then(fileIODeferred.resolve, fileIODeferred.reject);

        // Return q instance
        return fileIODeferred.promise;
    };
    this.saveLoadedScriptHandler = function(saveType) {
        var fileIODeferred = q.defer();
        var saveFileCommand = 'notSaving';

        var canSave = self.curScriptOptions.canSave;
        var saveOnRun = self.curScriptOptions.saveOnRun;
        var filePath = self.curScriptFilePath;
        var scriptData = self.codeEditorDoc.getValue();
        self.printLoadedScriptInfo('in saveLoadedScriptHandler');
        if(saveType === 'onRun') {
            if(saveOnRun) {
                if(canSave) {
                    saveFileCommand = 'save';
                } else {
                    saveFileCommand = 'saveAs';
                }
            }
        } else if (saveType === 'save') {
            if(canSave) {
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
            self.print('Saving Script to file - save');
            fs_facade.saveDataToFile(
                filePath,
                scriptData,
                function(err) {
                    // onError function
                    console.log('Failed to Save Script to file', err);
                    fileIODeferred.reject(err);
                },
                function() {
                    // onSuccess function
                    self.print('Successfuly Saved Script to File');
                    fileIODeferred.resolve();
                }
            );
        } else if (saveFileCommand === 'saveAs') {
            // Perform saveAs command
            self.print('Performing saveAs method, opening file dialog');

            var fileSelectedEventStr = FILE_BROWSER.eventList.FILE_SELECTED;
            var fileNotSelectedEventStr = FILE_BROWSER.eventList.FILE_NOT_SELECTED;

            // Remove existing file broser listeners.
            FILE_BROWSER.removeAllListeners(fileSelectedEventStr);
            FILE_BROWSER.removeAllListeners(fileNotSelectedEventStr);

            // Define file-selected function.
            var saveAsFileSelected = function(fileLoc) {
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

            // Define file-not-selected function.
            var saveAsFileNotSelected = function() {
                console.log('No File Selected');
                fileIODeferred.resolve();
                return;
            };

            // Attach to file browser events.
            FILE_BROWSER.once(fileSelectedEventStr, saveAsFileSelected);
            FILE_BROWSER.once(fileNotSelectedEventStr, saveAsFileNotSelected);

            // Trigger the file broser window to open.
            FILE_BROWSER.saveFile({
                'filters':'.lua',
                'suggestedName': 'luaScript.lua',
            });
        } else {
            // Don't perform any save operations
            self.print('Not performing any save operations');
            fileIODeferred.resolve();
        }
        // Return q instance
        return fileIODeferred.promise;
    };
    this.configureAsExample = function(filePath) {
        self.curScriptType = self.scriptConstants.types[0];
        self.curScriptOptions = self.scriptConstants[self.curScriptType];
        self.curScriptFilePath = filePath;
    };
    this.configureAsUserScript = function(filePath) {
        self.curScriptType = self.scriptConstants.types[1];
        self.curScriptOptions = self.scriptConstants[self.curScriptType];
        self.curScriptFilePath = filePath;
    };
    this.configureAsNewScript = function() {
        self.curScriptType = self.scriptConstants.types[2];
        self.curScriptOptions = self.scriptConstants[self.curScriptType];
        self.curScriptFilePath = "";
    };

    this.setDevice = function(device) {
        self.device = device;
    };

    this.setCodeEditor = function(codeEditor) {
        // Save the editor and various attributes
        self.codeEditor = codeEditor;
        self.codeEditorSession = codeEditor.editor.session;
        self.codeEditorDoc = codeEditor;

        // Configure the editor
        self.codeEditorSession.setTabSize(2);
        self.codeEditorSession.setUseSoftTabs(true);
        self.codeEditorSession.setUseWrapMode(true);
    };
    this.setDebuggingLog = function(debuggingLog) {
        self.debuggingLog = debuggingLog;
        self.debuggingLogSession = debuggingLog.editor.session;
        self.debuggingLog.editor.setReadOnly(true);

        self.debuggingLogSession.setTabSize(2);
        self.debuggingLogSession.setUseSoftTabs(false);
        self.debuggingLogSession.setUseWrapMode(true);
    };
    this.setScriptConstants = function(constants) {
        self.scriptConstants = constants;
    };
    this.setScriptType = function(type, options, filePath) {
        self.curScriptType = type;
        self.curScriptOptions = options;
        self.curScriptFilePath = filePath;
    };
    var self = this;
}

