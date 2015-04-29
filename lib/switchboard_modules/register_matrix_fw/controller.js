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

    var registerMatrixDataFormatter = [
        {
            'className': 'details-control icon-plus',
            'orderable': false,
            'targets': 0,
            'isVisible': true,
            'width': '14px'
        },
        // {
        //     'title': 'numRegs',
        //     'key': function(options) {
        //         return options.registerNames.length;
        //     },
        //     'isVisible': false
        // },
        {
            'title': 'name',
            'key': 'name',
            'isVisible': true,
        },
        // {
        //     'title': 'name',
        //     'key': function(options) {
        //         var retStr = options.registerNames[0];
        //         if(options.registerNames.length > 1) {
        //             // retStr += ' ... ';
        //             // retStr += options.registerNames[
        //             //     options.registerNames.length - 1];
        //             retStr = options.registerNames.join(' ');
        //         }
        //         return retStr;
        //     },
        // },
        {
            'title': 'names',
            'key': function(options) {
                return options.registerNames.toString();
            },
            'isVisible': false
        },
        {
            'title': 'nameArray',
            'key': function(options) {
                return options.registerNames;
            },
            'isVisible': false
        },
        {
            'title': 'address',
            'key': 'address'
        },
        {
            'title': 'addresses',
            'key': function(options) {
                return options.addresses;
            },
            'isVisible': false
        },
        {
            'title': 'altnames',
            'key': function(options) {
                if(options.minified.altnames) {
                    return options.minified.altnames.toString();
                } else {
                    return '';
                }
            },
            'isVisible': false
        },
        {
            'title': 'type',
            'key': 'type'
        },
        {
            'title': 'access',
            'key': 'readwrite',
            'isVisible': false,
        },
        {
            'title': 'group',
            'key': function(options) {
                return options.minified.name;
            },
            'isVisible': false,
        },
        {
            'title': 'tags',
            'key': function(options) {
                if(options.minified.tags) {
                    return options.minified.tags.toString();
                } else {
                    return '';
                }
            },
            'isVisible': false,
        },
        {
            'title': 'description',
            'key': 'description',
            'isVisible': false,
        },
    ];
    this.dataTableData = {
        'columns': [],
        'columnDefs': [],
        'headers': {}
    };
    this.cachedRegisterDataTableKeys = [];
    for(var i = 0; i < registerMatrixDataFormatter.length; i++) {
        // Create to the columns array
        var title = registerMatrixDataFormatter[i].title;
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


        if(typeof(title) === 'undefined') {
            title = 'expandButton';
        }
        // Save the index of the header
        this.dataTableData.headers[title] = i;


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
    this.formatChildTable = function(data) {
        // data is the original data object for the row
        var keys = ['group', 'altnames', 'type', 'access', 'address', 'description'];
        var context = {};
        keys.forEach(function(key) {
            context[key] = data[self.dataTableData.headers[key]];
        });
        console.log('Data', context);
        return self.compiledChildTable(context);
    };

    this.groupsWithExtraData = [];
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
            
            // Multiple table control elements
            // 'dom': '<"top"iflp<"clear">>rt<"bottom"iflp<"clear">>',

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

                var api = this.api();
                // Get a snap-shot of the currently displayed data
                var currentData = api.rows().data();
                var lengthOfData = currentData.length;

                // Get the current search string.
                var searchStr = api.search();
                var isBlank = false;
                if(searchStr === '') {isBlank = true;}

                // Get the names index.
                var names = self.dataTableData.headers.names;
                var name = self.dataTableData.headers.name;
                var groupIndex = self.dataTableData.headers.group;
                
                // console.log('Current Row Data', currentData[0]);
                for(var i = 0; i < lengthOfData; i++) {
                    var currentRow = api.row(i).data();
                    
                    var newStr = '';
                    var num = 0;
                    var groupName = currentRow[groupIndex];
                    newStr += groupName;
                    
                    if(isBlank) {
                        num = currentRow[names].split(',').length;
                    } else {
                        num = self.ocurrences(currentRow[names], searchStr);
                    }
                    if(num > 1) {
                        newStr += ' (';
                        newStr += num.toString();
                        newStr += ' Registers)';
                        self.groupsWithExtraData.push({
                            'group': groupName,
                            'row': i,
                        });
                        // currentNode.addClass('details-control');
                    } else {
                        // newStr += '(none...)';
                        // currentNode.addClass('details-control');
                    }
                    
                    currentRow[name] = newStr;
                    api.row(i).data(currentRow);
                }
                // if(self.numPreDraws < 1) {
                //     self.numPreDraws += 1;
                //     api.draw(false);
                //     return false;
                // } else {
                //     return true;
                // }
                return true;
            },
            // https://datatables.net/reference/option/drawCallback
            'drawCallback': function (settings) {
                console.log('Resulting numPreDraws', self.numPreDraws);
                self.numPreDraws = 0;
                var api = this.api();

                console.log('Special Groups:')
                self.groupsWithExtraData.forEach(function(groupData) {
                    console.log(groupData.group);
                    var currentNode = api.row(groupData.row).node();

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
        $(tableElementStr).on('click', 'td.details-control', function() {
            var td = $(this);
            var tr = $(this).closest('tr');
            var row = self.table.row(tr);

            if(row.child.isShown()) {
                row.child.hide();
                td.removeClass('icon-minus');
                td.addClass('icon-plus');
            } else {
                row.child(self.formatChildTable(row.data())).show();
                td.removeClass('icon-plus');
                td.addClass('icon-minus');
            }
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
