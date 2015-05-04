/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */
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

    this.generateGroupRowText = undefined;
    this.compiledChildTable = undefined;

    this.debugSearching = false;


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

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

        self.generateGroupRowText = handlebars.compile(
            framework.moduleData.htmlFiles.group_row
        );
        self.compiledChildTable = handlebars.compile(
            framework.moduleData.htmlFiles.child_table
        );

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
        
        // Re-load the module's startupData
        self.refreshModuleStartupData()
        .then(self.updateCachedRegisterData)
        .then(onSuccess);
    };

    this.getRegistersToDisplay = function() {
        var defered = q.defer();
        var registers = [];
        var saveStartupData = false;
        var display_method = self.startupData.display_method;
        var display_methods = self.startupData.display_methods;
        if(typeof(display_methods[display_method]) === 'undefined') {
            showAlert('Un-supported display_method detected.  Changing to registers_by_sn.');
            console.log('in getRegistersToDisplay A', display_method, display_methods);
            saveStartupData = true;
            display_method = 'registers_by_sn';
            self.startupData.display_method = 'registers_by_sn';
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
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        self.getRegistersToDisplay()
        .then(self.getRegistersModbusInfo)
        .then(self.cachedRegistersToDisplay)
        .then(self.getInitialDeviceData)
        .then(function(registers) {
            console.log('Registers to display:', registers);
            self.moduleContext = {
                'registers': registers
            };
            framework.setCustomContext(self.moduleContext);
            onSuccess();
        });
        // framework.setCustomContext(self.moduleContext);
    };

    this.dataTableData = {
        'columns': [],
        'columnDefs': [],
        'headers': {},
        'selectText': {
            // 'add': '<span class="icon-add-to-list"></span>', icon-plus
            // 'remove': '<span class="icon-remove-2"></span>', icon-minus
            'add': '<span class="state-indicator icon-checkmark-circle">',
            'remove': '(remove: N/A)',
            'details': '<span class="icon-arrow-down-8"></span>',
        },
        'detailsText': {
            // 'show': '<span class="icon-plus"></span>',
            // 'hide': '<span class="icon-minus"></span>',
            'show': '<span class="show-details-button icon-info-4"></span>',
            'hide': '<span class="hide-details-button icon-info-5"></span>',
            'control': '',
        }
    };
    var detailsControlText = this.dataTableData.detailsText.show;
    detailsControlText += this.dataTableData.detailsText.hide;
    this.dataTableData.detailsText.control = detailsControlText;

    var registerMatrixDataFormatter = [{
            'title': this.dataTableData.detailsText.show,
            'titleKey': 'details',
            'className': 'details-control',
            'orderable': false,
            'targets': 0,
            'isVisible': true,
            'width': '14px',
            'key': function(options) { return self.dataTableData.detailsText.control;},
        }, {
            'title': 'select',
            'className': 'select-button select-control',
            'orderable': false,
            'targets': 0,
            'isVisible': true,
            'width': '14px',
            'key': function(options) { return self.dataTableData.selectText.add;},
        }, {
            'title': 'index',
            'key': function(options) { return options.index;},
            'isVisible': false
        }, {
            'className': 'register-name-header select-control',
            'title': 'name',
            'key': 'name',
            'isVisible': true,
        },  {
            'title': 'names',
            'key': function(options) {
                return options.registerNames.toString();
            },
            'isVisible': false
        }, {
            'title': 'nameArray',
            'key': function(options) { return options.registerNames;},
            'isVisible': false
        }, {
            'title': 'childData',
            'key': function(options) {
                var data = [];
                for(var i = 0; i < options.registerNames.length; i++) {
                    data.push({
                        'name': options.registerNames[i],
                        'address': options.addresses[i],
                        'isSelected': self.dataTableData.selectText.add,
                    });
                }
                return data;
            },
            'isVisible': false
        }, {
            'title': 'filteredChildData',
            'key': function(options) {
                var data = [];
                for(var i = 0; i < options.registerNames.length; i++) {
                    data.push({
                        'name': options.registerNames[i],
                        'address': options.addresses[i],
                        'isSelected': false
                    });
                }
                return data;
            },
            'isVisible': false
        }, {
            'className': 'register-address-header select-control',
            'title': 'address',
            'key': 'address'
        }, {
            'title': 'addresses',
            'key': function(options) { return options.addresses;},
            'isVisible': false
        }, {
            'title': 'altnames',
            'key': function(options) {
                if(options.minified.altnames) {
                    return options.minified.altnames.join(', ');
                } else {
                    return '';
                }
            },
            'isVisible': false
        }, {
            'className': 'register-type-header select-control',
            'title': 'type',
            'key': 'type'
        }, {
            'title': 'access',
            'key': 'readwrite',
            'isVisible': false,
        }, {
            'title': 'group',
            'key': function(options) { return options.minified.name;},
            'isVisible': false,
        }, {
            'title': 'groupAddress',
            'key': 'address',
            'isVisible': false
        }, {
            'title': 'tags',
            'key': function(options) {
                if(options.minified.tags) {
                    return options.minified.tags.join(', ');
                } else {
                    return '';
                }
            },
            'isVisible': false,
        }, {
            'title': 'streamable',
            'key': 'streamable',
            'isVisible': false,
        }, {
            'title': 'description',
            'key': 'description',
            'isVisible': false,
        }, {
            'title': 'childTable',
            'key': undefined,
            'isVisible': false,
        },
    ];

    this.cachedRegisterDataTableKeys = [];
    for(var i = 0; i < registerMatrixDataFormatter.length; i++) {
        // Create to the columns array
        var title = registerMatrixDataFormatter[i].title;
        var titleKey = registerMatrixDataFormatter[i].titleKey;
        if(typeof(titleKey) === 'undefined') {
            titleKey = title;
        }
        // Save the index of the header
        this.dataTableData.headers[titleKey] = i;
        var columnsData = {
            'title': title
            // 'data': title
        };
        if(typeof(registerMatrixDataFormatter[i].className) !== 'undefined') {
            columnsData.className = registerMatrixDataFormatter[i].className;
        }
        if(typeof(registerMatrixDataFormatter[i].orderable) !== 'undefined') {
            columnsData.orderable = registerMatrixDataFormatter[i].orderable;
        }
        if(typeof(registerMatrixDataFormatter[i].width) !== 'undefined') {
            columnsData.width = registerMatrixDataFormatter[i].width;
        }
        this.dataTableData.columns.push(columnsData);


        // Create the columnDef array
        var isVisible = true;
        if(typeof(registerMatrixDataFormatter[i].isVisible) !== 'undefined') {
            isVisible = registerMatrixDataFormatter[i].isVisible;
        }
        var columnDefInfo = {
            'visible': isVisible,
            'targets': i
        };
        this.dataTableData.columnDefs.push(columnDefInfo);
    }
    this.cachedRegisterData = [];

    var checkIfConstantApplies = function(deviceKey, constant) {
        var applies = false;
        deviceKey = deviceKey.toUpperCase();
        if(constant.devices) {
            applies = constant.devices.some(function(device) {
                // If the device is an object check its attribute "device"
                if(device.device) {
                    if(device.device === deviceKey) {
                        return true;
                    }
                } else {
                    // Otherwise assume it is a string.
                    if(device === deviceKey) {
                        return true;
                    }
                }
            });
        }
        return applies;
    };
    /** 
     * Loop through the minifiedConstants and generate the 
     * cachedRegisterData array by using the registerMatrixDataFormatter.
     * Format into the form specified by datatables:
     * https://datatables.net/examples/data_sources/js_array.html
     *     aka an array of arrays.
     * While doing this filter out registers that don't apply for the
     * currently selected device.
    **/
    this.updateCachedRegisterData = function() {
        var defered = q.defer();

        // Clear the cache
        self.cachedRegisterData = [];
        var deviceTypeName = self.activeDevice.savedAttributes.deviceTypeName;
        var registerIndex = 0;
        modbus_map.minifiedConstants.forEach(function(minifiedConstant) {
            // Check to see if the constant applies to the current device.
            if(checkIfConstantApplies(deviceTypeName, minifiedConstant)) {
                var expandedRegisters = ljmmm_parse.expandPrimaryLJMMMEntrySync(
                    minifiedConstant
                );
                var registerNames = [];
                var registerAddresses = [];
                expandedRegisters.forEach(function(expandedRegister) {
                    registerNames.push(expandedRegister.name);
                    registerAddresses.push(expandedRegister.address);
                });
                // Adding each expanded register.
                // expandedRegisters.forEach(function(expandedRegister) {
                //     var attributes = [];
                //     registerMatrixDataFormatter.forEach(function(data) {
                //         var attr = '';
                //         if(typeof(data.key) === 'function') {
                //             try {
                //                 attr = data.key({
                //                     'minified': minifiedConstant,
                //                     'registerNames': registerNames,
                //                     'addresses': registerAddresses,
                //                     'expandedRegisters': expandedRegisters,
                //                     'expandedRegister': expandedRegister
                //                 });
                //             } catch(err) {
                //                 console.log('Error in updateCachedRegisterData');
                //                 attr = '';
                //             }
                //         } else {
                //             attr = expandedRegister[data.key];
                //         }
                //         if(typeof(attr) !== 'undefined') {
                //             attributes.push(attr);
                //         } else {
                //             attributes.push('');
                //         }
                //     });
                //     self.cachedRegisterData.push(attributes);
                //     
                //     // Increment the register index counter.
                //     registerIndex += 1;
                // });
                
                // Adding only the minified registers.
                var attributes = [];
                registerMatrixDataFormatter.forEach(function(data) {
                    var attr = '';
                    if(typeof(data.key) === 'function') {
                        try {
                            attr = data.key({
                                'minified': minifiedConstant,
                                'registerNames': registerNames,
                                'addresses': registerAddresses,
                                'expandedRegisters': expandedRegisters,
                                'index': registerIndex,
                            });
                        } catch(err) {
                            console.log('Error in updateCachedRegisterData');
                            attr = '';
                        }
                    } else {
                        attr = minifiedConstant[data.key];
                    }
                    if(typeof(attr) !== 'undefined') {
                        attributes.push(attr);
                    } else {
                        attributes.push('');
                    }
                });
                self.cachedRegisterData.push(attributes);

                // Increment the register index counter.
                registerIndex += 1;
                // Adding created objects
                // var newDataObject = new registerDataObject(
                //     registerMatrixDataFormatter,
                //     {
                //         'minified': minifiedConstant,
                //         'registerNames': registerNames,
                //         'addresses': registerAddresses,
                //         'expandedRegisters': expandedRegisters,
                //     });
                // self.cachedRegisterData.push(newDataObject);
            }
        });
        defered.resolve();
        return defered.promise;
    };
    this.table = undefined;

    // Attempting to create a data object:
    // https://datatables.net/manual/data
    function registerDataObject(formatters, options) {
        var i;
        for(i = 0; i < formatters.length; i++) {
            var formatter = formatters[i];

            if(typeof(formatter.key) === 'function') {
                try {
                    this[formatter.title] = formatter.key(options);
                } catch(err) {
                    console.log('Error in registerDataObject');
                    this[formatter.title] = '';
                }
            } else {
                if(typeof(options.minified[formatter.key]) !== 'undefined') {
                    this[formatter.title] = options.minified[formatter.key];
                } else {
                    this[formatter.title] = '';
                }
            }
        }

        // Over-write the "name" attribute with a function.
        this._name = this.name;
        this.name = function() {
            // console.log('Querying for name attribute');
            return this._name;
        };
        this._address = this.address;
        this.address = function() {
            return parseInt(Math.random()*1000, 10);
        };
        // var self = this;
    }

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

    var generateChildTableID = function(data) {
        var dataIndices = self.dataTableData.headers;
        var filteredChildDataIndex = dataIndices.filteredChildData;
        var filteredChildData = data[filteredChildDataIndex];

        var groupName = data[dataIndices.group];

        // create a safe ID name by replacing un-safe characters with "_".
        var unsafeStrs = ['#','(',')', ':'];
        unsafeStrs.forEach(function(unsafeStr) {
            groupName = groupName.split(unsafeStr).join('_');
        });

        // create the childTableID
        var childTableID = groupName + '_CHILD_TABLE';

        return childTableID;
    };
    this.initializeChildTable = function(data, searchTerm) {
        console.log('in initializeChildTable');
        var dataIndices = self.dataTableData.headers;
        var filteredChildDataIndex = dataIndices.filteredChildData;
        var filteredChildData = data[filteredChildDataIndex];
        var currentRowIndex = dataIndices.index;
        var childTableIndex = dataIndices.childTable;

        var childTableID = generateChildTableID(data);

        // Initialize the child's dataTable.
        var childTable = $('#' + childTableID)
        .on('error.dt', function(e, settings, techNote, message) {
            var msg = 'An error has been reported by DataTables (child table ';
            msg += data[dataIndices.group] + ')';

            console.error(
                msg, 
                message
            );
            showAlert(msg);
        })
        .DataTable({
            'data': filteredChildData,
            'columns': [{ 
                'data': 'isSelected',
                'title': 'select',
                'className': 'select-button ct-select-control',
                'orderable': false,
                'targets': 0,
                'width': '14px',
            },{ 
                'data': 'name',
                'title': 'name',
                'className': 'ct-name-header ct-select-control'
            },{ 
                'data': 'address',
                'title': 'address',
                'className': 'ct-address-header ct-select-control'
            }],
            'columnDefs': [],

            // Striping
            'stripeClasses': [ 'secondary_row odd', 'secondary_row even'],
            'drawCallback': function (settings) {
                self.numPreDraws = 0;
                var api = this.api();
                var rows = api.rows({page:'current'});
                var data = rows.data();
                var nodes = rows.nodes();
                for(var i = 0; i < data.length; i++) {
                    var ele = $(nodes[i]);
                    var name = data[i].name;
                    var isSelected = self.getRegisterWatchStatus(name);
                    if(isSelected) {
                        ele.addClass('selected');
                    } else {
                        ele.removeClass('selected');
                    }
                }
                // self.recentlyUpdatedRows.forEach(function(updatedInfo) {
                //     var index = updatedInfo.index;
                //     var isSelected = updatedInfo.isSelected;
                //     var row = api.row(index);
                //     var node = row.node();
                //     var ele = $(node);
                //     if(isSelected) {
                //         ele.addClass('selected');
                //     } else {
                //         ele.removeClass('selected');
                //     }
                // });
            },
            'dom': 'tip',
            'order': [[ 2, 'asc']],
            'pageLength': 5,
            'autoWidth': false,
        });

        // console.log('Getting current data');
        // Get the current row's data
        var currentRow = self.table.row(currentRowIndex);
        var currentRowData = currentRow.data();
        
        // console.log('Updating current data');
        // update the current row's childTable element
        currentRowData[childTableIndex] = childTable;

        // console.log('Saving the rows new data');
        // Save the updated row's data.
        currentRow.data(currentRowData);
    };

    /**
     * This function creates a child's description box and if necessary it
     * initializes the child's sub-table if there is more than one 
     * @param  {[type]} data       [description]
     * @param  {[type]} searchTerm [description]
     * @return {[type]}            [description]
     */
    this.formatChildTable = function(data, searchTerm) {
        // data is the original data object for the row
        var context = {};
        var childTable;

        var dataIndices = self.dataTableData.headers;
        var filteredChildDataIndex = dataIndices.filteredChildData;
        var filteredChildData = data[filteredChildDataIndex];
        var nameArrayIndex = dataIndices.nameArray;
        var nameArray = data[nameArrayIndex];

        if(nameArray.length > 1) {
            // Construct the child's table id.
            var tableID = generateChildTableID(data);
            context.childTableID = tableID;
        }

        var tableDisplayStyle = 'none';
        if(filteredChildData.length > 1) {
            tableDisplayStyle = 'inherit';
        }
        context.tableDisplayStyle = tableDisplayStyle;
        
        var keys = [
            'group', 'altnames', 'type', 'access', 'address',
            'description', 'streamable', 'tags',
        ];
        keys.forEach(function(key) {
            context[key] = data[self.dataTableData.headers[key]];
        });

        // console.log('Available Data', data);
        // console.log('Selected Data', context);
        return self.compiledChildTable(context);
    };

    this.updateChildTableData = function(data, searchTerm) {
        console.log('in updateChildTableData');
        var dataIndices = self.dataTableData.headers;
        var filteredChildDataIndex = dataIndices.filteredChildData;
        var filteredChildData = data[filteredChildDataIndex];
        var currentRowIndex = dataIndices.index;
        var childTableIndex = dataIndices.childTable;

        var row = self.table.row(currentRowIndex);
        var rowData = row.data();
        var childTable = rowData[childTableIndex];

        var childTableID = generateChildTableID(data);
        var tableElementID = '#' + childTableID + '_holder';
        var tableElement = $(tableElementID);
        /*
         * 3 things need to happen:
         * 1. A childs table needs to be updated to reflect new search data.
         * 2. A childs table needs to be hidden if it is no longer relevant.
         * 3. A childs table needs to be re-displayed if it is relevant again.
         */
        
        // Start with basics, always updating the childs table.
        if(childTable) {
            if(childTable.clear) {
                childTable.clear().rows.add(filteredChildData).draw();
            }
        }

        // If there is only one register to be displayed then hide the table
        
        if(filteredChildData.length > 1) {
            console.log('Showing childTableID', childTableID, tableElementID);
            setTimeout(function() {
                console.log('Performing hide/show', tableElementID);
                // tableElement.show();
                // $(tableElementID).show();
                $(tableElementID).slideDown(200);
            }, 10);
            console.log('After');
        } else {
            console.log('Hiding childTableID', childTableID, tableElementID);
            setTimeout(function() {
                console.log('Performing hide/show', tableElementID);
                // tableElement.hide();
                // $(tableElementID).hide();
                $(tableElementID).slideUp(200);
            }, 10);
            console.log('After');
        }
        // if(filteredChildData.length > 1) {
        //     // Clear current data, add new data, and re-draw the table.
        //     if(childTable) {
        //         if(childTable.clear) {
        //             childTable.clear().rows.add(filteredChildData).draw();
        //         } else {
        //             self.formatChildTable(data, searchTerm)
        //             self.initializeChildTable(data, searchTerm);
        //         }
        //     } else {
        //         self.formatChildTable(data, searchTerm)
        //         self.initializeChildTable(data, searchTerm);
        //     }
        // } else {
        //     if(childTable) {
        //         if(childTable.destroy) {
        //             childTable.destroy();
        //             $('#' + childTableID + ' thead').remove();
        //             $('#' + childTableID + ' tbody').remove();
        //             $('#' + childTableID).hide();

        //             console.log('Setting index to undefined');
        //             rowData[childTableIndex] = undefined;
        //             rowData[childTableIndex] = '';

        //             console.log('Updating row data');
        //             row.data(rowData);
        //         }
        //     }
        // }
        
    };
    this.tableWatchRegisterCache = {};
    this.getRegisterWatchStatus = function(registerName) {
        if(typeof(self.tableWatchRegisterCache[registerName]) === 'undefined') {
            return false;
        } else {
            return self.tableWatchRegisterCache[registerName];
        }
    };
    this.getRegisterWatchStatusStr = function(registerName) {
        // If the register is being watched return the remove button
        if(self.getRegisterWatchStatus(registerName)) {
            return self.dataTableData.selectText.remove;
        } else {
            return self.dataTableData.selectText.add;
        }
    };
    this.saveTableRegisterWatchStatus = function(registerName, newState) {
        if(newState) {
            console.log('Removing from watch-list', registerName);
        } else {
            console.log('Adding to watch-list', registerName);
        } 
        // console.log('Saving register watch status', registerName, newState);
        self.tableWatchRegisterCache[registerName] = newState;
        return self.tableWatchRegisterCache[registerName];
    };

    this.groupsWithExtraData = [];
    this.recentlyUpdatedRows = [];
    this.onTemplateLoaded = function(framework, onError, onSuccess) {

        /*
            Elements of datatables used:
            Bootstrap:
            https://www.datatables.net/manual/styling/bootstrap

            Javascript sourced data:
             - https://datatables.net/examples/data_sources/js_array.html
            Alternative Pagination:
             - https://datatables.net/examples/basic_init/alt_pagination.html
            Multiple table control elements:
             - https://datatables.net/examples/advanced_init/dom_multiple_elements.html
            Row Grouping: (To give the look/feel of the grouped registers)
             - https://datatables.net/examples/advanced_init/row_grouping.html
            Search.regex
             - https://datatables.net/reference/option/search.regex
            Responsive row-control
             - https://datatables.net/extensions/responsive/examples/child-rows/column-control.html
            Striping rows
             - https://datatables.net/reference/option/stripeClasses
            Custom Toolbar/Footer
             - https://datatables.net/reference/option/dom
        */

        // var groupIndex = 0;
        // var registerNameIndex = 1;
        // var descriptionIndex = 6;
        var tableElementStr = '#modbus_map_table';
        self.numPreDraws = 0;
        try {
        self.table = $(tableElementStr)
        .on('error.dt', function(e, settings, techNote, message) {
            console.error('An error has been reported by DataTables', message);
            showAlert('Data Tables reported an error');
        })
        .DataTable({
            // Responsive row-control
            'responsive': {
                'details': {
                    'type': 'column',
                    'target': 'tr'
                }
            },

            // Search.regex
            'search': {'regex': true, 'smart': true},

            // Javascript sourced data
            'data': self.cachedRegisterData,
            'columns': self.dataTableData.columns,
            
            // Alternative Pagination
            'pagingType': 'full_numbers',
            'autoWidth': false,
            
            // Adding a custom toolbar
            // https://datatables.net/examples/advanced_init/dom_toolbar.html
            // 
            // Default is: ''
            // Multiple table control elements
            // 'dom': '<"top"iflp<"clear">>rt<"bottom"iflp<"clear">>',

            // Striping
            'stripeClasses': [ 'primary_row odd', 'primary_row even'],

            // Setting visibility
            'columnDefs': self.dataTableData.columnDefs,

            // Row Grouping
            // 'columnDefs': [
            //     {'visible': false, 'targets': groupIndex}
            // ],
            'order': [[ self.dataTableData.headers.address, 'asc']],
            // 'drawCallback': function (settings) {
            //     var api = this.api();
            //     var rows = api.rows( {page:'current'} ).nodes();
            //     var last=null;
            //     var columnData = api.column(
            //         self.dataTableData.headers.group,
            //         {page:'current'}
            //     ).data();
            //     var allColumnData = api.column(
            //         self.dataTableData.headers.group,
            //         {search:'applied'}
            //     ).data();
            //     var stats = self.arrayValueStatistics(allColumnData);
            //     columnData.each( function ( group, i ) {
            //         if ( last !== group ) {
            //             var num = stats.get(group);
            //             if( num > 1) {
            //                 $(rows).eq( i ).before(self.generateGroupRowText({
            //                     'group': group,
            //                     'num': num,
            //                 }));
            //             }
            //             last = group;
            //         }
            //     });
            //     console.log('in drawCallback');
            // }
            // 'preDrawCallback': function() {
            //     console.log('in preDrawCallback');
            //     return true;
            // },
            // https://datatables.net/reference/option/preDrawCallback
            'preDrawCallback': function(settings) {
                // Clear the cache that holds special group data.
                self.groupsWithExtraData = [];
                self.recentlyUpdatedRows = [];

                var api = this.api();

                // Using the rows modifier:
                // https://datatables.net/reference/type/selector-modifier
                // and the indexes function:
                // https://datatables.net/reference/api/rows().indexes()
                // Get an array of the rows that should be updated to reflect
                // filtered addresses & children re-rendered.
                var indexes = api.rows({page: 'current'}).indexes();

                // Get the current search string.
                var searchStr = api.search();
                var isBlank = false;
                if(searchStr === '') {isBlank = true;}
                var findNumRegex = /\d+/;
                var findAddressRegex = /^\d+$/;
                var containsNumber = false;
                var modbusMapInfo;
                var matchResult;
                var searchData = {
                    'isBlank': isBlank,
                    'containsNumber': false,
                    'number': 0,
                    'numberStr': '0',
                    'parsedNumber': '0',
                    'isAddress': false,
                    'upperCase': searchStr.toUpperCase(),
                    'isModbusAddress': false,
                    'isModbusName': false
                };

                if(!isBlank) {
                    matchResult = searchStr.match(findNumRegex);
                    if(matchResult) {
                        searchData.parsedNumber = matchResult[0];
                        searchData.number = parseInt(matchResult[0]);
                        searchData.numberStr = searchData.number.toString();
                        searchData.containsNumber = true;

                        modbusMapInfo = modbus_map.getAddressInfo(searchStr);
                        if(modbusMapInfo.type >= 0) {
                            searchData.isModbusName = true;
                        }
                    }

                    matchResult = searchStr.match(findAddressRegex);
                    if(matchResult) {
                        searchData.isAddress = true;

                        modbusMapInfo = modbus_map.getAddressInfo(searchStr);
                        if(modbusMapInfo.type >= 0) {
                            searchData.isModbusAddress = true;
                        }
                    }

                    
                }

                if(self.debugSearching) {
                    console.log('Search term data', searchData);
                }

                // Get the names index.
                // var index = self.dataTableData.headers.index;
                var indices = self.dataTableData.headers;
                var names = indices.names;
                var name = indices.name;
                var groupIndex = indices.group;
                var address = indices.address;
                var groupAddress = indices.groupAddress;
                var nameArray = indices.nameArray;
                var childData = indices.childData;
                var filteredChildData = indices.filteredChildData;
                var selectIndex = indices.select;

                // Loop through the visible rows and change their visible name
                // to reflec the filtered addresses as well as any visible
                // children.
                if(self.debugSearching) {
                    console.log('indexes', indexes, api.rows({page: 'current'}).data());
                }
                for(var i = 0; i < indexes.length; i++) {
                    var index = indexes[i];
                    var row = api.row(index);
                    var currentRow = row.data();

                    // Make sure that the row's child is an empty array.
                    currentRow[filteredChildData] = [];

                    // If the current row has multiple registers perform table 
                    // augmentations to display & filter sub-registers.
                    if(currentRow[nameArray].length > 1) {
                        var childRef = row.child;
                        var child = row.child();
                        
                        var newStr = '';
                        var newAddressStr = '';
                        var newSelectStr = '';
                        var num = 0;
                        var groupName = currentRow[groupIndex];
                        var currentState = currentRow[selectIndex];
                        
                        // Initialize the new name & address strings
                        newStr += groupName;
                        newAddressStr += currentRow[groupAddress];
                        
                        // if(isBlank) {
                        //     num = currentRow[names].split(',').length;
                        // } else {
                        //     num = self.ocurrences(currentRow[names], searchStr);
                        // }

                        
                        
                        // Loop through each sub-register and filter the results
                        // into the currentRow[filteredChildData] array.
                        var ignoreRemainingResults = false;
                        for(var j = 0; j < currentRow[childData].length; j++) {
                            var passesFilter = false;
                            var childName = currentRow[childData][j].name;
                            var childAddress = currentRow[childData][j].address;
                            var childAddressStr = childAddress.toString();
                            var childIsSelected = currentRow[childData][j].isSelected;

                            // Check to see if the child's name contains the
                            // upper case version of the search term.
                            var basicSearchRes = childName.indexOf(searchData.upperCase);
                            if(basicSearchRes === 0) {
                                passesFilter = true;
                                // If the match started at the front of the
                                // string and there was a number in the search
                                // term then we have very likely found the 
                                // correct register and shouldn't show any more
                                // results.
                                if(searchData.containsNumber) {
                                    ignoreRemainingResults = true;
                                }
                            } else if(basicSearchRes >= 0) {
                                passesFilter = true;
                            }

                            // Check to see if the child's name contains the
                            // parsed numberStr.
                            if(childName.indexOf(searchData.numberStr) >= 0) {
                                passesFilter = true;
                            }

                            // If the search term included a number, check to
                            // see if that parsed number matches the child's 
                            // address.
                            // Only allow this filter to pass if the address
                            // isn't a modbus name.
                            if(!searchData.isModbusName) {
                                if(childAddress == searchData.number) {
                                    passesFilter = true;
                                }
                            }

                            // If the search term included a number, check to 
                            // see if that number string matches the 
                            // stringified version of the address.
                            if(searchData.isAddress) {
                                if(childAddressStr.indexOf(searchData.parsedNumber) >= 0) {
                                    passesFilter = true;
                                }
                            }

                            // No numbers are in the search result force it to
                            // be shown.
                            if(!searchData.containsNumber) {
                                passesFilter = true;
                            }

                            // If the filter has been passed add the data to
                            // the filteredChildData array and increase the
                            // number of hidden registers.
                            if(passesFilter) {
                                currentRow[filteredChildData].push(
                                    currentRow[childData][j]
                                );
                                num += 1;
                                if(ignoreRemainingResults) {
                                    break;
                                }
                            }
                        }

                        if(num > 1) {
                            newStr += ' (';
                            newStr += num.toString();
                            newStr += ' Registers)';
                            newAddressStr = currentRow[filteredChildData][0].address;
                            newSelectStr = self.dataTableData.selectText.details;
                            // currentNode.addClass('details-control');
                        } else {
                            if(num == 1) {
                                newStr = currentRow[filteredChildData][0].name;
                                newAddressStr = currentRow[filteredChildData][0].address;
                                newSelectStr = currentRow[filteredChildData][0].isSelected;
                            } else {
                                newStr += '(None)';
                            }
                            // newStr += '(none...)';
                            // currentNode.addClass('details-control');
                            // newStr += '(no hidden registers)';
                        }
                        
                        currentRow[address] = newAddressStr;
                        currentRow[name] = newStr;
                        currentRow[selectIndex] = newSelectStr;
                        row.data(currentRow);

                        // If the row's child is shown then we can assume that
                        // its childTable data element has been initialized and
                        // can update its DataTable with new data.
                        if(childRef.isShown()) {
                            
                            // console.log('Current Row w/ visible child', index, child, childRef.isShown());
                            // console.log('Marking child to be re-drawn');
                            self.groupsWithExtraData.push({
                                'group': groupName,
                                'row': index
                            });
                            // childRef(self.formatChildTable(
                            //     currentRow,
                            //     searchStr
                            // )).show();
                            
                        }
                    }
                }



                // Loop through every row and change the row's visible name
                // to reflect the filtered addresses.
                // console.log('Current Row Data', currentData[0]);
                // for(var i = 0; i < lengthOfData; i++) {
                //     var currentRow = api.row(i).data();
                    
                //     var newStr = '';
                //     var num = 0;
                //     var groupName = currentRow[groupIndex];
                //     newStr += groupName;
                    
                //     currentRow[filteredNames] = [];
                //     // Loop through the list of names
                //     for(var j = 0; j < currentRow[nameArray].length; j++) {
                //         currentRow[filteredNames].push(currentRow[nameArray][j]);
                //     }
                //     num = currentRow[filteredNames].length;
                //     // if(isBlank) {
                //     //     num = currentRow[names].split(',').length;
                //     // } else {
                //     //     num = self.ocurrences(currentRow[names], searchStr);
                //     // }
                //     if(num > 1) {
                //         newStr += ' (';
                //         newStr += num.toString();
                //         newStr += ' Registers)';
                //         self.groupsWithExtraData.push({
                //             'group': groupName,
                //             'row': i,
                //         });
                //         // currentNode.addClass('details-control');
                //     } else {
                //         // newStr += '(none...)';
                //         // currentNode.addClass('details-control');
                //     }
                    
                //     currentRow[name] = newStr;
                //     api.row(i).data(currentRow);
                // }
                // if(self.numPreDraws < 1) {
                //     self.numPreDraws += 1;
                //     api.draw(false);
                //     return false;
                // } else {
                //     return true;
                // }
                return true;
            },

            // https://datatables.net/reference/option/rowCallback
            'rowCallback': function( rowElement, data, pageIndex ) {
                // var row = self.table.row(rowElement);
                var indices = sdModule.dataTableData.headers;
                var filteredChildDataIndex = indices.filteredChildData;

                // Get required data out of the row's data
                var rowIndex = data[indices.index];
                var filteredChildData = data[filteredChildDataIndex];

                var currentState = false;
                var registerName;
                var hasHiddenData = false;
                if(filteredChildData.length > 1) {
                    hasHiddenData = true;
                }
                if(filteredChildData.length == 1) {
                    registerName = filteredChildData[0].name;
                    currentState = self.getRegisterWatchStatus(registerName);
                } else {
                    currentState = false;
                }
                self.recentlyUpdatedRows.push({
                    'index': rowIndex,
                    'isSelected': currentState,
                    'hasHiddenData': hasHiddenData,
                });
            },
            // https://datatables.net/reference/option/createdRow
            'createdRow': function( row, data, dataIndex ) {
                // console.log('in createdRow', dataIndex);
            },
            // https://datatables.net/reference/option/drawCallback
            'drawCallback': function (settings) {
                // console.log('Resulting numPreDraws', self.numPreDraws);
                self.numPreDraws = 0;
                var api = this.api();
                var searchStr = api.search();

                // console.log('Special Groups:')
                self.groupsWithExtraData.forEach(function(groupData) {
                    // console.log(groupData.group);
                    
                    var row = api.row(groupData.row);
                    var rowData = row.data();
                    var node = row.node();
                    var childRef = row.child;
                    var child = row.child();
                    // Determine if we need to update the row's child, only
                    // rows with visible & existing children need to be 
                    // re-rendered.
                    self.updateChildTableData(rowData, searchStr);
                    // console.log('Finished updating the current child table');

                });

                self.recentlyUpdatedRows.forEach(function(updatedInfo) {
                    var index = updatedInfo.index;
                    var isSelected = updatedInfo.isSelected;
                    var hasHiddenData = updatedInfo.hasHiddenData;
                    var row = api.row(index);
                    var node = row.node();
                    var ele = $(node);
                    if(isSelected) {
                        ele.addClass('selected');
                    } else {
                        ele.removeClass('selected');
                    }

                    if(hasHiddenData) {
                        ele.addClass('hidden-data');
                    } else {
                        ele.removeClass('hidden-data');
                    }

                });
            }
            // Column Rendering (to hide registers in similar groups)
            // "columnDefs": [
            // {
            //     // The `data` parameter refers to the data for the cell (defined by the
            //     // `data` option, which defaults to the column being worked with, in
            //     // this case `data: 0`.
            //     "render": function ( data, type, row ) {
            //         return data +' ('+ row[registerNameIndex]+')';
            //     },
            //     "targets": 0
            // },
            // { "visible": false,  "targets": [ registerNameIndex ] }
            // ]
        });
        
        // $(tableElementStr).on('order.dt',function() {
        //     console.log('Re-ordering');
        //     // self.enableSecondaryRender = true;
        // });
        // $(tableElementStr).on('page.dt',function() {
        //     var info = self.table.page.info();
        //     console.log('New Page', info);
        // });
        $(tableElementStr).on('click', 'td.ct-select-control', function() {
            var td = $(this);
            var registerName;

            // Determine which element got clicked in order to get the register
            // name.
            if(td.hasClass('select-button')) {
                registerName = td.next().text();
            } else if(td.hasClass('ct-name-header')) {
                registerName = td.text();
            } else if(td.hasClass('ct-address-header')) {
                registerName = td.prev().text();
            } else {
                console.warn('child-table clicked... element saved as self.ctClickData');
                self.ctClickData = td;
            }

            if(registerName) {
                var tr = $(this).closest('tr');
                // Get the closest register_matrix_child_row & then its parent via
                // getting the previous element.
                var matrix_row_div = tr.closest('.register_matrix_child_row');
                var matrix_tr = matrix_row_div.closest('tr').prev();

                var row = self.table.row(matrix_tr);
                var rowData = row.data();

                // var registerName = rowData[1];
                var currentState = self.getRegisterWatchStatus(registerName);
                var newState = self.saveTableRegisterWatchStatus(registerName, !currentState);
                // var newButtonStr = self.getRegisterWatchStatusStr(registerName);
                // console.log('in ct select', rowData, registerName, newButtonStr, currentState, newState);
                // td.html(newButtonStr);
                
                tr.toggleClass('selected');
            }

        });
        $(tableElementStr).on('click', 'td.select-control', function() {
            var td = $(this);
            var tr = $(this).closest('tr');
            var row = self.table.row(tr);
            var rowData = row.data();

            var dataIndices = self.dataTableData.headers;
            var filteredChildDataIndex = dataIndices.filteredChildData;
            var nameArrayIndex = dataIndices.nameArray;
            var selectIndex = dataIndices.select;
            var groupIndex = dataIndices.group;

            var filteredChildData = rowData[filteredChildDataIndex];

            var registerName, currentState, newState;
            if(filteredChildData.length > 1) {

                self.handleDetailsControlClick(tr, row);
            } else if(filteredChildData.length == 1) {
                registerName = filteredChildData[0].name;
                currentState = self.getRegisterWatchStatus(registerName);
                newState = self.saveTableRegisterWatchStatus(registerName, !currentState);
                tr.toggleClass('selected');
            } else {
                registerName = rowData[groupIndex];
                currentState = self.getRegisterWatchStatus(registerName);
                newState = self.saveTableRegisterWatchStatus(registerName, !currentState);
                tr.toggleClass('selected');
            }
        });
        $(tableElementStr).on('click', 'td.details-control', function() {
            var td = $(this);
            var tr = $(this).closest('tr');
            var row = self.table.row(tr);
            
            self.handleDetailsControlClick(tr, row);
        });
} catch(err) {
    console.log('Error...', err);
}
        // // Order by the grouping
        // $('#modbus_map_table tbody').on( 'click', 'tr.group', function () {
        //     var currentOrder = table.order()[0];
        //     if ( currentOrder[0] === groupIndex && currentOrder[1] === 'asc' ) {
        //         table.order( [ groupIndex, 'desc' ] ).draw();
        //     }
        //     else {
        //         table.order( [ groupIndex, 'asc' ] ).draw();
        //     }
        // } );
        onSuccess();
    };
    this.handleDetailsControlClick = function(tr, row) {
        var rowData = row.data();
        var searchStr = self.table.search();

        var dataIndices = self.dataTableData.headers;
        var filteredChildDataIndex = dataIndices.filteredChildData;
        var nameArrayIndex = dataIndices.nameArray;
        var selectIndex = dataIndices.select;
        var detailsIndex = dataIndices.details;

        // Toggle the details icon.
        tr.toggleClass('details-visible');

        if(row.child.isShown()) {
            row.child.hide();
            // rowData[detailsIndex] = self.dataTableData.detailsText.show;
        } else {
            // Indicate to the user that the +- button has changed.
            // rowData[detailsIndex] = self.dataTableData.detailsText.hide;

            // Format and display the childRow
            var filteredChildData = rowData[filteredChildDataIndex];
            var nameArray = rowData[nameArrayIndex];
            
            row.child(self.formatChildTable(rowData, searchStr)).show();

            // If necessary, initialize the child's table as a new DataTable
            if(nameArray.length > 1) {
                console.log('Initializing Child\'s DataTable');
                self.initializeChildTable(rowData, searchStr);
                console.log('Finished initializing Child\'s DataTable');
            } else {
                // console.log('Not Initializing child\'s data....', filteredChildData);
            }
        }

        // Update the row's data
        row.data(rowData);
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
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        // self.saveModuleStartupData()
        // .then(onSuccess);
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        onSuccess();
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
