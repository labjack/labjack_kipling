'use strict';

/* jshint undef: true, unused: true, undef: true */
/* global console, $, showAlert, modbus_map */

// Imported as an extra module file.
/* global DataTableDataFormatter */

/* exported DataTableCreator */

function getUndefinedControlFunction(name) {
    return (registerName, state) => {
        console.log(
            'Register Watch Control Not Linked',
            name,
            registerName,
            state
        );
        if (name === 'getRegisterWatchStatus') {
            return false;
        } else {
            return false;
        }
    };
}

class DataTableCreator {
    constructor() {
        this.activeDevice = undefined;
        this.dataTableFormatter = new DataTableDataFormatter();

        // Data references from the dataTableDataFormatter.
        this.cachedRegisterData = undefined;
        this.dataTableData = undefined;

        this.templates = {};
        this.debugSearching = false;

        this.controls = {
            'getRegisterWatchStatus': getUndefinedControlFunction(
                'getRegisterWatchStatus'
            ),
            'saveRegisterWatchStatus': getUndefinedControlFunction(
                'saveRegisterWatchStatus'
            ),
        };

        this.groupsWithExtraData = [];
        this.recentlyUpdatedRows = [];
        this.table = undefined;
    }
    
    saveControls(newControls) {
        if (newControls.getRegisterWatchStatus) {
            this.controls.getRegisterWatchStatus = newControls.getRegisterWatchStatus;
        }
        if (newControls.saveRegisterWatchStatus) {
            this.controls.saveRegisterWatchStatus = newControls.saveRegisterWatchStatus;
        }
    }

    removeControls() {
        this.controls.getRegisterWatchStatus = getUndefinedControlFunction(
            'getRegisterWatchStatus'
        );
        this.controls.saveRegisterWatchStatus = getUndefinedControlFunction(
            'saveRegisterWatchStatus'
        );
    }

    getRegisterWatchStatus(registerName) {
        return this.controls.getRegisterWatchStatus(registerName);
    }

    saveRegisterWatchStatus(registerName, newState) {
        return this.controls.saveRegisterWatchStatus(registerName, newState);
    }

    generateChildTableID(data) {
        const dataIndices = this.dataTableData.headers;
        // const filteredChildDataIndex = dataIndices.filteredChildData;
        // const filteredChildData = data[filteredChildDataIndex];

        let groupName = data[dataIndices.group];

        // create a safe ID name by replacing un-safe characters with "_".
        const unsafeStrs = ['#','(',')', ':'];
        unsafeStrs.forEach((unsafeStr) => {
            groupName = groupName.split(unsafeStr).join('_');
        });

        // create the childTableID
        return groupName + '_CHILD_TABLE';
    }

