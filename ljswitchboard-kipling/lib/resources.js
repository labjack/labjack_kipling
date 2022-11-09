const path = require('path');

/*
	Function called to load the application's core resources.
	The resources are loaded from the ljswitchboard-static_files/static
	directory.
*/
function loadCoreResources(win, static_files, resources) {
    static_files.loadResources(win, resources)
        .then(function(res) {}, function(err) {
            console.error('Error Loading resources', err);
        });
}

/*
	Function called to load the application's local resources.
	The resources are loaded starting from the directory of the
	index.html/index.js file aka the cwd of the window.
*/
function loadLocalResources(win, static_files, resources) {
    static_files.loadResources(win, resources, true)
        .then(function(res) {}, function(err) {
            console.error('Error Loading resources', err);
        });
}

async function loadResources(win, static_files) {
    console.log('Loading Page Resources');

    // Resources located in the -static_files directory
    const resourceList = [
        // Jquery lightness (hopefully things will get over-written)
        'libs/jquery-ui-1.10.4.custom/css/ui-lightness/jquery-ui-1.10.4.custom.min.css',

        // CSS for bootstrap
        'libs/bootstrap/css/bootstrap.docs.min.css',
        'libs/bootstrap/css/bootstrap.min.css',

        // CSS for bootmetro
        'libs/bootmetro/css/bootmetro.min.css',
        'libs/bootmetro/css/bootmetro-icons.min.css',
        'libs/bootmetro/css/bootmetro-responsive.min.css',
        'libs/bootmetro/css/bootmetro-ui-light.min.css',

        // CSS for other things...
        'css/bootstrap-switch.css',

        // bootstrap-multiselect stuff
        'css/bootstrap-multiselect.css',
        'css/bootstrap-multiselect.fix.css',

        'css/slider.css',
        'css/twbsPagination.css',
        'libs/DataTables-1.10.6/extensions/Plugins/integration/bootstrap/3/dataTables.bootstrap.css',

        // CSS for epoch graphing library
        // '/libs/epoch-0.6.0/epoch.min.css',

        // CSS for fixes to bootmetro & bootstrap
        'css/bootmetro.fix.css',

        // CSS for fixes to bootmetro & bootstrap
        'css/bootmetro.fix.css',

        // CSS for the switchboard base
        'css/switchboard_base.css',

        // CSS for bootstrap3-editable
        'libs/bootstrap3-editable-1.5.1/bootstrap3-editable/css/bootstrap-editable.css',

        // ------------------ Require js files -----------------------//
        // JS for jQuery
        'libs/jquery/jquery-1.10.2.min.js',

        // JS for bootmetro
        'libs/bootmetro/js/bootmetro.min.js',

        // JS for bootstrap
        'libs/bootstrap/js/bootstrap.min.js',

        // custom jquery ui stuff
        'libs/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.min.js',
        'libs/jquery-ui-1.10.4.custom/js/jquery.mousewheel.js',
        // 'libs/jquerytablepagination-0.5.0/jquery.tablePagination.0.5.min.js',


        // 'libs/dataTables/dataTables.bootstrap.js',
        // 'libs/dataTables/jquery.dataTables.min.js',
        'libs/DataTables-1.10.6/media/js/jquery.dataTables.min.js',
        'libs/DataTables-1.10.6/extensions/Plugins/integration/bootstrap/3/dataTables.bootstrap.min.js',
        // 'libs/DataTables-1.10.6/extensions/Responsive/js/dataTables.responsive.min.js',

        // JS for bootstrap sliders
        'js/bootstrap-switch.js',
        'js/bootstrap-slider.js',

        // JS for bootstrap multiselect:
        //  - http://davidstutz.github.io/bootstrap-multiselect/#methods
        'js/bootstrap-multiselect.js',

        // CSs for bootstrap3-editable
        'libs/bootstrap3-editable-1.5.1/bootstrap3-editable/js/bootstrap-editable.min.js',

        // Other JS
        // 'js/kinetic.js',
        // 'js/typeahead.bundle.min.js',
        'js/ace/ace.js',
        'js/ace/ext-language_tools.js',
        'js/customSpinners.js',
        'libs/flot/jquery.flot.js',
        'js/main.js',
        // 'libs/epoch-0.6.0/epoch.min.js',
    ];
    loadCoreResources(win, static_files, resourceList);

    // Resources located in the local directory
    var localResourceList = [
        // CSS for the module_chrome
        'css/module_chrome.css',

        // JS to add error helpers
        'js/error_helper.js',

        // JS for loading & manipulating the module_chrome
        // Creates a window-wide element "MODULE_CHROME"
        'js/module_chrome.js',

        // JS for loading & manipulating modules
        // Creates a window-wide element "MODULE_LOADER"
        'js/module_loader.js',

        // JS for loading & manipulating tasks.
        // Creates a global object "TASK_LOADER"
        'js/task_loader.js',

        // JS with convenient helper functions.
        'js/module_utils.js',

        // JS to listen to keyboard events.
        'js/keyboard_event_handler.js',

        // JS to listen to mouse events.
        'js/mouse_event_handler.js',

        // JS to manage the zoom level of the window.
        'js/window_zoom_manager.js',

        // JS to interface with the node-webkit's file browser.
        'js/file_browser.js',
        'js/main.js',
    ];
    loadLocalResources(win, static_files, localResourceList);
}

exports.loadResources = loadResources;
