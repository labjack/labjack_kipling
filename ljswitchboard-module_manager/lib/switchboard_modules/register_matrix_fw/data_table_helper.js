
/* jshint undef: true, unused: true, undef: true */
/* global console, showAlert, modbus_map, $ */

// Imported as an extra module file.
/* global dataTableDataFormatter */

/* exported DataTableCreator */

const _ = require('underscore-min');

const tableFiltersElementID = '#tableFilters';
const ljmTagGroupMap = {
    'AIN': 'Analog Inputs',
    'AIN_EF': 'Analog Inputs',
    'MUX80': 'Analog Inputs',

    'DAC': 'Analog Outputs',
    'TDAC': 'Analog Outputs',

    'DIO': 'Digital I/O',
    'DIO_EF': 'Digital I/O',

    'SPI': 'Serial Comm',
    'I2C': 'Serial Comm',
    'SBUS': 'Serial Comm',
    'ASYNCH': 'Serial Comm',
    'UART': 'Serial Comm',
    'ONEWIRE': 'Serial Comm',

    'RTC': 'Peripherals',
    'WATCHDOG': 'Peripherals',


    'LUA': 'Scripting',
    'USER_RAM': 'Scripting',
    'FILE_IO': 'Scripting',

    'ETHERNET': 'Networking',
    'WIFI': 'Networking',
};

const ljmTagTranslations = {
    'AIN': 'Analog Input',
    'AIN_EF': 'Analog Input Extended Features',
    'MUX80': 'Mux 80',
    'DIO': 'Digital Input/Output',
};

// Filter groups as defined +- by caleb
// https://docs.google.com/spreadsheets/d/1Nj19BnnVcqLxjrUjzP9YZNEKXQduPS0HYVnQKTaxQvE/edit

const ljmTagGroups = [
    'Analog Inputs',
    'Analog Outputs',
    'Digital I/O',
    'Networking',
    'Peripherals',
    'Scripting',
    'Serial Comm',
    'Other',
];