    initializeChildTable(data) {
        console.log('in initializeChildTable');
        const dataIndices = this.dataTableData.headers;
        const filteredChildDataIndex = dataIndices.filteredChildData;
        const filteredChildData = data[filteredChildDataIndex];
        const currentRowIndex = dataIndices.index;
        const childTableIndex = dataIndices.childTable;

        const childTableID = this.generateChildTableID(data);

        // Initialize the child's dataTable.
        const childTable = $('#' + childTableID)
        .on('error.dt', (e, settings, techNote, message) => {
            const msg = 'An error has been reported by DataTables (child table ' + data[dataIndices.group] + ')';

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
            'drawCallback': () => {
                const api = childTable.api();
                const rows = api.rows({page:'current'});
                const data = rows.data();
                const nodes = rows.nodes();
                for (let i = 0; i < data.length; i++) {
                    const ele = $(nodes[i]);
                    const name = data[i].name;
                    const isSelected = this.getRegisterWatchStatus(name);
                    if (isSelected) {
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
        const currentRow = this.table.row(currentRowIndex);
        const currentRowData = currentRow.data();

        // console.log('Updating current data');
        // update the current row's childTable element
        currentRowData[childTableIndex] = childTable;

        // console.log('Saving the rows new data');
        // Save the updated row's data.
        currentRow.data(currentRowData);
    }

    /**
     * This function creates a child's description box and if necessary it
     * initializes the child's sub-table if there is more than one
     * @param  {[type]} data       [description]
     * @param  {[type]} searchTerm [description]
     * @return {[type]}            [description]
     */
    formatChildTable(data) {
        // data is the original data object for the row
        const context = {};

        const dataIndices = this.dataTableData.headers;
        const filteredChildDataIndex = dataIndices.filteredChildData;
        const filteredChildData = data[filteredChildDataIndex];
        const nameArrayIndex = dataIndices.nameArray;
        const nameArray = data[nameArrayIndex];

        if (nameArray.length > 1) {
            // Construct the child's table id.
            context.childTableID = this.generateChildTableID(data);
        }

        let tableDisplayStyle = 'none';
        if (filteredChildData.length > 1) {
            tableDisplayStyle = 'inherit';
        }
        context.tableDisplayStyle = tableDisplayStyle;

        const keys = [
            'group', 'altnames', 'type', 'access', 'address',
            'description', 'streamable', 'tags',
        ];
        keys.forEach((key) => {
            context[key] = data[this.dataTableData.headers[key]];
        });

        // console.log('Available Data', data);
        // console.log('Selected Data', context);
        context.register_details = this.templates.register_details(context);
        return this.templates.child_table(context);
    }

    updateChildTableData(data) {
        console.log('in updateChildTableData');
        const dataIndices = this.dataTableData.headers;
        const filteredChildDataIndex = dataIndices.filteredChildData;
        const filteredChildData = data[filteredChildDataIndex];
        const currentRowIndex = dataIndices.index;
        const childTableIndex = dataIndices.childTable;

        const row = this.table.row(currentRowIndex);
        const rowData = row.data();
        const childTable = rowData[childTableIndex];

        const childTableID = this.generateChildTableID(data);
        const tableElementID = '#' + childTableID + '_holder';
        // const tableElement = $(tableElementID);
        /*
         * 3 things need to happen:
         * 1. A childs table needs to be updated to reflect new search data.
         * 2. A childs table needs to be hidden if it is no longer relevant.
         * 3. A childs table needs to be re-displayed if it is relevant again.
         */

        // Start with basics, always updating the childs table.
        if (childTable) {
            if (childTable.clear) {
                childTable.clear().rows.add(filteredChildData).draw();
            }
        }

        // If there is only one register to be displayed then hide the table

        if (filteredChildData.length > 1) {
            console.log('Showing childTableID', childTableID, tableElementID);
            setTimeout(() => {
                console.log('Performing hide/show', tableElementID);
                // tableElement.show();
                // $(tableElementID).show();
                $(tableElementID).slideDown(200);
            }, 10);
            console.log('After');
        } else {
            console.log('Hiding childTableID', childTableID, tableElementID);
            setTimeout(() => {
                console.log('Performing hide/show', tableElementID);
                // tableElement.hide();
                // $(tableElementID).hide();
                $(tableElementID).slideUp(200);
            }, 10);
            console.log('After');
        }
    }

    primaryTablePreDrawCallback(element) {
        // Clear the cache that holds special group data.
        this.groupsWithExtraData = [];
        this.recentlyUpdatedRows = [];

        const api = element.api();

        // Using the rows modifier:
        // https://datatables.net/reference/type/selector-modifier
        // and the indexes function:
        // https://datatables.net/reference/api/rows().indexes()
        // Get an array of the rows that should be updated to reflect
        // filtered addresses & children re-rendered.
        const indexes = api.rows({page: 'current'}).indexes();

        // Get the current search string.
        const searchStr = api.search();
        let isBlank = false;
        if (searchStr === '') {isBlank = true;}
        const findNumRegex = /\d+/;
        const findAddressRegex = /^\d+$/;
        const containsNumber = false;
        let modbusMapInfo;
        let matchResult;
        const searchData = {
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

        if (!isBlank) {
            matchResult = searchStr.match(findNumRegex);
            if (matchResult) {
                searchData.parsedNumber = matchResult[0];
                searchData.number = parseInt(matchResult[0], 10);
                searchData.numberStr = searchData.number.toString();
                searchData.containsNumber = true;

                modbusMapInfo = modbus_map.getAddressInfo(searchStr);
                if (modbusMapInfo.type >= 0) {
                    searchData.isModbusName = true;
                }
            }

            matchResult = searchStr.match(findAddressRegex);
            if (matchResult) {
                searchData.isAddress = true;

                modbusMapInfo = modbus_map.getAddressInfo(searchStr);
                if (modbusMapInfo.type >= 0) {
                    searchData.isModbusAddress = true;
                }
            }
        }

        if (this.debugSearching) {
            console.log('Search term data', searchData);
        }

        // Get the names index.
        // const index = this.dataTableData.headers.index;
        const indices = this.dataTableData.headers;
        const name = indices.name;
        const groupIndex = indices.group;
        const address = indices.address;
        const groupAddress = indices.groupAddress;
        const nameArray = indices.nameArray;
        const childData = indices.childData;
        const filteredChildData = indices.filteredChildData;
        const selectIndex = indices.select;

        // Loop through the visible rows and change their visible name
        // to reflec the filtered addresses as well as any visible
        // children.
        if (this.debugSearching) {
            console.log('indexes', indexes, api.rows({page: 'current'}).data());
        }
        for (let i = 0; i < indexes.length; i++) {
            const index = indexes[i];
            const row = api.row(index);
            const currentRow = row.data();

            // Make sure that the row's child is an empty array.
            currentRow[filteredChildData] = [];

            // If the current row has multiple registers perform table
            // augmentations to display & filter sub-registers.
            if (currentRow[nameArray].length > 1) {
                const childRef = row.child;

                let newSelectStr = '';
                let num = 0;
                const groupName = currentRow[groupIndex];

                // Initialize the new name & address strings
                let newStr = groupName;
                let newAddressStr = currentRow[groupAddress];

                // if (isBlank) {
                //     num = currentRow[names].split(',').length;
                // } else {
                //     num = this.ocurrences(currentRow[names], searchStr);
                // }



                // Loop through each sub-register and filter the results
                // into the currentRow[filteredChildData] array.
                let ignoreRemainingResults = false;
                for (let j = 0; j < currentRow[childData].length; j++) {
                    let passesFilter = false;
                    const childName = currentRow[childData][j].name;
                    const childAddress = currentRow[childData][j].address;
                    const childAddressStr = childAddress.toString();

                    // Check to see if the child's name contains the
                    // upper case version of the search term.
                    const basicSearchRes = childName.indexOf(searchData.upperCase);
                    if (basicSearchRes === 0) {
                        passesFilter = true;
                        // If the match started at the front of the
                        // string and there was a number in the search
                        // term then we have very likely found the
                        // correct register and shouldn't show any more
                        // results.
                        if (searchData.containsNumber) {
                            ignoreRemainingResults = true;
                        }
                    } else if (basicSearchRes >= 0) {
                        passesFilter = true;
                    }

                    // Check to see if the child's name contains the
                    // parsed numberStr.
                    if (childName.indexOf(searchData.numberStr) >= 0) {
                        passesFilter = true;
                    }

                    // If the search term included a number, check to
                    // see if that parsed number matches the child's
                    // address.
                    // Only allow this filter to pass if the address
                    // isn't a modbus name.
                    if (!searchData.isModbusName) {
                        if (childAddress == searchData.number) {
                            passesFilter = true;
                        }
                    }

                    // If the search term included a number, check to
                    // see if that number string matches the
                    // stringified version of the address.
                    if (searchData.isAddress) {
                        if (childAddressStr.indexOf(searchData.parsedNumber) >= 0) {
                            passesFilter = true;
                        }
                    }

                    // No numbers are in the search result force it to
                    // be shown.
                    if (!searchData.containsNumber) {
                        passesFilter = true;
                    }

                    // If the filter has been passed add the data to
                    // the filteredChildData array and increase the
                    // number of hidden registers.
                    if (passesFilter) {
                        currentRow[filteredChildData].push(
                            currentRow[childData][j]
                        );
                        num += 1;
                        if (ignoreRemainingResults) {
                            break;
                        }
                    }
                }

                if (num > 1) {
                    newStr += ' (';
                    newStr += num.toString();
                    newStr += ' Registers)';
                    newAddressStr = currentRow[childData][0].address;
                    newSelectStr = this.dataTableData.selectText.details;
                    // currentNode.addClass('details-control');
                } else {
                    if (num == 1) {
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
                if (childRef.isShown()) {

                    // console.log('Current Row w/ visible child', index, child, childRef.isShown());
                    // console.log('Marking child to be re-drawn');
                    this.groupsWithExtraData.push({
                        'group': groupName,
                        'row': index
                    });
                    // childRef(this.formatChildTable(
                    //     currentRow,
                    //     searchStr
                    // )).show();

                }
            }
        }
        return true;
    }

    // Actual arguments given:
    // (rowElement, data, pageIndex)
    primaryTableRowCallback(rowElement, data) {
        // const row = this.table.row(rowElement);
        const indices = this.dataTableData.headers;
        const filteredChildDataIndex = indices.filteredChildData;
        const nameIndex = indices.name;

        // Get required data out of the row's data
        const rowIndex = data[indices.index];
        const filteredChildData = data[filteredChildDataIndex];

        let currentState = false;
        let registerName;
        let hasHiddenData = false;


        if (filteredChildData.length > 1) {
            hasHiddenData = true;
        } else if (filteredChildData.length == 1) {
            registerName = filteredChildData[0].name;
            currentState = this.getRegisterWatchStatus(registerName);
        } else {
            registerName = data[nameIndex];
            currentState = this.getRegisterWatchStatus(registerName);
        }
        this.recentlyUpdatedRows.push({
            'index': rowIndex,
            'isSelected': currentState,
            'hasHiddenData': hasHiddenData,
        });
    }

    primaryTableDrawCallback(element) {
        // console.log('in primaryTableDrawCallback');
        const api = element.api();
        const searchStr = api.search();

        // console.log('Special Groups:')
        this.groupsWithExtraData.forEach((groupData) => {
            // console.log(groupData.group);

            const row = api.row(groupData.row);
            const rowData = row.data();
            // const node = row.node();
            // const childRef = row.child;
            // const child = row.child();
            // Determine if we need to update the row's child, only
            // rows with visible & existing children need to be
            // re-rendered.
            this.updateChildTableData(rowData, searchStr);
            // console.log('Finished updating the current child table');

        });

        this.recentlyUpdatedRows.forEach((updatedInfo) => {
            const index = updatedInfo.index;
            const isSelected = updatedInfo.isSelected;
            const hasHiddenData = updatedInfo.hasHiddenData;
            const row = api.row(index);
            const node = row.node();
            const ele = $(node);
            if (isSelected) {
                ele.addClass('selected');
            } else {
                ele.removeClass('selected');
            }

            if (hasHiddenData) {
                ele.addClass('hidden-data');
            } else {
                ele.removeClass('hidden-data');
            }

        });
    }

    childTableSelectControlCallback() {
        const td = $(this);
        let registerName;

        // Determine which element got clicked in order to get the register
        // name.
        if (td.hasClass('select-button')) {
            registerName = td.next().text();
        } else if (td.hasClass('ct-name-header')) {
            registerName = td.text();
        } else if (td.hasClass('ct-address-header')) {
            registerName = td.prev().text();
        } else {
            console.warn('child-table clicked... element saved as this.ctClickData');
            this.ctClickData = td;
        }

        if (registerName) {
            const tr = $(this).closest('tr');
            // Get the closest register_matrix_child_row & then its parent via
            // getting the previous element.
            // const matrix_row_div = tr.closest('.register_matrix_child_row');
            // const matrix_tr = matrix_row_div.closest('tr').prev();

            // const row = this.table.row(matrix_tr);
            // const rowData = row.data();

            // const registerName = rowData[1];
            // const currentState = this.getRegisterWatchStatus(registerName);
            // const newState = this.saveRegisterWatchStatus(registerName, !currentState);
            // const newButtonStr = this.getRegisterWatchStatusStr(registerName);
            // console.log('in ct select', rowData, registerName, newButtonStr, currentState, newState);
            // td.html(newButtonStr);

            tr.toggleClass('selected');
        }
    }

    primaryTableHandleDetailsControlClick(tr, row) {
        const rowData = row.data();
        const searchStr = this.table.search();

        const dataIndices = this.dataTableData.headers;
        // const filteredChildDataIndex = dataIndices.filteredChildData;
        const nameArrayIndex = dataIndices.nameArray;

        // Toggle the details icon.
        tr.toggleClass('details-visible');

        if (row.child.isShown()) {
            row.child.hide();
        } else {
            // const filteredChildData = rowData[filteredChildDataIndex];
            const nameArray = rowData[nameArrayIndex];

            row.child(this.formatChildTable(rowData, searchStr)).show();

            // If necessary, initialize the child's table as a new DataTable
            if (nameArray.length > 1) {
                console.log('Initializing Child\'s DataTable');
                this.initializeChildTable(rowData, searchStr);
                console.log('Finished initializing Child\'s DataTable');
            } else {
                // console.log('Not Initializing child\'s data....', filteredChildData);
            }
        }

        // Update the row's data
        row.data(rowData);
    }

    primaryTableSelectControlCallback(element) {
        const tr = $(element).closest('tr');
        const row = this.table.row(tr);
        const rowData = row.data();

        const dataIndices = this.dataTableData.headers;
        const filteredChildDataIndex = dataIndices.filteredChildData;
        const groupIndex = dataIndices.group;

        const filteredChildData = rowData[filteredChildDataIndex];

        let registerName, currentState, newState;
        if (filteredChildData.length > 1) {
            this.primaryTableHandleDetailsControlClick(tr, row);
        } else if (filteredChildData.length === 1) {
            registerName = filteredChildData[0].name;
            currentState = this.getRegisterWatchStatus(registerName);
            newState = this.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        } else {
            registerName = rowData[groupIndex];
            currentState = this.getRegisterWatchStatus(registerName);
            newState = this.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        }
    }

    primaryTableDetailsControlCallback(element) {
        const tr = $(element).closest('tr');
        const row = this.table.row(tr);

        this.primaryTableHandleDetailsControlClick(tr, row);
    }

    innerCreateDataTable(tableElement, tableElementStr) {
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
        */

        this.table = tableElement.on('error.dt', (e, settings, techNote, message) => {
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
            'data': this.cachedRegisterData,
            'columns': this.dataTableData.columns,

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
            'columnDefs': this.dataTableData.columnDefs,

            //
            'order': [[ this.dataTableData.headers.address, 'asc']],

            // Pre-Draw Callback
            'preDrawCallback': element => this.primaryTablePreDrawCallback(element),

            // Row Callback
            'rowCallback': element => this.primaryTableRowCallback(element),

            // Created Row
            // 'createdRow': (row, data, dataIndex) => {},

            // Draw Callback
            'drawCallback': element => this.primaryTableDrawCallback(element),
        });

        // Attach callbacks
        $(tableElementStr).on(
            'click',
            'td.ct-select-control',
            element => this.childTableSelectControlCallback(element)
        );
        $(tableElementStr).on(
            'click',
            'td.select-control',
            element => this.primaryTableSelectControlCallback(element)
        );
        $(tableElementStr).on(
            'click',
            'td.details-control',
            element => this.primaryTableDetailsControlCallback(element)
        );
    }

    createDataTable(tableElementID) {
        const tableElement = $(tableElementID);
        if (tableElement.length >= 1) {
            try {
                this.innerCreateDataTable(tableElement, tableElementID);
            } catch(err) {
                console.error('Error creating dataTable', err);
            }
        } else {
            console.error('Table element', tableElementID, 'does not exist');
        }
        return this.table;
    }

    updateTemplates(templates) {
        this.templates = templates;
        console.log('Updated Templates', templates);
    }

    updateData() {
        // Update the cached data to be inserted into the table.
        this.dataTableFormatter.updateCachedRegisterData();

        // Update pointers to the formatted data.
        this.cachedRegisterData = this.dataTableFormatter.cachedRegisterData;
        this.dataTableData = this.dataTableFormatter.dataTableData;
    }
}
