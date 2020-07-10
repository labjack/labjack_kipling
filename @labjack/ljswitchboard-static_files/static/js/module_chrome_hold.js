/**
 * Logic for the module framework.
 *
 * Logic for the framework and related GUI elements that bootstrap Switchboard
 * modules and allow the user to move between them.
 *
 * @author Sam Pottinger (LabJack Corp, 2013)
**/


var device_controller = require('./device_controller');
var presenter = require('./presenter');
var module_manager = require('./module_manager');

var MODULE_TAB_CONTAINER = '#module-list';
var MODULE_TAB_CLASS = 'module-tab';
var MODULE_TAB_ID_POSTFIX = '-module-tab';
var MODULE_LOADING_IMAGE_NAME = 'progress-indeterminate-ring-light.gif';
var MODULE_LOADING_IMAGE_DIR = 'static/img/';
var MODULE_LOADING_IMAGE_SRC = MODULE_LOADING_IMAGE_DIR +
    MODULE_LOADING_IMAGE_NAME;
var CURRENT_DEVICE_INDEX = 0; // Device to start off as being selected
var resizeTimeout;

//Framework constants
var FRAMEWORK_DIR = 'framework';
var SINGLE_DEVICE_FRAMEWORK_DIR = FRAMEWORK_DIR + '/kipling-module-framework';
var SINGLE_DEVICE_FRAMEWORK_PRESENTER = SINGLE_DEVICE_FRAMEWORK_DIR + 
    '/presenter_framework.js';
var SINGLE_DEVICE_FRAMEWORK_VIEW = SINGLE_DEVICE_FRAMEWORK_DIR + '/view.html';
var SINGLE_DEVICE_FRAMEWORK_CONNECTOR = SINGLE_DEVICE_FRAMEWORK_DIR + '/framework_connector.js';
var SINGLE_DEVICE_FRAMEWORK_CSS = SINGLE_DEVICE_FRAMEWORK_DIR + '/style.css';
var SINGLE_DEVICE_FRAMEWORK_DEVICE_CONSTANTS = SINGLE_DEVICE_FRAMEWORK_DIR + '/device_constants.js';

// var OPERATION_FAIL_MESaSAGE = handlebars.compile(
//     'Sorry, Kipling encountered an error. Please try again or contact ' + 
//     'support@labjack.com. Error: {{.}}');
var OPERATION_FAIL_MESSAGE = handlebars.compile(
    'Sorry, Kipling encountered an error. ' + 
    'Error: {{.}}');

var LOADED_MODULE_INFO_OBJECT;
var LOADED_MODULE_CONSTANTS_OBJECT;

var MODULE_CONTENT_BOTTOM_BORDER_HEIGHT = 20;

