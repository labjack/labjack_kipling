function dataTableCreator() {
    var _ = global.require('underscore-min');
    this.activeDevice = undefined;
    var dataTableFormatter = new dataTableDataFormatter();

    // Data references from the dataTableDataFormatter.
    this.cachedRegisterData = undefined;
    this.dataTableData = undefined;
    this.cachedRegisterTags = undefined;

    this.templates = {};
    var tableFiltersElementID = '';
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

        var deviceTypeName = self.activeDevice.savedAttributes.deviceTypeName;
        dataTableFormatter.updateCachedRegisterData(deviceTypeName);
        
        // Update pointers to the formatted data.
        self.cachedRegisterData = dataTableFormatter.cachedRegisterData;
        self.dataTableData = dataTableFormatter.dataTableData;
        self.cachedRegisterTags = dataTableFormatter.cachedRegisterTags;

        return Promise.resolve();
    };
    var self = this;
}