
/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

// Imported as an extra module file.
/* global dataTableDataFormatter */

/* exported dataTableCreator */

function dataTableCreator() {
    var _ = global.require('underscore-min');
    this.activeDevice = undefined;
    var dataTableFormatter = new dataTableDataFormatter();

    // Data references from the dataTableDataFormatter.
    this.cachedRegisterData = undefined;
    this.dataTableData = undefined;
    this.cachedRegisterTags = undefined;

    this.templates = {};

    var getUndefinedControlFunction = function(name) {
        var func = function(registerName, state) {
            console.log(
                'Register Watch Control Not Linked',
                name,
                registerName,
                state
            );
            if(name === 'getRegisterWatchStatus') {
                return false;
            } else {
                return false;
            }
        };
        return func;
    };
    var controls = {
        'getRegisterWatchStatus': getUndefinedControlFunction(
            'getRegisterWatchStatus'
        ),
        'saveRegisterWatchStatus': getUndefinedControlFunction(
            'saveRegisterWatchStatus'
        ),
    };

    this.saveControls = function(newControls) {
        if(newControls.getRegisterWatchStatus) {
            controls.getRegisterWatchStatus = newControls.getRegisterWatchStatus;
        }
        if(newControls.saveRegisterWatchStatus) {
            controls.saveRegisterWatchStatus = newControls.saveRegisterWatchStatus;
        }
    };

    this.removeControls = function() {
        controls.getRegisterWatchStatus = getUndefinedControlFunction(
            'getRegisterWatchStatus'
        );
        controls.saveRegisterWatchStatus = getUndefinedControlFunction(
            'saveRegisterWatchStatus'
        );
    };

    this.getRegisterWatchStatus = function(registerName) {
        return controls.getRegisterWatchStatus(registerName);
    };
    this.saveRegisterWatchStatus = function(registerName, newState) {
        return controls.saveRegisterWatchStatus(registerName, newState);
    };

    var generateChildTableID = function(data) {
        var dataIndices = self.dataTableData.headers;
        // var filteredChildDataIndex = dataIndices.filteredChildData;
        // var filteredChildData = data[filteredChildDataIndex];

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

    this.initializeChildTable = function(data) {
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
                'title': 'selected',
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
            'drawCallback': function () {
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
    this.formatChildTable = function(data) {
        // data is the original data object for the row
        var context = {};

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
        context.register_details = self.templates.register_details(context);
        return self.templates.child_table(context);
    };
    this.updateChildTableData = function(data) {
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
        // var tableElement = $(tableElementID);
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
    };

    this.groupsWithExtraData = [];
    this.recentlyUpdatedRows = [];
    this.table = undefined;

    var primaryTablePreDrawCallback = function() {
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
            'containsNumber': containsNumber,
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
                searchData.number = parseInt(matchResult[0], 10);
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
                    newAddressStr = currentRow[childData][0].address;
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
        return true;
    };

    // Actual arguments given:
    // (rowElement, data, pageIndex)
    var primaryTableRowCallback = function( rowElement, data ) {
        // var row = self.table.row(rowElement);
        var indices = self.dataTableData.headers;
        var filteredChildDataIndex = indices.filteredChildData;
        var nameIndex = indices.name;

        // Get required data out of the row's data
        var rowIndex = data[indices.index];
        var filteredChildData = data[filteredChildDataIndex];

        var currentState = false;
        var registerName;
        var hasHiddenData = false;

        
        if(filteredChildData.length > 1) {
            hasHiddenData = true;
        } else if(filteredChildData.length == 1) {
            registerName = filteredChildData[0].name;
            currentState = self.getRegisterWatchStatus(registerName);
        } else {
            registerName = data[nameIndex];
            currentState = self.getRegisterWatchStatus(registerName);
        }
        self.recentlyUpdatedRows.push({
            'index': rowIndex,
            'isSelected': currentState,
            'hasHiddenData': hasHiddenData,
        });
    };
    var primaryTableDrawCallback = function() {
        // console.log('in primaryTableDrawCallback');
        var api = this.api();
        var searchStr = api.search();

        // console.log('Special Groups:')
        self.groupsWithExtraData.forEach(function(groupData) {
            // console.log(groupData.group);
            
            var row = api.row(groupData.row);
            var rowData = row.data();
            // var node = row.node();
            // var childRef = row.child;
            // var child = row.child();
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
    };

    var childTableSelectControlCallback = function() {
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
            var newState = self.saveRegisterWatchStatus(registerName, !currentState);
            // var newButtonStr = self.getRegisterWatchStatusStr(registerName);
            // console.log('in ct select', rowData, registerName, newButtonStr, currentState, newState);
            // td.html(newButtonStr);
            
            tr.toggleClass('selected');
        }
    };

    var primaryTableHandleDetailsControlClick = function(tr, row) {
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
                // console.log('Initializing Child\'s DataTable');
                self.initializeChildTable(rowData, searchStr);
                // console.log('Finished initializing Child\'s DataTable');
            } else {
                // console.log('Not Initializing child\'s data....', filteredChildData);
            }
        }

        // Update the row's data
        row.data(rowData);
    };
    var primaryTableSelectControlCallback = function() {
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

            primaryTableHandleDetailsControlClick(tr, row);
        } else if(filteredChildData.length == 1) {
            registerName = filteredChildData[0].name;
            currentState = self.getRegisterWatchStatus(registerName);
            newState = self.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        } else {
            registerName = rowData[groupIndex];
            currentState = self.getRegisterWatchStatus(registerName);
            newState = self.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        }
    };
    var primaryTableDetailsControlCallback = function() {
        var td = $(this);
        var tr = $(this).closest('tr');
        var row = self.table.row(tr);
        
        primaryTableHandleDetailsControlClick(tr, row);
    };
    var ljmTagTranslations = {
        'AIN': 'Analog Input',
        'AIN_EF': 'Analog Input Extended Features',
        'DIO': 'Digital Input/Output',
    };
    
    // Filter groups as defined +- by caleb
    // https://docs.google.com/spreadsheets/d/1Nj19BnnVcqLxjrUjzP9YZNEKXQduPS0HYVnQKTaxQvE/edit

    var ljmTagGroupMap = {
        'AIN': 'Analog Inputs',
        'AIN_EF': 'Analog Inputs',

        'DAC': 'Analog Outputs',
        'TDAC': 'Analog Outputs',

        'DIO': 'Digital I/O',
        'DIO_EF': 'Digital I/O',
        
        'SPI': 'Serial Comm',
        'I2C': 'Serial Comm',
        'SBUS': 'Serial Comm',
        'ASYNCH': 'Serial Comm',
        'ONEWIRE': 'Serial Comm',

        'RTC': 'Peripherals',
        'WATCHDOG': 'Peripherals',


        'LUA': 'Scripting',
        'USER_RAM': 'Scripting',
        'FILE_IO': 'Scripting',

        'ETHERNET': 'Networking',
        'WIFI': 'Networking',
    };

    var ljmTagGroups = [
        'Analog Inputs',
        'Analog Outputs',
        'Digital I/O',
        'Networking',
        'Peripherals',
        'Scripting',
        'Serial Comm',
        'Other',
    ];

    this.selectedLJMTags = {};

    var tableFiltersElementID = '#tableFilters';
    var ljmTagsMultiselectElementIDStr = 'ljmTagsMultiselect';
    var ljmTagsMultiselectElementID = '#' + ljmTagsMultiselectElementIDStr;
    var primaryTableInitComplete = function() {
        var api = this.api();

        var tableFiltersEle = $(tableFiltersElementID);

        // Empty the table's filters
        tableFiltersEle.empty();

        
        var newEleStr = '';
        newEleStr += '<select id="' + ljmTagsMultiselectElementIDStr;
        newEleStr += '" multiple="multiple"></select>';
        var newEle = $(newEleStr);

        tableFiltersEle.append(newEle);

        var ljmTagsFilter = $(ljmTagsMultiselectElementID);

        var onTagSelectChange = function() {
            var tableHeaders = self.dataTableData.headers;
            var tagsColumnIndex = tableHeaders.tags;

            var tagsColumn = self.table.column(tagsColumnIndex);

            // Apply column search
            // tagsColumn.search('String...');
            // self.table.draw();

            var selectedTags = [];
            var keys = Object.keys(self.selectedLJMTags);
            keys.forEach(function(key) {
                if(self.selectedLJMTags[key]) {
                    selectedTags.push(key);
                }
            });
            // console.log('Option Selected', selectedTags);

            var searchStr = '';
            var searchStrs = selectedTags.map(function(selectedTag) {
                return '(' + selectedTag + ')';
            });
            searchStr = searchStrs.join('|');
            // console.log('search str', searchStr);

            tagsColumn.search(searchStr, true);
            self.table.draw();
        };
        var debouncedOnTagSelectChange = _.debounce(
            onTagSelectChange,
            10);

        self.tempOption = '';
        var options = {
            // Defining button width
            // 'buttonWidth': '100%',
            'buttonWidth': '275px',

            'maxHeight': 300,

            'checkboxName': 'bla',

            // Defines the text displayed when no options are selected.
            'nonSelectedText': 'Filter by Tags',

            // Defines the text displayed when several options get selected.
            'nSelectedText': ' - Selected Tags',

            // Determines how many options to display before hiding them.
            'numberDisplayed': 2,

            // Forces the insertion of a "selectAll" option
            'includeSelectAllOption': true,
            'selectAllText': 'Select None', // will re-define this button to always select none.
            'onSelectAll': function() {
                // var numSelectedOptions = $(ljmTagsMultiselectElementID + 'option:selected');

                ljmTagsFilter.multiselect('deselectAll', false);
                ljmTagsFilter.multiselect('updateButtonText');
                // var api = this;
                // console.log('All Options Selected', arguments, Object.keys(api));
            },

            // Enable filtering
            'enableFiltering': true,
            // Case-insensitive filtering
            'enableCaseInsensitiveFiltering': true,
            'filterBehavior': 'both',
            'filterPlaceholder': 'Search for a filter',

            // Enable clickable group options
            'enableClickableOptGroups': true,


            // Function that gets called when the selected options changes.
            'onChange': function(option, checked, select) {
                if(option) {
                    var ljmTag = option.attr('value');
                    // var title = option.attr('title');
                    // var label = option.attr('label');

                    // console.log('Option Selected', ljmTag, checked);

                    if(checked) {
                        self.selectedLJMTags[ljmTag] = true;
                    } else {
                        self.selectedLJMTags[ljmTag] = false;
                    }
                } else {
                    // Clear all options...
                    var keys = Object.keys(self.selectedLJMTags);
                    keys.forEach(function(key) {
                        self.selectedLJMTags[key] = false;
                    });
                }
                self.tempOption = option;
                debouncedOnTagSelectChange();
            },
        };
        // Enable the element as a bootstrap-multiselect element
        ljmTagsFilter.multiselect(options);

        // Look at the section "dataprovider" .multiselect('dataprovider', data)
        

        

        // var multiselectOptions = self.cachedRegisterTags.map(function(ljmTag) {
            // var label = ljmTag;
            // var title = ljmTag;
            // if(typeof(ljmTagTranslations[ljmTag]) !== 'undefined') {
            //     label = ljmTagTranslations[ljmTag];
            //     title = ljmTagTranslations[ljmTag] + ' (' + ljmTag + ')';
            // }

            // var value = ljmTag;
        //     return {'label': label, 'title': title, 'value': value};
        // });

        var multiselectOptions = ljmTagGroups.map(function(ljmTagGroup) {
            return {
                'label': ljmTagGroup,
                'children': [],
            };
        });

        // ljmTagGroupMap
        // ljmTagGroups

        self.cachedRegisterTags.forEach(function(ljmTag) {
            var label = ljmTag;
            var title = ljmTag;
            if(typeof(ljmTagTranslations[ljmTag]) !== 'undefined') {
                label = ljmTagTranslations[ljmTag];
                title = ljmTagTranslations[ljmTag] + ' (' + ljmTag + ')';
            }
            var value = ljmTag;
            var tagObj = {'label': label, 'title': title, 'value': value};

            var  ljmTagGroup = 'Other';
            if(ljmTagGroupMap[ljmTag]) {
                ljmTagGroup = ljmTagGroupMap[ljmTag];
            }

            var  groupIndex = ljmTagGroups.indexOf(ljmTagGroup);
            if(groupIndex < 0) {
                groupIndex = ljmTagGroups.indexOf('Other');
            }

            try {
                multiselectOptions[groupIndex].children.push(tagObj);
            } catch(err) {
                console.error('Error adding ljm tag group', err, ljmTag);
            }
        });

        // console.log('Appending options', multiselectTextAppend);
        // ljmTagsFilter.append(multiselectTextAppend);

        // Rebuild the multiselect element
        ljmTagsFilter.multiselect('dataprovider', multiselectOptions);

        var tableHeaders = self.dataTableData.headers;
        var tagsColumnIndex = tableHeaders.tags;

        // var tagsColumn = self.table.column(tagsColumnIndex);

        // Apply column search
        // tagsColumn.search('String...');
        // self.table.draw();


        var columns = api.columns();
        columns.every(function() {
            var column = this;
            var header = column.header();
            var footer = column.footer();
            // console.log('primaryTableInitComplete - Columns...', header, footer);
        });
    };
    var innerCreateDataTable = function(tableElement, tableElementStr) {
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
            Pre-Draw Callback
             - https://datatables.net/reference/option/preDrawCallback
            Row Callback
             - https://datatables.net/reference/option/rowCallback
            Created Row Callback
             - https://datatables.net/reference/option/createdRow
            Draw Callback
             - https://datatables.net/reference/option/drawCallback
            Adding Tag-Filters
             - https://www.datatables.net/examples/api/multi_filter_select.html
        */
        var domLayout = '';
        domLayout += '<"dataTableWrapper"';
        domLayout +=   '<"top row"';
        domLayout +=     '<"col-sm-6"';
        domLayout +=       '<"' + tableFiltersElementID + '.dataTables_length">';
        domLayout +=     '>';
        domLayout +=     '<"col-sm-6"f>';
        domLayout +=   '>';
        domLayout +=   'rt';
        domLayout +=   '<"bottom row"';
        domLayout +=     '<"col-sm-4"li>';
        domLayout +=     '<"col-sm-8"p>';
        domLayout +=   '>';
        domLayout += '>';
        
        
        self.table = tableElement.on('error.dt', function(e, settings, techNote, message) {
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
            'search': {'regex': false, 'smart': true},

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
            // 'dom': '<"dataTableWrapper"<"' + tableFiltersElementID + '"><"top row" <"col-sm-6"l><"col-sm-6"f>>rt<"bottom"ip>>',
            // 'dom': '<"dataTableWrapper"<"top row"<"col-sm-6"<"' + tableFiltersElementID + '.dataTables_length">><"col-sm-6"f>>rt<"bottom row"lip>>',
            // 'dom': 'lfrtip',
            'dom': domLayout,

            // Striping
            'stripeClasses': [ 'primary_row odd', 'primary_row even'],

            // Setting visibility
            'columnDefs': self.dataTableData.columnDefs,

            // 
            'order': [[ self.dataTableData.headers.address, 'asc']],

            // Pre-Draw Callback
            'preDrawCallback': primaryTablePreDrawCallback,

            // Row Callback
            'rowCallback': primaryTableRowCallback,

            // Created Row
            // 'createdRow': function(row, data, dataIndex) {},

            // Draw Callback
            'drawCallback': primaryTableDrawCallback,

            // Adding Tag-Filters
            'initComplete': primaryTableInitComplete,
        });

        // Attach callbacks
        $(tableElementStr).on(
            'click',
            'td.ct-select-control',
            childTableSelectControlCallback
        );
        $(tableElementStr).on(
            'click',
            'td.select-control',
            primaryTableSelectControlCallback
        );
        $(tableElementStr).on(
            'click',
            'td.details-control',
            primaryTableDetailsControlCallback
        );
    };
    this.createDataTable = function(tableElementID) {
        var tableElement = $(tableElementID);
        if(tableElement.length >= 1) {
            try {
                innerCreateDataTable(tableElement, tableElementID);
            } catch(err) {
                console.error('Error creating dataTable', err);
            }
        } else {
            console.error('Table element', tableElementID, 'does not exist');
        }
        return self.table;
    };

    this.updateTemplates = function(templates) {
        self.templates = templates;
    };

    this.updateActiveDevice = function(activeDevice) {
        self.activeDevice = activeDevice;
    };
    this.updateData = function() {
        var defered = q.defer();

        var deviceTypeName = self.activeDevice.savedAttributes.deviceTypeName;
        dataTableFormatter.updateCachedRegisterData(deviceTypeName);
        
        // Update pointers to the formatted data.
        self.cachedRegisterData = dataTableFormatter.cachedRegisterData;
        self.dataTableData = dataTableFormatter.dataTableData;
        self.cachedRegisterTags = dataTableFormatter.cachedRegisterTags;

        defered.resolve();
        return defered.promise;
    };
    var self = this;
}