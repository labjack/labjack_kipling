/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

// import cwd from './ljswitchboard-module_manager.js'
const { file } = require('grunt');
var path = require('path');

const localK3FilesPath = global.localK3FilesPath;
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
    function getDBGLogger(bool) {
        return function logger() {
            if(bool) {
                console.log.apply(console, arguments);
            }
        };
    }
    
    // function to enable print debugging for reading device data on module load:
    // debug Initial Device Read (dbgIDR)
    var ENABLE_INITIAL_DEVICE_READ_DEBUG_OUTPUT = false;
    var dbgIDR = getDBGLogger(ENABLE_INITIAL_DEVICE_READ_DEBUG_OUTPUT);

    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.currentValues = new Map();
    this.bufferedValues = new Map();
    this.newBufferedValues = new Map();
    this.bufferedOutputValues = new Map();

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
        const fs = require('fs');
        var registerNum = self.activeDevice.savedAttributes.serialNumber;
        // the const so we have the file path to add the data
        const filePath = path.join(global.localK3FilesPath, "/module_data/register_matrix_fw/data.json");
        const data = JSON.parse(fs.readFileSync(filePath));

        if(newState) {
            // gets the json file so we are able to make chanes to the file
            $.getJSON(filePath, function(){
                // uses the try catch to be able to grab the data from the file and make the needed changed
                // to then inturn rewrite to the file
                try{
                    data.registers_by_sn[registerNum].push(registerName);
                    fs.writeFile(filePath, JSON.stringify(data, null, 2), function(err) {
                        if (err){
                            console.error(err)
                        }
                        else{
                            console.log("Data written to file")
                        }
                    })
                }
                catch(err){
                    console.error(err)
                }
                
            })
            self.addRegisterToActiveRegistersTable(registerName);
        } else {
            // gets the json file so we are able to make chanes to the file
            $.getJSON(filePath, function(){
                try{
                    // goes through the array for the device and with that it will remove the item
                    // that matches the one the user has selected.
                    lengthOfRegisters = data.registers_by_sn[440017663].length;
                    for(var i = 0; i < lengthOfRegisters; ++i){
                        if(data.registers_by_sn[registerNum][i] == registerName){
                            data.registers_by_sn[registerNum].splice(i, 1);
                        }
                    }
                    fs.writeFile(filePath, JSON.stringify(data, null, 2), function(err) {
                        if (err){
                            console.error(err)
                        }
                        else{
                            console.log("Register has been removed from the file.")
                        }
                    })
                }
                catch(err){
                    console.error(err)
                }
                
            })
            self.removeActiveRegisterByName(registerName);
        }
        // console.log('Saving register watch status', registerName, newState);
        
        return self.isTableWatchRegisterActive(registerName);
    };
    this.tableManager = new DataTableCreator();

    this.tableManager.saveControls({
        'getRegisterWatchStatus': this.getRegisterWatchStatus,
        'saveRegisterWatchStatus': this.saveRegisterWatchStatus,
    });

    this.saveActiveRegisters = function() {
        var registerList = [];
        var keys = Object.keys(self.tableWatchRegisterCache);
        keys.forEach(function(key) {
            if(self.isTableWatchRegisterActive(key)) {
                registerList.push(key);
            }
        });
        var sn = self.activeDevice.savedAttributes.serialNumber;

        var displayMethod = self.startupData.display_method;
        // Saves active registers to global scope so they can be 
        // used in simple logger module
        // const filePath = path.join(global.localK3FilesPath, "/module_data/register_matrix_fw/data.json");
        // console.warn("filePath", filePath)
        // Zander TODO - later we can make this use the data.json with the register list
        global.globalActiveRegisters = registerList;
        if(typeof(self.startupData.registers_by_sn) === 'undefined') {
            self.startupData.registers_by_sn = {};
            showAlert('startupData is corrupted');
            console.error('Corrupted Data', self.startupData);
        }

        if(displayMethod === 'registers_by_sn') {
            self.startupData.registers_by_sn[sn] = registerList;
            return Promise.resolve();
        } else {
            showAlert('Unable to save currently watched registers: ' + displayMethod);
            return Promise.resolve();
        }
    };

    

    var compileTemplates = function(framework) {
        var templatesToCompile = [
            'group_row',
            'child_table',
            'register_details',
            'active_register_details',
            'active_registers',
            'default_register',
            'search_input_box',
            'ljm_filter_box',
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


    var requiredStartupDataAttributes = [
        'display_method',
        'display_methods',
        'registers_by_sn',
        'registers_by_product_type',
        'registers_by_product_class',
    ];
    var requiredDisplayMethodsAttributes = [
        'registers_by_sn',
        'registers_by_product_type',
        'registers_by_product_class',
    ];
    var acceptableDisplayMethodKeys = [
        'serialNumber',
        'productType',
        'deviceTypeName',
    ];
    
    /**
     * Function is called several times giving the module a chance to verify its
     * startupData.  Execute onError if it is not valid or onSuccess if it is 
     * valid.
    **/
    this.verifyStartupData = function(framework, startupData, onError, onSuccess) {
        var missingData = [];
        try {
            var isStartupDataValid = true;
            requiredStartupDataAttributes.forEach(function(requiredAttr) {
                if(typeof(startupData[requiredAttr]) === 'undefined') {
                    isStartupDataValid = false;
                    missingData.push(requiredAttr);
                }
            });

            // Check the display_methods attr
            if(isStartupDataValid) {
                requiredDisplayMethodsAttributes.forEach(function(requiredAttr) {
                    if(typeof(startupData.display_methods[requiredAttr]) === 'undefined') {
                        isStartupDataValid = false;
                        missingData.push('display_methods.' + requiredAttr);
                    }
                });
            }

            var display_method;
            var display_methods;
            if(isStartupDataValid) {
                display_method = startupData.display_method;
                display_methods = startupData.display_methods;
                if(typeof(display_methods[display_method]) === 'undefined') {
                    isStartupDataValid = false;
                    missingData.push('Missing a display_method or current method is invalid');
                }
            }

            if(isStartupDataValid) {
                var displayMethodKeys = Object.keys(display_methods);

                displayMethodKeys.forEach(function(key) {
                    var curOption = display_methods[key];
                    if(typeof(curOption.key) === 'undefined') {
                        isStartupDataValid = false;
                        missingData.push('displayMethodData is missing attr. key');
                    } else {
                        if(acceptableDisplayMethodKeys.indexOf(curOption.key) < 0) {
                            isStartupDataValid = false;
                            missingData.push('displayMethodData key is invalid');
                        }
                    }
                });
            }

            if(isStartupDataValid) {
                onSuccess();
            } else {
                console.warn('Found bad data...', missingData);
                onError();
            }
        } catch(err) {
            console.error('Error in verifyStartupData', err);
            onError();
        }
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.startupData;
        self.moduleName = framework.moduleData.name;

        // Compile required template files
        compileTemplates(framework);

        // Update the tableManager's templates
        self.tableManager.updateTemplates(self.templates);

        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        // self.moduleConstants = framework.moduleConstants;
        // Save the smartBindings to the framework instance.
        // framework.putSmartBindings(smartBindings);
        // Save the customSmartBindings to the framework instance.
        // framework.putSmartBindings(customSmartBindings);

        onSuccess();
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

        // Instruct the tableManager to update its data.
        self.tableManager.updateData()
        .then(onSuccess);
    };

    this.getRegistersToDisplay = function() {
        var registers = [];
        var saveStartupData = false;
        var saveReasons = [];
        var display_method = self.startupData.display_method;
        var display_methods = self.startupData.display_methods;
        try {
            if(typeof(display_methods[display_method]) === 'undefined') {
                showAlert('Un-supported display_method detected.  Changing to registers_by_sn.');
                console.log('in getRegistersToDisplay A', display_method, display_methods);
                saveStartupData = true;
                saveReasons.push('try...');
                display_method = 'registers_by_sn';
                self.startupData.display_method = 'registers_by_sn';
            }
        } catch(err) {
            saveStartupData = true;
            saveReasons.push('catch...');
            display_method = 'registers_by_sn';
            self.startupData.display_method = 'registers_by_sn';
            display_methods = {"registers_by_sn": {"key": "serialNumber"}};
            console.error('Error in getRegistersToDisplay', err);
        }

        var attributeKey = display_methods[display_method].key;
        var displayData = self.startupData[display_method];

        var deviceAttribute = self.activeDevice.savedAttributes[attributeKey];
        if(typeof(deviceAttribute) === 'undefined') {
            showAlert('Un-supported deviceAttribute: ' + attributeKey + ' Changing to serialNumber.');
            console.log('in getRegistersToDisplay B', attributeKey, self.activeDevice.savedAttributes);

            saveStartupData = true;
            saveReasons.push('deviceAttribute undefined');
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
            saveReasons.push('deviceAttribute N/A');
        }

        dbgIDR('In getRegistersToDisplay, resolving to:', registers);
        return Promise.resolve(registers);
    };
    this.initializeSelectedRegisters = function(registers) {
        self.tableWatchRegisterCache = {};

        registers.forEach(function(register) {
            // This function initializes the active registers table & its controls/behavior.
            self.initializeTableWatchRegisterCacheVal(register, true);
        });
        dbgIDR('In initializeSelectedRegisters, resolving to:', registers);
        return Promise.resolve(registers);
    };
    this.getRegistersModbusInfo = function(registers) {
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
        dbgIDR('In getRegistersModbusInfo, resolving to:', expandedRegisters);
        return Promise.resolve(expandedRegisters);
    };
    this.cachedRegistersToDisplay = function(registers) {
        var registerList = [];
        registers.forEach(function(register) {
            registerList.push(register.name);
        });

        self.displayedRegisters = registerList;
        dbgIDR('In cachedRegistersToDisplay, updated self.displayedRegisters to:', registerList);
        dbgIDR('In cachedRegistersToDisplay, resolving to:', registers);
        return Promise.resolve(registers);
    };
    this.getInitialDeviceData = function(registers) {
        dbgIDR('In getInitialDeviceData, getting data for:', self.displayedRegisters);

        var registersToRead = [];
        registers.forEach(function(register) {
            if(typeof(register.readwrite) != 'undefined') {
                if(register.readwrite.indexOf('R') >= 0) {
                    registersToRead.push(register.name);
                }
            }
        });

        function getRegIndexFromResult(result) {
            var index = -1;
            registers.some(function(register, i) {
                if(register.name === result.data.name) {
                    index = i;
                    return true;
                } else {
                    return false;
                }
            });
            return index;
        }
        return self.activeDevice.sReadMultiple(registersToRead)
        .then(function(results) {
            results.forEach(function(result, i) {
                dbgIDR('Initial Read RESULT:', result);
                var index = getRegIndexFromResult(result);
                registers[index].result = result.data;
            });

            dbgIDR('In getInitialDeviceData, resolving to:', registers);
            return Promise.resolve(registers);
        });
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
        var occurances = new Map();
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
        self.updateActiveRegistersTableVisibility(registerName);
    };
    this.updateActiveRegistersTableVisibility = function(registers) {
        if(self.getNumberOfActiveRegisters() === 0) {
            self.pageElements.activeRegisters.ele.addClass('no-registers');
        } else {
            self.pageElements.activeRegisters.ele.removeClass('no-registers');
        }
        self.saveActiveRegisters();
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
        console.log('in onRefresh');
        onSuccess();
    };
    this.updateActiveRegisterValues = function(results) {
        var data = {};
        try {
            results.forEach(function(result) {
                // console.log('Updating Result...', result);

                if(result.res === null) {
                    result.res = 0;
                }
                if(result.val === null) {
                    result.val = 0;
                }
                if(typeof(result.str) === 'undefined') {
                    result.str = result.val.toString();
                }

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
        } catch(err) {
            console.error('Error updating data', err);
        }
        // console.log('Updated Data', data);
        return Promise.resolve();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        var readRegisters = self.getRegistersToRead();
        // console.log('Trying to read registers', readRegisters);
        if(readRegisters.length > 0) {
            self.activeDevice.sReadMany(readRegisters)
            .then(self.updateActiveRegisterValues)
            .then(onSuccess);
        } else {
            onSuccess();
        }
        // self.saveActiveRegisters()
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
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
