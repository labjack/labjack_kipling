'use strict';

/* jshint undef: true, unused: true, undef: true */
/* global console, modbus_map */
/* global ljmmm_parse */
/* exported DataTableDataFormatter */

class DataTableDataFormatter {

    constructor() {
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
        this.dataTableData.detailsText.control = this.dataTableData.detailsText.show + this.dataTableData.detailsText.hide;

        // Define the data formatter.
        this.registerMatrixDataFormatter = [{
            'title': this.dataTableData.detailsText.show,
            'titleKey': 'details',
            'className': 'details-control',
            'orderable': false,
            'targets': 0,
            'isVisible': true,
            'width': '14px',
            'key': () => { return this.dataTableData.detailsText.control;},
        }, {
            'title': 'selected',
            'titleKey': 'select',
            'className': 'select-button select-control',
            'orderable': false,
            'targets': 0,
            'isVisible': true,
            'width': '14px',
            'key': () => { return this.dataTableData.selectText.add;},
        }, {
            'title': 'index',
            'key': (options) => { return options.index;},
            'isVisible': false
        }, {
            'className': 'register-name-header select-control',
            'title': 'name',
            'key': 'name',
            'isVisible': true,
        },  {
            'title': 'names',
            'key': (options) => {
                return options.registerNames.toString();
            },
            'isVisible': false
        }, {
            'title': 'nameArray',
            'key': (options) => { return options.registerNames;},
            'isVisible': false
        }, {
            'title': 'childData',
            'key': (options) => {
                const data = [];
                for (let i = 0; i < options.registerNames.length; i++) {
                    data.push({
                        'name': options.registerNames[i],
                        'address': options.addresses[i],
                        'isSelected': this.dataTableData.selectText.add,
                    });
                }
                return data;
            },
            'isVisible': false
        }, {
            'title': 'filteredChildData',
            'key': (options) => {
                const data = [];
                for (let i = 0; i < options.registerNames.length; i++) {
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
            'key': (options) => { return options.addresses;},
            'isVisible': false
        }, {
            'title': 'altnames',
            'key': (options) => {
                if (options.minified.altnames) {
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
            'key': (options) => { return options.minified.name;},
            'isVisible': false,
        }, {
            'title': 'groupAddress',
            'key': 'address',
            'isVisible': false
        }, {
            'title': 'tags',
            'key': (options) => {
                if (options.minified.tags) {
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
            'key': (options) => { return options.expandedRegisters[0].luaTypeInt; },
            'isVisible': false,
        }, {
            'title': 'childTable',
            'key': undefined,
            'isVisible': false,
        }];

        // Save and organize information from the registerMatrixDataFormatter array
        // into the dataTableData object.
        for (let i = 0; i < this.registerMatrixDataFormatter.length; i++) {
            // Create to the columns array
            const title = this.registerMatrixDataFormatter[i].title;
            const titleKey = this.registerMatrixDataFormatter[i].titleKey || title;
            // Save the index of the header
            this.dataTableData.headers[titleKey] = i;
            const columnsData = {
                'title': title
                // 'data': title
            };
            if (typeof(this.registerMatrixDataFormatter[i].className) !== 'undefined') {
                columnsData.className = this.registerMatrixDataFormatter[i].className;
            }
            if (typeof(this.registerMatrixDataFormatter[i].orderable) !== 'undefined') {
                columnsData.orderable = this.registerMatrixDataFormatter[i].orderable;
            }
            if (typeof(this.registerMatrixDataFormatter[i].width) !== 'undefined') {
                columnsData.width = this.registerMatrixDataFormatter[i].width;
            }
            this.dataTableData.columns.push(columnsData);


            // Create the columnDef array
            let isVisible = true;
            if (typeof(this.registerMatrixDataFormatter[i].isVisible) !== 'undefined') {
                isVisible = this.registerMatrixDataFormatter[i].isVisible;
            }
            const columnDefInfo = {
                'visible': isVisible,
                'targets': i
            };
            this.dataTableData.columnDefs.push(columnDefInfo);
        }

        this.cachedRegisterTags = [];
        this.cachedRegisterData = [];
    }

    checkIfConstantApplies(deviceKey, constant) {
        let applies = false;
        deviceKey = deviceKey.toUpperCase();
        if (constant.devices) {
            applies = constant.devices.some((device) => {
                // If the device is an object check its attribute "device"
                if (device.device) {
                    if (device.device === deviceKey) {
                        return true;
                    }
                } else {
                    // Otherwise assume it is a string.
                    if (device === deviceKey) {
                        return true;
                    }
                }
            });
        }
        return applies;
    }

    addApplicableRegisterTags(ljmConstant) {
        if (ljmConstant.tags) {
            const ljmTags = ljmConstant.tags;
            ljmTags.forEach((ljmTag) => {
                if (ljmTag !== '') {
                    if (this.cachedRegisterTags.indexOf(ljmTag) < 0) {
                        this.cachedRegisterTags.push(ljmTag);
                    }
                }
            });
        }
    }

    /**
     * Loop through the minifiedConstants and generate the
     * cachedRegisterData array by using the registerMatrixDataFormatter.
     * Format into the form specified by datatables:
     * https://datatables.net/examples/data_sources/js_array.html
     *     aka an array of arrays.
     * While doing this filter out registers that don't apply for the
     * currently selected device.
     **/
    updateCachedRegisterData(deviceTypeName) {

        // Clear the cache
        this.cachedRegisterData = [];
        this.cachedRegisterTags = [];

        // const deviceTypeName = this.activeDevice.savedAttributes.deviceTypeName;
        let registerIndex = 0;
        modbus_map.minifiedConstants.forEach((minifiedConstant) => {
            // Check to see if the constant applies to the current device.
            if (this.checkIfConstantApplies(deviceTypeName, minifiedConstant)) {
                const expandedRegisters = ljmmm_parse.expandPrimaryLJMMMEntrySync(
                    minifiedConstant
                );
                const registerNames = [];
                const registerAddresses = [];
                expandedRegisters.forEach((expandedRegister) => {
                    registerNames.push(expandedRegister.name);
                    registerAddresses.push(expandedRegister.address);
                });
                // Adding each expanded register.
                // expandedRegisters.forEach((expandedRegister) => {
                //     const attributes = [];
                //     registerMatrixDataFormatter.forEach((data) => {
                //         const attr = '';
                //         if (typeof(data.key) === 'function') {
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
                //         if (typeof(attr) !== 'undefined') {
                //             attributes.push(attr);
                //         } else {
                //             attributes.push('');
                //         }
                //     });
                //     this.cachedRegisterData.push(attributes);
                //
                //     // Increment the register index counter.
                //     registerIndex += 1;
                // });

                // Adding only the minified registers.
                const attributes = [];
                this.registerMatrixDataFormatter.forEach((data) => {
                    let attr = '';
                    if (typeof(data.key) === 'function') {
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
                    if (typeof(attr) !== 'undefined') {
                        attributes.push(attr);
                    } else {
                        attributes.push('');
                    }
                });
                this.cachedRegisterData.push(attributes);

                try {
                    this.addApplicableRegisterTags(minifiedConstant);
                } catch(err) {
                    console.log('Error adding tags to list', err);
                }

                // Increment the register index counter.
                registerIndex += 1;
            }
        });
    }

}

global.DataTableDataFormatter = DataTableDataFormatter;