const ljmTagsMultiselectElementIDStr = 'ljmTagsMultiselect';
const ljmTagsMultiselectElementID = '#' + ljmTagsMultiselectElementIDStr;

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
        this.dataTableFormatter = new dataTableDataFormatter();

        // Data references from the dataTableDataFormatter.
        this.cachedRegisterData = undefined;
        this.dataTableData = undefined;
        this.cachedRegisterTags = undefined;

        this.templates = {};

        this.groupsWithExtraData = [];
        this.recentlyUpdatedRows = [];
        this.table = undefined;

        this.controls = {
            'getRegisterWatchStatus': getUndefinedControlFunction(
                'getRegisterWatchStatus'
            ),
            'saveRegisterWatchStatus': getUndefinedControlFunction(
                'saveRegisterWatchStatus'
            ),
        };

         this.selectedLJMTags = {};
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
        const unsafeStrs = ['#', '(', ')', ':'];
        unsafeStrs.forEach((unsafeStr) => {
            groupName = groupName.split(unsafeStr).join('_');
        });

        // create the childTableID
        return groupName + '_CHILD_TABLE';
    }

    initializeChildTable(data) {
        const dataIndices = this.dataTableData.headers;
        const filteredChildDataIndex = dataIndices.filteredChildData;
        const filteredChildData = data[filteredChildDataIndex];
        const currentRowIndex = dataIndices.index;
        const childTableIndex = dataIndices.childTable;

        const childTableID = this.generateChildTableID(data);

        const self = this;

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
                }, {
                    'data': 'name',
                    'title': 'name',
                    'className': 'ct-name-header ct-select-control'
                }, {
                    'data': 'address',
                    'title': 'address',
                    'className': 'ct-address-header ct-select-control'
                }],
                'columnDefs': [],

                // Striping
                'stripeClasses': ['secondary_row odd', 'secondary_row even'],
                'drawCallback': function () {
                    const api = this.api();
                    const rows = api.rows({page: 'current'});
                    const data = rows.data();
                    const nodes = rows.nodes();
                    for (let i = 0; i < data.length; i++) {
                        const ele = $(nodes[i]);
                        const name = data[i].name;
                        const isSelected = self.getRegisterWatchStatus(name);
                        if (isSelected) {
                            ele.addClass('selected');
                        } else {
                            ele.removeClass('selected');
                        }
                    }
                },
                'dom': 'tip',
                'order': [[2, 'asc']],
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

        context.tableDisplayStyle = (filteredChildData.length > 1) ? 'inherit' : 'none';

        const keys = [
            'group', 'altnames', 'type', 'access', 'address',
            'description', 'streamable', 'tags', 'luatype',
        ];
        keys.forEach((key) => {
            context[key] = data[this.dataTableData.headers[key]];
        });

        console.log('Available Data', data);
        console.log('Selected Data', context);
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
        const isBlank = (searchStr === '');

        const findNumRegex = /\d+/;
        const findAddressRegex = /^\d+$/;
        const containsNumber = false;
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
            let modbusMapInfo;
            let matchResult = searchStr.match(findNumRegex);

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
                        if (childAddress === searchData.number) {
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
                    if (num === 1) {
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

    childTableSelectControlCallback(element) {
        const td = $(element);
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
            const matrix_row_div = tr.closest('.register_matrix_child_row');
            const matrix_tr = matrix_row_div.closest('tr').prev();

            this.table.row(matrix_tr);
            // const row = this.table.row(matrix_tr);
            // const rowData = row.data();

            // const registerName = rowData[1];
            const currentState = this.getRegisterWatchStatus(registerName);
            this.saveRegisterWatchStatus(registerName, !currentState);
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
            // rowData[detailsIndex] = this.dataTableData.detailsText.show;
        } else {
            // Indicate to the user that the +- button has changed.
            // rowData[detailsIndex] = this.dataTableData.detailsText.hide;

            // Format and display the childRow
            const nameArray = rowData[nameArrayIndex];

            row.child(this.formatChildTable(rowData, searchStr)).show();

            // If necessary, initialize the child's table as a new DataTable
            if (nameArray.length > 1) {
                // console.log('Initializing Child\'s DataTable');
                this.initializeChildTable(rowData, searchStr);
                // console.log('Finished initializing Child\'s DataTable');
            } else {
                // console.log('Not Initializing child\'s data....', rowData[filteredChildDataIndex]);
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

        let registerName, currentState;
        if (filteredChildData.length > 1) {
            this.primaryTableHandleDetailsControlClick(tr, row);
        } else if (filteredChildData.length === 1) {
            registerName = filteredChildData[0].name;
            currentState = this.getRegisterWatchStatus(registerName);
            this.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        } else {
            registerName = rowData[groupIndex];
            currentState = this.getRegisterWatchStatus(registerName);
            this.saveRegisterWatchStatus(registerName, !currentState);
            tr.toggleClass('selected');
        }
    }

    primaryTableDetailsControlCallback(element) {
        const tr = $(element).closest('tr');
        const row = this.table.row(tr);

        this.primaryTableHandleDetailsControlClick(tr, row);
    }

    primaryTableInitComplete(element) {
        const api = element.api();

        const tableFiltersEle = $(tableFiltersElementID);

        // Empty the table's filters
        tableFiltersEle.empty();


        const newEleStr = '<select id="' + ljmTagsMultiselectElementIDStr + '" multiple="multiple"></select>';
        const newEle = $(newEleStr);

        tableFiltersEle.append(newEle);

        const ljmTagsFilter = $(ljmTagsMultiselectElementID);

        const onTagSelectChange = () => {
            const tableHeaders = this.dataTableData.headers;
            const tagsColumnIndex = tableHeaders.tags;

            const tagsColumn = this.table.column(tagsColumnIndex);

            // Apply column search
            // tagsColumn.search('String...');
            // this.table.draw();

            const selectedTags = [];
            const keys = Object.keys(this.selectedLJMTags);
            keys.forEach((key) => {
                if (this.selectedLJMTags[key]) {
                    selectedTags.push(key);
                }
            });
            // console.log('Option Selected', selectedTags);

            const searchStrs = selectedTags.map((selectedTag) => {
                return '(' + selectedTag + ')';
            });
            const searchStr = searchStrs.join('|');
            // console.log('search str', searchStr);

            tagsColumn.search(searchStr, true);
            this.table.draw();
        };
        const debouncedOnTagSelectChange = _.debounce(
            onTagSelectChange,
            10);

        this.tempOption = '';
        const options = {
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
            'onSelectAll': () => {
                // const numSelectedOptions = $(ljmTagsMultiselectElementID + 'option:selected');

                ljmTagsFilter.multiselect('deselectAll', false);
                ljmTagsFilter.multiselect('updateButtonText');
                // const api = this;
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
            'onChange': (option, checked) => {
                if (option) {
                    const ljmTag = option.attr('value');
                    // const title = option.attr('title');
                    // const label = option.attr('label');

                    // console.log('Option Selected', ljmTag, checked);

                    this.selectedLJMTags[ljmTag] = !!checked;
                } else {
                    // Clear all options...
                    const keys = Object.keys(this.selectedLJMTags);
                    keys.forEach((key) => {
                        this.selectedLJMTags[key] = false;
                    });
                }
                this.tempOption = option;
                debouncedOnTagSelectChange();
            },
        };
        // Enable the element as a bootstrap-multiselect element
        ljmTagsFilter.multiselect(options);

        const multiselectOptions = ljmTagGroups.map((ljmTagGroup) => {
            return {
                'label': ljmTagGroup,
                'children': [],
            };
        });

        // ljmTagGroupMap
        // ljmTagGroups

        this.cachedRegisterTags.forEach((ljmTag) => {
            let label = ljmTag;
            let title = ljmTag;
            if (typeof (ljmTagTranslations[ljmTag]) !== 'undefined') {
                label = ljmTagTranslations[ljmTag];
                title = ljmTagTranslations[ljmTag] + ' (' + ljmTag + ')';
            }
            const tagObj = {'label': label, 'title': title, 'value': ljmTag};

            const ljmTagGroup = ljmTagGroupMap[ljmTag] ? ljmTagGroupMap[ljmTag] : 'Other';

            let groupIndex = ljmTagGroups.indexOf(ljmTagGroup);
            if (groupIndex < 0) {
                groupIndex = ljmTagGroups.indexOf('Other');
            }

            try {
                multiselectOptions[groupIndex].children.push(tagObj);
            } catch (err) {
                console.error('Error adding ljm tag group', err, ljmTag);
            }
        });

        // console.log('Appending options', multiselectTextAppend);
        // ljmTagsFilter.append(multiselectTextAppend);

        // Rebuild the multiselect element
        ljmTagsFilter.multiselect('dataprovider', multiselectOptions);

        // const tagsColumn = this.table.column(this.dataTableData.headers.tags);

        // Apply column search
        // tagsColumn.search('String...');
        // this.table.draw();

        const columns = api.columns();
        columns.every(function () {
            // const column = this;
            // console.log('primaryTableInitComplete - Columns...', column.header(), column.footer());
        });
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
            Adding Tag-Filters
             - https://www.datatables.net/examples/api/multi_filter_select.html
        */
        let domLayout = '';
        domLayout += '<"dataTableWrapper"';
        domLayout += '<"top row"';
        domLayout += '<"col-sm-6"';
        domLayout += '<"' + tableFiltersElementID + '.dataTables_length">';
        domLayout += '>';
        domLayout += '<"col-sm-6"f>';
        domLayout += '>';
        domLayout += 'rt';
        domLayout += '<"bottom row"';
        domLayout += '<"col-sm-4"li>';
        domLayout += '<"col-sm-8"p>';
        domLayout += '>';
        domLayout += '>';

        const self = this;

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
                'search': {'regex': false, 'smart': true},

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
                // 'dom': '<"dataTableWrapper"<"' + tableFiltersElementID + '"><"top row" <"col-sm-6"l><"col-sm-6"f>>rt<"bottom"ip>>',
                // 'dom': '<"dataTableWrapper"<"top row"<"col-sm-6"<"' + tableFiltersElementID + '.dataTables_length">><"col-sm-6"f>>rt<"bottom row"lip>>',
                // 'dom': 'lfrtip',
                'dom': domLayout,

                // Striping
                'stripeClasses': ['primary_row odd', 'primary_row even'],

                // Setting visibility
                'columnDefs': this.dataTableData.columnDefs,

                //
                'order': [[this.dataTableData.headers.address, 'asc']],

                // Pre-Draw Callback
                'preDrawCallback': function () {
                    return self.primaryTablePreDrawCallback(this);
                },

                // Row Callback
                'rowCallback': function() {
                    return self.primaryTableRowCallback(...arguments);
                },

                // Created Row
                // 'createdRow': (row, data, dataIndex) => {},

                // Draw Callback
                'drawCallback': function () {
                    return self.primaryTableDrawCallback(this);
                },

                // Adding Tag-Filters
                'initComplete': function () {
                    return self.primaryTableInitComplete(this);
                },
            });

        // Attach callbacks
        $(tableElementStr).on(
            'click',
            'td.ct-select-control',
            function () {
                return this.childTableSelectControlCallback(this);
            }
        );
        $(tableElementStr).on(
            'click',
            'td.select-control',
            function () {
                return self.primaryTableSelectControlCallback(this);
            }
        );
        $(tableElementStr).on(
            'click',
            'td.details-control',
            function () {
                return self.primaryTableDetailsControlCallback(this);
            }
        );
    }

    createDataTable(tableElementID) {
        const tableElement = $(tableElementID);
        if (tableElement.length >= 1) {
            try {
                this.innerCreateDataTable(tableElement, tableElementID);
            } catch (err) {
                console.error('Error creating dataTable', err);
            }
        } else {
            console.error('Table element', tableElementID, 'does not exist');
        }
        return this.table;
    }

    updateTemplates(templates) {
        this.templates = templates;
    }

    updateActiveDevice(activeDevice) {
        this.activeDevice = activeDevice;
    }

    updateData() {
        const deviceTypeName = this.activeDevice.savedAttributes.deviceTypeName;
        this.dataTableFormatter.updateCachedRegisterData(deviceTypeName);

        // Update pointers to the formatted data.
        this.cachedRegisterData = this.dataTableFormatter.cachedRegisterData;
        this.dataTableData = this.dataTableFormatter.dataTableData;
        this.cachedRegisterTags = this.dataTableFormatter.cachedRegisterTags;

        return Promise.resolve();
    }
}

global.DataTableCreator = DataTableCreator;
