/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */
/* exported dataTableDataFormatter */

function dataTableDataFormatter() {
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

    // build the detailsText.control attribute
    var detailsControlText = this.dataTableData.detailsText.show;
    detailsControlText += this.dataTableData.detailsText.hide;
    this.dataTableData.detailsText.control = detailsControlText;

    // Define the data formatter.
    var registerMatrixDataFormatter = [{
        'title': this.dataTableData.detailsText.show,
        'titleKey': 'details',
        'className': 'details-control',
        'orderable': false,
        'targets': 0,
        'isVisible': true,
        'width': '14px',
        'key': function() { return self.dataTableData.detailsText.control;},
    }, {
        'title': 'selected',
        'titleKey': 'select',
        'className': 'select-button select-control',
        'orderable': false,
        'targets': 0,
        'isVisible': true,
        'width': '14px',
        'key': function() { return self.dataTableData.selectText.add;},
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
        'title': 'luatype',
        'key': function(options) { return options.expandedRegisters[0].luaTypeInt; },
        'isVisible': false,
    }, {
        'title': 'childTable',
        'key': undefined,
        'isVisible': false,
    }];

    // Save and organize information from the registerMatrixDataFormatter array
    // into the dataTableData object.
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

    this.cachedRegisterTags = [];
    var addApplicableRegisterTags = function(ljmConstant) {
        if(ljmConstant.tags) {
            var ljmTags = ljmConstant.tags;
            ljmTags.forEach(function(ljmTag) {
                if(ljmTag !== '') {
                    if(self.cachedRegisterTags.indexOf(ljmTag) < 0) {
                        self.cachedRegisterTags.push(ljmTag);
                    }
                }
            });
        }
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
    this.cachedRegisterData = [];
    this.updateCachedRegisterData = function(deviceTypeName) {

        // Clear the cache
        self.cachedRegisterData = [];
        self.cachedRegisterTags = [];

        // var deviceTypeName = self.activeDevice.savedAttributes.deviceTypeName;
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

                try {
                    addApplicableRegisterTags(minifiedConstant);
                } catch(err) {
                    console.log('Error adding tags to list', err);
                }

                // Increment the register index counter.
                registerIndex += 1;
            }
        });
    };
	var self = this;
}