var MODULE_WINDOW_RESIZE_LISTNERS = [];
/**
 * Switch the view to the given module.
 *
 * @param {String} name The name of the module to switch the user view to.
**/
function selectModule(name)
{
    $('.' + MODULE_TAB_CLASS).removeClass('selected');
    $('#' + name + MODULE_TAB_ID_POSTFIX).addClass('selected');
    $(MODULE_CONTENTS_ELEMENT).empty().append(
        $('<img>').attr('src', MODULE_LOADING_IMAGE_SRC)
    );

    fs_facade.getModuleInfo(
        name,
        function(err) {
            $('#cur-module-display').html(name.replace(/_/g, ' '));
        },
        function(moduleInfo) {
            $('#cur-module-display').html(moduleInfo.humanName);
            
        });
    // $('#cur-module-display').html(name.replace(/_/g, ' '));

    var src = name + '/view.html';
    var cssFile = name + '/style.css';
    var jsFile = name + '/controller.js';
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    var standardContext = {
        'devices': devices,
        'hasMultipleDevices': keeper.getNumDevices() > 1,
        'currentDevice': devices[CURRENT_DEVICE_INDEX]
    };

    //Function that performs a standard load-module
    var renderNoFrameworkModule = function () {
        //Renders the module, function lives in 'ljswitchboard/src/presenter.js'
        renderTemplate(src, standardContext, MODULE_CONTENTS_ELEMENT, false,
            [cssFile], [jsFile], genericErrorHandler);
    };

    //Function that loads a module with the singleDevice framework
    var renderSingleDeviceFrameworkModule = function (thirdPartyJSList) {
        //Get the file path for the presenter_framework that runs the 
        //  singleDevice framework.
        //File is found in the non-compiled switchboard_modules/frameworks 
        //  directory.
        var device_constants = SINGLE_DEVICE_FRAMEWORK_DEVICE_CONSTANTS;
        var framework_location = SINGLE_DEVICE_FRAMEWORK_PRESENTER;
        var framework_connector = SINGLE_DEVICE_FRAMEWORK_CONNECTOR;
        var framework_style = SINGLE_DEVICE_FRAMEWORK_CSS;
        var jsLibFiles = [];
        var jsLocalFiles = [
            device_constants,
            framework_location, 
            jsFile, 
            framework_connector
        ];
        var jsFiles = [];

        // Add third party js files (if they are defined)
        if(thirdPartyJSList !== undefined) {
            thirdPartyJSList.forEach(function(element, index, array){
                jsLibFiles.push('third_party_code/'+element);
            });
        }
        jsLibFiles.forEach(function(element, index, array){
            jsFiles.push(element);
        });
        jsLocalFiles.forEach(function(element, index, array){
            jsFiles.push(element);
        });


        //Renders the module, function lives in 'ljswitchboard/src/presenter.js'
        renderTemplateFramework(
            SINGLE_DEVICE_FRAMEWORK_VIEW, 
            src,
            standardContext, 
            MODULE_CONTENTS_ELEMENT, 
            false,
            [framework_style, cssFile], 
            jsFiles, 
            genericErrorHandler);
        //Render a template based off of a framework:
        //renderFrameworkTemplate(SINGLE_DEVICE_FRAMEWORK_VIEW);
    };

    // TODO: Better error handler
    fs_facade.getModuleInfo(
        name,
        function (err) { 
            console.log('Error Loading moduleConstants.json');
            showAlert(err); 
        },
        function (moduleInfo) {

            // Save the module info object
            LOADED_MODULE_INFO_OBJECT = moduleInfo;
            var loadModule = function(moduleConstants) {
                // Save the module constants object
                LOADED_MODULE_CONSTANTS_OBJECT = moduleConstants;
                //Check to see if a framework should be loaded
                if (moduleInfo.framework) {
                    if(moduleInfo.framework === 'singleDevice') {
                        //load the 'singleDevice' framework
                        renderSingleDeviceFrameworkModule(moduleInfo.third_party_code);
                    } else {
                        //if no appropriate framework was found, load as if there 
                        //  was no framework requested
                        renderNoFrameworkModule();
                    }
                } else {
                    //Perform a standard module-load
                    renderNoFrameworkModule();
                }
            };
            fs_facade.getModuleConstants(
                name,
                function (err) { 
                    console.log('Error Loading moduleConstants.json');
                    showAlert(err);
                },
                loadModule
            );
        }
    );
}


/**
 * Add a new tab for a module to the GUI list of available modules.
 *
 * @param {String} targetElement The jQuery compatible selector for the
 *      element or elements that the tab should be added to.
 * @param {Object} module The information for the module to add a tab for.
**/
function addModuleTab(targetElement, module)
{
    var tabID = module.name + MODULE_TAB_ID_POSTFIX;
    $(targetElement).append(
        $('<li>').attr('class', MODULE_TAB_CLASS).attr('id', tabID).html(
            module.humanName
        )
    );
}


