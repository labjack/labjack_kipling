/**
 * Logic for the module framework.
 *
 * Logic for the framework and related GUI elements that bootstrap Switchboard
 * modules and allow the user to move between them.
 *
 * @author Sam Pottinger (LabJack Corp, 2013)
 * @contributor Chris Johnson (LabJack, 2014)
 *
 * Requires (from global_requires.js):
 *     device_controller = require('./device_controller');
 *     fs_facade = require('./fs_facade');
**/

// Include module_manager that handles searching through switchboard_modules
// file for code.
var module_manager = require('./module_manager');

var MODULE_TAB_CONTAINER = '#module-list';
var MODULE_TAB_CLASS = 'module-tab';
var MODULE_TAB_ID_POSTFIX = '-module-tab';
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

var LOADED_MODULE_INFO_OBJECT;
var LOADED_MODULE_CONSTANTS_OBJECT;

var MODULE_CONTENT_BOTTOM_BORDER_HEIGHT = 20+10;

var MODULE_WINDOW_RESIZE_LISTNERS = [];

/**
 * Switch the view to the given module.
 *
 * @param {String} name The name of the module to switch the user view to.
**/
function innerSelectModule(name)
{
/*
    if (LOADING_NEW_MODULE) {
        return;
    }
    LOADING_NEW_MODULE = true;
*/
    $('.' + MODULE_TAB_CLASS).removeClass('selected');
    $('#' + name + MODULE_TAB_ID_POSTFIX).addClass('selected');
    $(MODULE_CONTENTS_ELEMENT).empty();
    $(MODULE_CONTENTS_FOOTER).hide();
    $(MODULE_CONTENTS_FOOTER).empty();

    // After deleting module contents, remove any active listeners as there are
    // currently no possible modules that would need to be using this feature.
    clearModuleWindowResizeListners();

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
    var renderNoFrameworkModule = function (thirdPartyJSList) {
        var jsFiles = [jsFile];

        // Add third party js files (if they are defined)
        if(thirdPartyJSList !== undefined) {
            thirdPartyJSList.forEach(function(element, index, array){
                jsFiles.push('third_party_code/'+element);
            });
        }

        //Renders the module, function lives in 'ljswitchboard/src/presenter.js'
        renderTemplate(src, standardContext, MODULE_CONTENTS_ELEMENT, false,
            [cssFile], jsFiles, getCustomGenericErrorHandler('module_chrome-renderNoFrameworkModule'));
    };

    //Function that loads a module with the singleDevice framework
    var renderSingleDeviceFrameworkModule = function (moduleInfo) {
        //Get the file path for the presenter_framework that runs the
        //  singleDevice framework.
        //File is found in the non-compiled switchboard_modules/frameworks
        //  directory.
        var thirdPartyJSList;
        if(typeof(moduleInfo.third_party_code) !== 'undefined') {
            thirdPartyJSList = moduleInfo.third_party_code;
        } else {
            thirdPartyJSList = [];
        }
        var jsLibFiles;
        if(typeof(moduleInfo.jsFiles) !== 'undefined') {
            jsLibFiles = moduleInfo.jsFiles;
        } else {
            jsLibFiles = [];
        }

        var device_constants = SINGLE_DEVICE_FRAMEWORK_DEVICE_CONSTANTS;
        var framework_location = SINGLE_DEVICE_FRAMEWORK_PRESENTER;
        var framework_connector = SINGLE_DEVICE_FRAMEWORK_CONNECTOR;
        var framework_style = SINGLE_DEVICE_FRAMEWORK_CSS;
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
                jsLibFiles.push('../third_party_code/'+element);
            });
        }
        jsLibFiles.forEach(function(element, index, array){
            jsFiles.push(name + '/' + element);
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
            getCustomGenericErrorHandler('module_chrome-renderSingleDeviceFrameworkModule'));
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

            // Look for the devices that should be provided to the module.
            var deviceMatchers = devices.map(function (device) {
                return {
                    matcher: module_manager.createDeviceMatcher(device),
                    device: device
                };
            });
            deviceMatchers = deviceMatchers.filter(function (matcherInfo) {
                return matcherInfo.matcher.matches(moduleInfo);
            });
            devices = deviceMatchers.map( function (x) { return x.device; });

            // Save matching devices back to the module context
            standardContext.devices = devices;

            // Save the module info object
            LOADED_MODULE_INFO_OBJECT = moduleInfo;
            var loadModule = function(moduleConstants) {
                // Save the module constants object
                LOADED_MODULE_CONSTANTS_OBJECT = moduleConstants;
                //Check to see if a framework should be loaded
                if (moduleInfo.framework) {
                    if(moduleInfo.framework === 'singleDevice') {
                        //load the 'singleDevice' framework
                        renderSingleDeviceFrameworkModule(moduleInfo);
                    } else {
                        //if no appropriate framework was found, load as if there
                        //  was no framework requested
                        renderNoFrameworkModule(moduleInfo.third_party_code);
                    }
                } else {
                    //Perform a standard module-load
                    renderNoFrameworkModule(moduleInfo.third_party_code);
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
function selectModule(name) {
    $(MODULE_CONTENTS_ELEMENT).fadeOut(
        100,
        function() {
            innerSelectModule(name);
    });
}


/**
 * Add a new tab for a module to the GUI list of available modules.
 *
 * @param {String} targetElement The jQuery compatible selector for the
 *      element or elements that the tab should be added to.
 * @param {Object} module The information for the module to add a tab for.
**/
function addModuleTab(targetElement, module) {
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
function displayActiveModules(activeModules, matchFunc, onError, onSuccess) {
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
function displayActiveModulesWithEvents(activeModules, matchFunc, onError,onSuccess) {
    displayActiveModules(activeModules.slice(0), matchFunc, onError, function()
    {
        $('.' + MODULE_TAB_CLASS).click(function(event){
            selectModule(event.target.id.replace(MODULE_TAB_ID_POSTFIX, ''));
        });

        if(onSuccess !== undefined)
            onSuccess();
    });
}

/**
 * Global function that can be called by any module if it needs to listen to the
 * window resize listener.  Created because a timer is used to prevent the
 * spamming of the window.resize listener to decrease CPU load & increase
 * performance.
 * @param {string} keyStr       A unique string to be used as a 'key' to
 *                              identify the listener.
 * @param {function} callbackFunc The function that gets called by the resize
 *                                listener.
 */
function addModuleWindowResizeListner(keyStr, callbackFunc) {
    // Make sure that the keyStr is a string and the callbackFunc is a function.    TODO: typeof(keyStr) won't necessairly be a string.  Thanks nodejs...
    if ((typeof(keyStr) === 'string') && (typeof(callbackFunc) === 'function')){
        var origIndex = 0;
        // Figure out if the listener key is already being used.
        var addListener = MODULE_WINDOW_RESIZE_LISTNERS.every(function(listener,index) {
            if (listener.key === keyStr) {
                origIndex = index;
                return false;
            }
            return true;
        });

        if (addListener) {
            // if the key isn't already being used (in the list) add it.
            MODULE_WINDOW_RESIZE_LISTNERS.push({key:keyStr,callback:callbackFunc});
        } else {
            // if the key is already in the list, replace the listener with this
            //  new one
            MODULE_WINDOW_RESIZE_LISTNERS[origIndex] = {key:keyStr,callback:callbackFunc};
        }
    } else {
        // Not able to add the listener due to invalid inputs.
        console.error(
            'module_chrome.js-addModuleWindowResizeListner, invalid inputs',
            'keyStr: ',keyStr,
            'typeof keyStr: ',typeof(keyStr),
            'typeof callbackFunc: ',typeof(callbackFunc)
        );
    }
}

/**
 * Function to be called by the object who registered the listener when its no
 * longer required.
 * @param  {string} keyStr The unique string to identify the listener to be
 *                         removed.
**/
function removeModuleWindowResizeListner(keyStr) {
    // Make sure the keyStr is of type string.  (This may eventually fail, fix later)
    if(typeof(keyStr) === 'string') {
        var origIndex = 0;

        // Check to see if the listener keyStr is in the list.
        var isFound = MODULE_WINDOW_RESIZE_LISTNERS.some(function(listener,index) {
            if (listener.key === keyStr) {
                origIndex = index;
                return true;
            }
            return false;
        });
        if (isFound) {
            // if the listener is found then remove it
            MODULE_WINDOW_RESIZE_LISTNERS.splice(origIndex,1);
        } else {
            // if the listener isn't found then don't remove it.
            console.log('Not Removing Listener',keyStr);
        }
    }else {
        // Not able to add the listener due to invalid inputs.
        console.error(
            'module_chrome.js-removeModuleWindowResizeListner, invalid input',
            'keyStr: ',keyStr,
            'typeof keyStr: ',typeof(keyStr)
        );
    }
}

/**
 * Function that clears the window.resize listeners list.
**/
function clearModuleWindowResizeListners() {
    MODULE_WINDOW_RESIZE_LISTNERS = [];
}

/**
 * Callback that dyanmically handles window resizing.
**/
function onResized()
{
    // in the module_chrome.css file this magic number is 768 & 767
    var moduleList = $('#module-list');
    var reCallFUnc = function() {
            if(moduleList.css('display') !== 'none') {
                onResized();
        }
    };
    if ($(window).width() > 768) {
        $('#close-nav-dock').slideUp();
        $('#device-nav-dock').slideUp(function(){
            $('#module-list').slideDown();
        });
    } else {
        $('#close-nav-dock').slideUp();
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp(reCallFUnc);
    }

    var headerHeight = $('#system-navigation');
    var moduleChromeContentsEl = $('#module-chrome-contents');
    var moduleChromeContentsHolderEl = $('#module-chrome-contents-holder');
    var moduleChromeFooterEl = $('#module-chrome-contents-footer');
    var moduleChromeBodyEl = $('#module-chrome-block');
    var activeModuleEl = moduleChromeContentsEl.children(0);
    var windowHeight = $(window).height();
    var contents_height = windowHeight - MODULE_CONTENT_BOTTOM_BORDER_HEIGHT;

    var setModuleChromeContentsHolderBottom = function() {
        if (moduleChromeFooterEl.css('display') === 'none') {
            moduleChromeContentsHolderEl.css({'bottom':'0px'});
        } else {
            var botTxt = moduleChromeFooterEl.height().toString() + 'px';
            moduleChromeContentsHolderEl.css({'bottom':botTxt});
        }
    };
    // if(moduleList.css('display') !== 'none') {
    if ($(window).width() > 768) {
        contents_height -= moduleChromeFooterEl.height();
        $('#module-list').height((windowHeight - 75).toString() + 'px');
        moduleChromeContentsEl.css(
            {'height': contents_height.toString() + 'px'}
        );
        moduleChromeBodyEl.css(
            {'height': (windowHeight).toString() + 'px'}
        );
        windowHeight -= moduleChromeFooterEl.height();
        moduleChromeContentsHolderEl.css(
            {'height': (windowHeight).toString() + 'px'}
        );
        moduleChromeContentsHolderEl.css({'top':'0px'});
        moduleChromeBodyEl.css({'top':'0px'});
        // setModuleChromeContentsHolderBottom();
    } else {
        // var topHeight = $('#module-chrome-contents-holder').height();
        var setHeight = 0;
        moduleChromeContentsEl.css({'height': '100%'});
        var bodyHeight = activeModuleEl.height();
        var moduleHeight = 9+bodyHeight+20;
        var iconsHeight = $('#system-navigation').height();
        var topHeight = 0;
        try {
            topHeight = $('#module-chrome-contents').children(0).offset().top;
        } catch(e) {
            topHeight = 0;
        }
        if((windowHeight - topHeight + 9) < (moduleHeight)) {
            setHeight = moduleHeight;
        } else {
            setHeight = (windowHeight - topHeight + 9);
        }
        if(setHeight < (windowHeight - 130)){
            setHeight = (windowHeight - 130);
        }
        moduleChromeBodyEl.css({'height': setHeight.toString()+'px'});
        setHeight += moduleChromeFooterEl.height();
        console.log('HERE1',setHeight);
        moduleChromeContentsHolderEl.css(
            {'height': setHeight.toString()+'px'}
        );
        moduleChromeContentsHolderEl.css({'top':'0px'});


        // setModuleChromeContentsHolderBottom();
    }
    if(typeof(MODULE_WINDOW_RESIZE_LISTNERS) !== 'undefined') {
        MODULE_WINDOW_RESIZE_LISTNERS.forEach(function(listener) {
            if(typeof(listener.callback) === 'function') {
                var moduleHeight = moduleChromeContentsEl.height();
                var topPadding = moduleChromeContentsEl.css('padding-top');
                var bottomPadding = moduleChromeContentsEl.css('padding-bottom');

                moduleHeight += parseInt(topPadding.slice(0,topPadding.search('px')));
                moduleHeight += parseInt(bottomPadding.slice(0,bottomPadding.search('px')));

                try {
                    listener.callback(moduleHeight);
                } catch(err) {
                    console.error('Error Calling Window Resize Listner module_chrome.js',err);
                }

            } else {
                console.log('Bad Window Resize Listener Found! (module_chrome.js)',listener);
            }
        });
    } else {
        MODULE_WINDOW_RESIZE_LISTNERS = [];
    }
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
    if(!isNaN(errorMessage)) {
        errorMessage = 'LJM Error ' + device_controller.ljm_driver.errToStrSync(errorMessage);
    }
    var message = 'Sorry, Kipling encountered an error. ' + 'Error: ' + errorMessage;

    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}
function showErrorMessage(message) {
    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}
function showMinAlert(errorMessage) {
    $('#error-display').html(errorMessage);
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
        renderDeviceSelector();
    });

    var updateModuleChromeHeight = function() {
        // var height = $('#system-navigation').height();
        // $('#module-chrome-block').css({'top':height.toString()+'px'});
    };

    $('#change-modules-link').click(function () {
        $('#device-nav-dock').slideUp();
        $('#module-list').slideDown(updateModuleChromeHeight);
        $('#close-nav-dock').slideDown();
    });

    $('#close-modules-link').click(function () {
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp(updateModuleChromeHeight);
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

    var devices = device_controller.getDeviceKeeper().getDevices();

    module_manager.getActiveModules(
        getCustomGenericErrorHandler('module_chrome-ready.getActiveModules'),
        function (modules) {
            displayActiveModulesWithEvents(
                modules,
                module_manager.shouldDisplayFuture(devices),
                getCustomGenericErrorHandler('module_chrome-ready.getActiveModules-callback'),
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

/* Generic error handlers */
window.addEventListener('error',function(errEvent){
    var m;
    m = 'module_chrome.js-uncaughtException: '+ errEvent.message + '/nfilename:"' +
        (errEvent.filename ? errEvent.filename: 'app_front.js') +
        '",line: ' + errEvent.lineno;
    alert(m);
    console.log('m',m);
});
process.on('uncaughtException',function(err){
    console.error('module_chrome.js-uncaughtException:',err);
    console.error(err.stack);
    alert('module_chrome.js-uncaughtException');
});
