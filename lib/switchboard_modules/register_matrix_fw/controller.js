/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* global dataTableCreator */
/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.currentValues = dict();
    this.bufferedValues = dict();
    this.newBufferedValues = dict();
    this.bufferedOutputValues = dict();

    // Templates:
    this.templates = {};
    this.generateGroupRowText = undefined;
    this.compiledChildTable = undefined;

    this.debugSearching = false;
    this.initializeTableWatchRegisterCacheVal = function(registerName, state) {
        self.tableWatchRegisterCache[registerName] = {
            'isActive': state,
            'readRegister': true,
        };

        var info = modbus_map.getAddressInfo(registerName);
        if(info.data) {
            if(info.data.readwrite) {
                var direction = info.data.readwrite;
                if(direction === 'W') {
                    self.tableWatchRegisterCache[registerName].readRegister = false;
                }
            }
        }
    };
    this.updateTableWatchRegisterCacheVal = function(registerName, direction) {
        if(direction === 'write') {
            self.tableWatchRegisterCache[registerName].readRegister = false;
        } else {
            self.tableWatchRegisterCache[registerName].readRegister = true;
        }
    };
    this.getRegistersToRead = function() {
        var registers = [];
        var keys = Object.keys(self.tableWatchRegisterCache);
        keys.forEach(function(key) {
            if(self.tableWatchRegisterCache[key].isActive) {
                if(self.tableWatchRegisterCache[key].readRegister) {
                    registers.push(key);
                }
            }
        });
        return registers;
    };
    this.getNumberOfActiveRegisters = function() {
        var num = 0;
        var keys = Object.keys(self.tableWatchRegisterCache);
        keys.forEach(function(key) {
            if(self.isTableWatchRegisterActive(key)) {
                num += 1;
            }
        });
        return num;
    };
    this.isTableWatchRegisterActive = function(registerName) {
        if(typeof(self.tableWatchRegisterCache[registerName]) === 'undefined') {
            return false;
        } else {
            return self.tableWatchRegisterCache[registerName].isActive;
        }
    };
    this.tableWatchRegisterCache = {};
    this.getRegisterWatchStatus = function(registerName) {
        return self.isTableWatchRegisterActive(registerName);
    };
    this.saveRegisterWatchStatus = function(registerName, newState) {
        self.initializeTableWatchRegisterCacheVal(registerName, newState);

        if(newState) {
            self.addRegisterToActiveRegistersTable(registerName);
        } else {
            self.removeActiveRegisterByName(registerName);
        }
        // console.log('Saving register watch status', registerName, newState);
        
        return self.isTableWatchRegisterActive(registerName);
    };
    this.tableManager = new dataTableCreator();

    this.tableManager.saveControls({
        'getRegisterWatchStatus': this.getRegisterWatchStatus,
        'saveRegisterWatchStatus': this.saveRegisterWatchStatus,
    });

    this.saveActiveRegisters = function() {
        var defered = q.defer();
        var registerList = [];
        var keys = Object.keys(self.tableWatchRegisterCache);
        keys.forEach(function(key) {
            if(self.isTableWatchRegisterActive(key)) {
                registerList.push(key);
            }
        });
        var sn = self.activeDevice.savedAttributes.serialNumber;

        var displayMethod = self.startupData.display_method;
        if(typeof(self.startupData.registers_by_sn) === 'undefined') {
            self.startupData.registers_by_sn = {};
            showAlert('startupData is corrupted');
            console.error('Corrupted Data', self.startupData);
        }
        
        if(displayMethod === 'registers_by_sn') {
            self.startupData.registers_by_sn[sn] = registerList;
            self.saveModuleStartupData()
            .then(function() {
                console.info('Finished saveActiveRegisters');
                defered.resolve();
            }, function() {
                console.warn('Failed to saveActiveRegisters');
                defered.resolve();
            });
        } else {
            showAlert('Unable to save currently watched registers: ' + displayMethod);
            defered.resolve();
        }

        return defered.promise;
    };
    /**
     * This function is called to save the data in the "this.startupData" object
     * as the module's startupData.
    **/
    this.readModuleStartupData = function() {
        return module_manager.getModuleStartupData(self.moduleName);
    };
    this.saveModuleStartupData = function() {
        return module_manager.saveModuleStartupData(
            self.moduleName,
            self.startupData
        );
    };
    this.resetModuleStartupData = function() {
        return module_manager.revertModuleStartupData(self.moduleName);
    };

    this.refreshModuleStartupData = function() {
        var defered = q.defer();
        // Delete the cached file reference
        module_manager.clearCachedModuleStartupData(self.moduleName);

        // Read the file.
        module_manager.getModuleStartupData(self.moduleName)
        .then(function(newStartupData) {
            self.startupData = newStartupData;
            defered.resolve();
        });
        return defered.promise;
    };

    var requiredStartupDataAttributes = [
        'display_method',
        'display_methods',
        'registers_by_sn',
        'registers_by_product_type',
        'registers_by_product_class',
    ];

    var compileTemplates = function(framework) {
        var templatesToCompile = [
            'group_row',
            'child_table',
            'register_details',
            'active_register_details',
            'active_registers',
            'default_register',
        ];
        templatesToCompile.forEach(function(templateName) {
            try {
                self.templates[templateName] = handlebars.compile(
                    framework.moduleData.htmlFiles[templateName]
                );
            } catch(err) {
                console.error('Error compiling templates', err);
            }
        });
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

        // Compile required template files
        compileTemplates(framework);

        // Update the tableManager's templates
        self.tableManager.updateTemplates(self.templates);

        var isStartupDataValid = true;
        requiredStartupDataAttributes.forEach(function(requiredAttr) {
            if(typeof(self.startupData[requiredAttr]) === 'undefined') {
                isStartupDataValid = false;
            }
        });

        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        // self.moduleConstants = framework.moduleConstants;
        // Save the smartBindings to the framework instance.
        // framework.putSmartBindings(smartBindings);
        // Save the customSmartBindings to the framework instance.
        // framework.putSmartBindings(customSmartBindings);

        if(isStartupDataValid) {
            onSuccess();
        } else {
            console.warn('Reverting module startup data');
            self.resetModuleStartupData()
            .then(onSuccess);
        }
    };

    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        self.activeDevice = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        // Update the tableManager's activeDevice reference
        self.tableManager.updateActiveDevice(self.activeDevice);

        // Re-load the module's startupData
        self.refreshModuleStartupData()
        .then(self.tableManager.updateData)
        .then(onSuccess);
    };

    this.getRegistersToDisplay = function() {
        var defered = q.defer();
        var registers = [];
        var saveStartupData = false;
        var display_method = self.startupData.display_method;
        var display_methods = self.startupData.display_methods;
        try {
            if(typeof(display_methods[display_method]) === 'undefined') {
                showAlert('Un-supported display_method detected.  Changing to registers_by_sn.');
                console.log('in getRegistersToDisplay A', display_method, display_methods);
                saveStartupData = true;
                display_method = 'registers_by_sn';
                self.startupData.display_method = 'registers_by_sn';
            }
        } catch(err) {
            saveStartupData = true;
            display_method = 'registers_by_sn';
            self.startupData.display_method = 'registers_by_sn';
            display_methods = {"registers_by_sn": {"key": "serialNumber"}};
            console.error('Error in getRegistersToDisplay', err);
        }

        var attributeKey = display_methods[display_method].key;
        var displayData = self.startupData[display_method];

        var deviceAttribute = self.activeDevice.savedAttributes[attributeKey];
        if(typeof(deviceAttribute) === 'undefined') {
            showAlert('Un-supported deviceAttribute: ' + attributeKey + 'Changing to serialNumber.');
            console.log('in getRegistersToDisplay B', attributeKey, self.activeDevice.savedAttributes);

            saveStartupData = true;
            display_method = 'registers_by_sn';
            self.startupData.display_method = 'registers_by_sn';
            attributeKey = 'serialNumber';
            displayData = self.startupData.registers_by_sn;
            deviceAttribute = self.activeDevice.savedAttributes.serialNumber;
        }

        if(displayData[deviceAttribute]) {
            displayData[deviceAttribute].forEach(function(reg) {
                registers.push(reg);
            });
        } else {
            displayData[deviceAttribute] = [];
            saveStartupData = true;
        }

        if(saveStartupData) {
            self.saveModuleStartupData()
            .then(function() {
                defered.resolve(registers);
            }, function() {
                showAlert("Failed to update the register matrix's startup data");
                defered.resolve(registers);
            });
        } else {
            defered.resolve(registers);
        }
        return defered.promise;
    };
    this.initializeSelectedRegisters = function(registers) {
        var defered = q.defer();
        self.tableWatchRegisterCache = {};

        registers.forEach(function(register) {
            self.initializeTableWatchRegisterCacheVal(register, true);
        });
        defered.resolve(registers);
        return defered.promise;
    };
    this.getRegistersModbusInfo = function(registers) {
        var defered = q.defer();
        var expandedRegisters = [];
        var invalidRegisters = [];
        var addedRegisters = [];

        registers.forEach(function(register) {
            // make sure that a new object is created.
            var info = JSON.parse(JSON.stringify(
                modbus_map.getAddressInfo(register)
            ));
            if(info.type < 0) {
                invalidRegisters.push(register);
            } else {
                if(addedRegisters.indexOf(register) < 0) {
                    addedRegisters.push(register);
                    expandedRegisters.push(info.data);
                }
            }
        });
        if(invalidRegisters.length > 0) {
            var list = JSON.stringify(invalidRegisters);
            showAlert('Invalid registers detected: ' + list);
            console.log('Invalid registers detected:', invalidRegisters);
        }
        defered.resolve(expandedRegisters);
        return defered.promise;
    };
    this.cachedRegistersToDisplay = function(registers) {
        var defered = q.defer();
        var registerList = [];
        registers.forEach(function(register) {
            registerList.push(register.name);
        });

        self.displayedRegisters = registerList;
        defered.resolve(registers);
        return defered.promise;
    };
    this.getInitialDeviceData = function(registers) {
        var defered = q.defer();

        self.activeDevice.sReadMultiple(self.displayedRegisters)
        .then(function(results) {
            results.forEach(function(result, i) {
                registers[i].result = result.data;
            });
            defered.resolve(registers);
        });
        return defered.promise;
    };

    this.getActiveRegisterData = function(register) {
        var data = '';
        var type = register.type;
        
        var context = {};
        var keys = Object.keys(register);
        keys.forEach(function(key) {
            context[key] = register[key];
        });
        context.register_details = self.templates.active_register_details(register);

        var enableEdit = true;
        var isWriteOnly = false;
        var isReadOnly = false;
        var disableControls = '';
        var registerMode = 'read-mode';
        if(context.readwrite) {
            if(context.readwrite === 'R') {
                isReadOnly = true;
                disableControls = 'direction-control-disabled';
                enableEdit = false;
            }
            if(context.readwrite === 'W') {
                isWriteOnly = true;
                disableControls = 'direction-control-disabled';
                enableEdit = false;
                registerMode = 'write-mode';
            }
            // if(!(isReadOnly || isWriteOnly)) {
            //     enableEdit = true;
            //     editClass = 'editable-register';
            // }
            // if(context.readwrite.indexOf('W') >= 0) {
            //     enableEdit = true;
            //     editClass = 'editable-register';
            // }
        }
        context.enableEdit = enableEdit;
        context.disableControls = disableControls;
        context.registerMode = registerMode;
        if(type === 'TEST_FLOAT32') {
            data = self.templates.default_register(context);
        } else {
            data = self.templates.default_register(context);
        }
        return data;
    };
    this.getActiveRegistersData = function(registers) {
        var data = '';
        var compiledRegistersData = registers.map(self.getActiveRegisterData);

        data = self.templates.active_registers({
            'registers':compiledRegistersData
        });
        return data;
    };



    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {

        self.getRegistersToDisplay()
        .then(self.initializeSelectedRegisters)
        .then(self.getRegistersModbusInfo)
        .then(self.cachedRegistersToDisplay)
        .then(self.getInitialDeviceData)
        .then(function(registers) {
            self.moduleContext = {
                'activeRegisters': self.getActiveRegistersData(registers)
            };
            framework.setCustomContext(self.moduleContext);
            onSuccess();
        });
        // framework.setCustomContext(self.moduleContext);
    };

    this.arrayValueStatistics = function(data) {
        var occurances = dict();
        var i;
        for(i = 0; i < data.length; i++) {
            if(occurances.has(data[i])) {
                occurances.set(data[i], occurances.get(data[i]) + 1);
            } else {
                occurances.set(data[i], 1);
            }
        }
        return occurances;
    };
    this.testStats = function() {
        var allColumnData = self.table.column(
            self.dataTableData.headers.group,
            {search:'applied'}
        ).data();
        var stats = self.arrayValueStatistics(allColumnData);
        stats.forEach(function(data,key) {
            console.log(key,data);
        });
    };
    this.testStr = function(str) {
        self.table.search(str,true,true).draw();
    };
    this.testStrB = function(str) {
        self.table.column(0).search(str,true,true).draw();
    };
    /** Function count the occurrences of substring in a string;
     * @param {String} string   Required. The string;
     * @param {String} subString    Required. The string to search for;
     * @param {Boolean} allowOverlapping    Optional. Default: false;
     */
    this.ocurrences = function(string, subString, allowOverlapping){

        string+=""; subString+="";
        if(subString.length<=0) return string.length+1;

        var n=0, pos=0;
        var step=(allowOverlapping)?(1):(subString.length);

        while(true){
            pos=string.indexOf(subString,pos);
            if(pos>=0){ n++; pos+=step; } else break;
        }
        return(n);
    };
    

    this.showActiveRegisterDetails = function() {
        var td = $(this);
        var tr = td.closest('tr');
        var registerDetails = tr.next();
        td.toggleClass('visible-details');
        registerDetails.toggle();
    };
    this.removeActiveRegister = function() {
        var td = $(this);
        var registerName = td.next().text();
        var tr = td.closest('tr');
        var registerDetails = tr.next();
        tr.remove();
        registerDetails.remove();
        self.saveRegisterWatchStatus(registerName, false);
        self.table.draw();
        self.updateActiveRegistersTableVisibility();
    };
    this.removeActiveRegisterByName = function(registerName) {
        var controlsID = '#register_' + registerName + '_controls';
        var detailsID = '#register_' + registerName + '_details';
        var controlEle = $(controlsID);
        var detailsEle = $(detailsID);
        controlEle.remove();
        detailsEle.remove();
        self.updateActiveRegistersTableVisibility();
    };
    this.addRegisterToActiveRegistersTable = function(registerName) {
        var registerDetails = JSON.parse(JSON.stringify(
            modbus_map.getAddressInfo(registerName).data
        ));

        // Compile the default_register.html file
        var dataToDisplay = self.getActiveRegisterData(registerDetails);

        self.pageElements.activeRegistersList.ele.append(dataToDisplay);
        self.updateActiveRegistersTableVisibility();
    };
    this.updateActiveRegistersTableVisibility = function() {
        if(self.getNumberOfActiveRegisters() === 0) {
            self.pageElements.activeRegisters.ele.addClass('no-registers');
        } else {
            self.pageElements.activeRegisters.ele.removeClass('no-registers');
        }
    };
    this.editRegisterButtonListener = function() {
        var buttonEle = $(this);
        var valueDisplay = buttonEle.closest('div');
        var td = valueDisplay.closest('td');
        var registerName = td.prev().text();
        td.removeClass('read-mode');
        td.addClass('write-mode');
        self.updateTableWatchRegisterCacheVal(registerName, 'write');
    };
    this.exitEditModeButtonListener = function() {
        var buttonEle = $(this);
        var td = buttonEle.closest('td');
        var registerName = td.prev().text();
        td.removeClass('write-mode');
        td.addClass('read-mode');
        self.updateTableWatchRegisterCacheVal(registerName, 'read');
    };
    this.writeRegisterValueButtonListener = function() {
        var buttonEle = $(this);
        // buttonEle.hide();
        var writeRing = buttonEle.next();
        var iconEle = buttonEle.find('.icon');
        var td = buttonEle.closest('td');
        var registerName = td.prev().text();
        var value = td.find('.write-reg-value-input').val();
        var registerValue = td.find('.register-value');

        var finishWriteAnimations = function() {
            // setTimeout(function() {
            //     iconEle.css('background-color', '');    
            // },60);
            writeRing.fadeOut();
        };
        var performDeviceWrite = function() {
            self.activeDevice.iWrite(registerName, value)
            .then(function() {
                registerValue.text(value);
                finishWriteAnimations();
            }, function(err) {
                showAlert('Error writing to register: ' + registerName);
                finishWriteAnimations();
            });
        };

        // console.log('Writing Register...', registerName, value);
        // writeRing.fadeIn(performDeviceWrite);
        // iconEle.css('background-color', '#888888');
        writeRing.show();
        performDeviceWrite();
        
    };
    this.inputBoxKeyUpListener = function(event) {
        if(event.keyCode == 13) {
            var inputBox = $(this);
            inputBox.blur();
            var td = inputBox.closest('td');
            var writeButton = td.find('.write-value-editor-button');
            writeButton.trigger('click');
        }
    };
    this.addActiveRegisterControlListeners = function() {
        self.pageElements.activeRegisters.ele.off('click');
        self.pageElements.activeRegisters.ele.on(
            'click',
            'td.details-control',
            self.showActiveRegisterDetails
        );
        self.pageElements.activeRegisters.ele.on(
            'click',
            'td.remove-register',
            self.removeActiveRegister
        );
        self.pageElements.activeRegisters.ele.on(
            'click',
            'span.edit-register-button',
            self.editRegisterButtonListener
        );
        self.pageElements.activeRegisters.ele.on(
            'click',
            'div.close-value-editor-button',
            self.exitEditModeButtonListener
        );
        self.pageElements.activeRegisters.ele.on(
            'click',
            'span.write-value-editor-button',
            self.writeRegisterValueButtonListener
        );
        self.pageElements.activeRegisters.ele.on(
            'keyup',
            'input.write-reg-value-input',
            self.inputBoxKeyUpListener
        );
    };
    
    this.pageElements = {};
    var pageElementsToCache = [{
        'key': 'activeRegistersList',
        'selector': '#active_registers .active-registers-list',
    }, {
        'key': 'activeRegisters',
        'selector': '#active-registers-holder',
    }];
    this.cachePageElements = function() {
        pageElementsToCache.forEach(function(pageElement) {
            var ele = $(pageElement.selector);
            self.pageElements[pageElement.key] = pageElement;
            self.pageElements[pageElement.key].ele = ele;
        });
    };

    this.table = undefined;
    this.clickData = undefined;
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        self.cachePageElements();
        self.addActiveRegisterControlListeners();
        // var groupIndex = 0;
        // var registerNameIndex = 1;
        // var descriptionIndex = 6;
        var tableElementStr = '#modbus_map_table';
        
        self.table = self.tableManager.createDataTable(tableElementStr);
        onSuccess();
    };
    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.updateActiveRegisterValues = function(results) {
        var defered = q.defer();
        var data = {};
        results.forEach(function(result) {
            data[result.name] = result.str;
            var id = '#register_' + result.name + '_controls .register-value';
            var destination = $(id);
            var inputID = '#register_' + result.name + '_controls .write-reg-value-input';
            var inputBox = $(inputID);
            var chosenVal = '';
            var showValInTitle = false;
            if(result.str) {
                chosenVal = result.str;
                showValInTitle = true;
            } else {
                chosenVal = result.val;
            }
            var titleText = chosenVal.toString();
            if(showValInTitle) {
                titleText += ' (' + result.val.toString() + ')';
            }
            destination.text(chosenVal);
            destination.attr('title', titleText);
            inputBox.val(result.val);
        });
        // console.log('Updated Data', data);
        defered.resolve();
        return defered.promise;
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        var readRegisters = self.getRegistersToRead();
        if(readRegisters.length > 0) {
            self.activeDevice.sReadMany(readRegisters)
            .then(self.updateActiveRegisterValues)
            .then(onSuccess);
        } else {
            onSuccess();
        }
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        // self.saveModuleStartupData()
        // .then(onSuccess);
        self.saveActiveRegisters()
        .then(onSuccess);
        // onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.saveActiveRegisters()
        .then(onSuccess);
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(true);
    };

    var self = this;
}