/**
 * Display a collection of modules to the user as a list of tabs.
 *
 * Display a collection of available modules to the user as a list of sidebar
 * tabs.
 *
 * @param {Array} activeModules An Array of Object each containing information
 *      about a module to display.
 * @param {function} onError The callback to call if an error is encountered
 *      while creating the display.
 * @param {function} onSuccess The callback to call after the modules display
 *      has been rendered.
**/
function displayActiveModules(activeModules, matchFunc, onError, onSuccess)
{
    if(activeModules.length === 0)
    {
        onSuccess();
        return;
    }

    fs_facade.getModuleInfo(activeModules.shift().name, onError,
        function(info)
        {
            if (matchFunc(info))
                addModuleTab(MODULE_TAB_CONTAINER, info);
            displayActiveModules(activeModules, matchFunc, onError, onSuccess);
        }
    );
}


/**
 * Display a collection of modules to the user as a list of selectable tabs.
 *
 * Display a collection of available modules to the user as a list of selectable
 * sidebar tabs, adding click event listeners where necessary.
 *
 * @param {Array} activeModules An Array of Object each containing information
 *      about a module to display.
 * @param {function} onError The callback to call if an error is encountered
 *      while creating the display.
 * @param {function} onSuccess The callback to call after the display is
 *      rendered with event listeners. This is optional.
**/
function displayActiveModulesWithEvents(activeModules, matchFunc, onError,
    onSuccess)
{
    displayActiveModules(activeModules.slice(0), matchFunc, onError, function()
    {
        $('.' + MODULE_TAB_CLASS).click(function(event){
            selectModule(event.target.id.replace(MODULE_TAB_ID_POSTFIX, ''));
        });

        if(onSuccess !== undefined)
            onSuccess();
    });
}

function addModuleWindowResizeListner(keyStr, callbackFunc) {
    if ((typeof(keyStr) === 'string') && (typeof(callbackFunc) === 'function')){
        var origIndex = 0;
        var addListener = MODULE_WINDOW_RESIZE_LISTNERS.every(function(listener,index) {
            if (listener.key === keyStr) {
                origIndex = index;
                return false;
            }
            return true;
        });
        if (addListener) {
            console.log('Adding Listener',keyStr, 'duh...');
            MODULE_WINDOW_RESIZE_LISTNERS.push({key:keyStr,callback:callbackFunc});
        } else {
            console.log('Replacing Listener',origIndex);
            MODULE_WINDOW_RESIZE_LISTNERS[origIndex] = {key:keyStr,callback:callbackFunc};
        }
    } else {
            console.log('not Adding Listener');
        }
}
function removeModuleWindowResizeListner(keyStr) {
    if(typeof(keyStr) === 'string') {
        var origIndex = 0;
        var isFound = MODULE_WINDOW_RESIZE_LISTNERS.some(function(listener,index) {
            if (listener.key === keyStr) {
                origIndex = index;
                return true;
            }
            return false;
        });
        if (isFound) {
            console.log('Removing Listener');
            MODULE_WINDOW_RESIZE_LISTNERS.splice(origIndex,1);
        } else {
            console.log('Not Removing Listener',keyStr);
        }
    }
};

function clearModuleWindowResizeListners() {
    MODULE_WINDOW_RESIZE_LISTNERS = [];
};
/**
 * Callback that dyanmically handles window resizing.
**/
function onResized()
{
    // in the module_chrome.css file this magic number is 768 & 767
    if ($(window).width() > 782) {
        $('#device-nav-dock').slideUp();
        $('#module-list').slideDown();
        $('#close-nav-dock').slideUp();
    } else {
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp();
        $('#close-nav-dock').slideUp();
    }

    var moduleChromeContentsEl = $('#module-chrome-contents');
    var windowHeight = $(window).height();
    var contents_height = windowHeight - MODULE_CONTENT_BOTTOM_BORDER_HEIGHT;
    if(moduleChromeContentsEl.css('overflow') !== 'hidden') {
        $('#module-list').height((windowHeight - 75).toString() + 'px');
        moduleChromeContentsEl.css(
            {'height': contents_height.toString() + 'px'}
        );
    } else {
        moduleChromeContentsEl.css({'height': '100%'});
    }

    MODULE_WINDOW_RESIZE_LISTNERS.forEach(function(listener) {
        if(typeof(listener.callback) === 'function') {
            var moduleHeight = moduleChromeContentsEl.height();
            var topPadding = moduleChromeContentsEl.css('padding-top');
            var bottomPadding = moduleChromeContentsEl.css('padding-bottom');

            moduleHeight += parseInt(topPadding.slice(0,topPadding.search('px')));
            moduleHeight += parseInt(bottomPadding.slice(0,bottomPadding.search('px')));
            
            listener.callback(moduleHeight);
        } else {
            console.log('Bad Window Resize Listener Found! (module_chrome.js)',listener);
        }
    });
    // var topPos = $('#module-chrome-contents').position().top;
    // var sidebar_height_diff = windowHeight - $('#module-list').height();
    // if ($('#module-chrome-contents').height() >= contents_height) {
    //     $('#module-chrome-contents').css(
    //         {'height': contents_height.toString() + 'px'}
    //     )
    // } else {
    //     $('#module-chrome-contents').animate(
    //         {'height': contents_height.toString() + 'px'},
    //         250
    //     );
    // }
}


/**
 * Show an error message in an alert modal at the top of the screen.
 *
 * Show an error message in an alert modal positioned at the top of the screen.
 * This modal should be embedded and fixed (no moving). However, it should be
 * closeable.
 *
 * @param {String} errorMessage The message to display.
**/
function showAlert(errorMessage)
{
    var message = OPERATION_FAIL_MESSAGE(errorMessage);
    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}


/**
 * Hide the alert error display at the top of the screen.
**/
function closeAlert()
{
    $('#alert-message').fadeOut(function(){
        $('.device-selector-holder').css('margin-top', '45px');
    });
}


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices());

    $('.close-alert-button').click(closeAlert);

    $('#manage-link').click(function () {
        var keeper = device_controller.getDeviceKeeper();
        keeper.clearRecord();
        $('#device-search-msg').show();
        $('#content-holder').html('');
        var onDevicesLoaded = function(devices) {
            var context = {'connection_types': includeDeviceDisplaySizes(devices)};
            $('#device-search-msg').hide();
            renderTemplate(
                'device_selector.html',
                context,
                CONTENTS_ELEMENT,
                true,
                ['device_selector.css'],
                ['device_selector.js'],
                genericErrorHandler
            );
        };

        var devices = device_controller.getDevices(
            genericErrorHandler,
            onDevicesLoaded
        );
    });

    $('#change-modules-link').click(function () {
        $('#device-nav-dock').slideUp();
        $('#module-list').slideDown();
        $('#close-nav-dock').slideDown();
    });

    $('#close-modules-link').click(function () {
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp();
        $('#close-nav-dock').slideUp();
    });

    $( window ).resize(function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onResized, 16);
    });
    
    // var topPos = $('#module-chrome-contents').position().top;
    // var contents_height = $(window).height() - MODULE_CONTENT_BOTTOM_BORDER_HEIGHT;

    // $('#module-chrome-contents').css(
    //     {'height': contents_height.toString() + 'px'}
    // )
    var windowHeight = $(window).height();
    var contents_height = windowHeight - MODULE_CONTENT_BOTTOM_BORDER_HEIGHT;
    if($('#module-chrome-contents').css('overflow') !== 'hidden') {
        $('#module-list').height((windowHeight - 75).toString() + 'px');
        $('#module-chrome-contents').css(
            {'height': contents_height.toString() + 'px'}
        );
    } else {
        $('#module-chrome-contents').css({'height': '100%'});
    }

    var devices = device_controller.getDeviceKeeper().getDevices()
    
    module_manager.getActiveModules(
        genericErrorHandler,
        function (modules) {
            displayActiveModulesWithEvents(
                modules,
                module_manager.shouldDisplayFuture(devices),
                genericErrorHandler,
                function () {
                    if(START_UP_MODULE_OVERRIDE) {
                        selectModule(START_UP_MODULE_NAME);
                    } else {
                        selectModule(modules[0].name);
                    }
                }
            );
        }
    );
});