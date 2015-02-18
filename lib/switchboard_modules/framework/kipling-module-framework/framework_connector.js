/**
 * Event driven framework for easy module construction.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/

// Check for user disabling automatic framework linking
var autoLinkToFramework = true;
if( typeof(DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE) === "boolean" ) {
    if( DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE === true ) {
        autoLinkToFramework = false;
    }
}

if(autoLinkToFramework) {

// Configure framework with jQueryWrapper
sdFramework._SetJQuery(new JQueryWrapper());

// Create a variable for the user's module
var sdModule = null;
AUTO_ENABLE_TAB_CLICK = false;

try {
    // try and create an instance of the user's module, if it doesn't exist
    // catch the error & produce an error message via 'showAlert'
    sdModule = new module();
    sdFramework.deviceKeeper = device_controller.getDeviceKeeper();
    sdModule.deviceKeeper = device_controller.getDeviceKeeper();
    sdModule.ljmDriver = device_controller.ljm_driver;
    sdModule.sdFramework = sdFramework;

    try {
        // Try and link the framework to the various implemented functions, 
        // if they don't exist don't link them.  If there is an error, show an
        // error via 'showAlert'
        if(typeof(sdModule.onModuleLoaded) === "function") {
            sdFramework.on('onModuleLoaded',sdModule.onModuleLoaded);
        }
        if(typeof(sdModule.onDeviceSelected) === "function") {
            sdFramework.on('onDeviceSelected',sdModule.onDeviceSelected);
        }
        if(typeof(sdModule.onDeviceConfigured) === "function") {
            sdFramework.on('onDeviceConfigured',sdModule.onDeviceConfigured);
        }
        if(typeof(sdModule.onTemplateLoaded) === "function") {
            sdFramework.on('onTemplateLoaded',sdModule.onTemplateLoaded);
        }
        if(typeof(sdModule.onTemplateDisplayed) === "function") {
            sdFramework.on('onTemplateDisplayed',sdModule.onTemplateDisplayed);
        }
        if(typeof(sdModule.onRegisterWrite) === "function") {
            sdFramework.on('onRegisterWrite',sdModule.onRegisterWrite);
        }
        if(typeof(sdModule.onRegisterWritten) === "function") {
            sdFramework.on('onRegisterWritten',sdModule.onRegisterWritten);
        }
        if(typeof(sdModule.onRefresh) === "function") {
            sdFramework.on('onRefresh',sdModule.onRefresh);
        }
        if(typeof(sdModule.onRefreshed) === "function") {
            sdFramework.on('onRefreshed',sdModule.onRefreshed);
        }
        if(typeof(sdModule.onCloseDevice) === "function") {
            sdFramework.on('onCloseDevice',sdModule.onCloseDevice);
        }
        if(typeof(sdModule.onUnloadModule) === "function") {
            sdFramework.on('onUnloadModule',sdModule.onUnloadModule);
        }
        if(typeof(sdModule.onLoadError) === "function") {
            sdFramework.on('onLoadError',sdModule.onLoadError);
        }
        if(typeof(sdModule.onWriteError) === "function") {
            sdFramework.on('onWriteError',sdModule.onWriteError);
        }
        if(typeof(sdModule.onRefreshError) === "function") {
            sdFramework.on('onRefreshError',sdModule.onRefreshError);
        }
        try {
            // Try to configure & start the framework
            
            //Configure framework's update frequency
            if(typeof(MODULE_UPDATE_PERIOD_MS) === "number") {
                sdFramework.setRefreshRate(MODULE_UPDATE_PERIOD_MS);
            }

            //figure out what tab is loaded:
            // var activeTabID = $('.module-tab.selected').attr('id');
            // var tabName = activeTabID.split('-module-tab')[0];
            var tabName = LOADED_MODULE_INFO_OBJECT.name;
            var moduleViewPath = tabName + '/view.html';
            var moduleDataPath = tabName + '/moduleData.json';

            // Configure the framework to use the module's 'view.html' by default
            // Also configure the framework to use module's data, 'moduleData.json'
            sdFramework.configFramework(moduleViewPath);
            sdFramework.configureFrameworkData([moduleDataPath]);

            //Save loaded module data to the framework instance
            sdFramework.saveModuleInfo(
                LOADED_MODULE_INFO_OBJECT,
                LOADED_MODULE_CONSTANTS_OBJECT,
                sdModule
            );

            // Start the framework
            sdFramework.startFramework()
            .then(function() {
                // console.warn('Started FW');
            },function() {
                // console.warn('Failed Starting FW');
            });
            
        } catch (err) {
            showAlert('problems starting framework');
            console.log('Starting Framework Error:',err);
        }
    } catch (err) {
        showAlert('problems linking module to framework');
        console.log('Linking to Framework Error:',err);
    }
} catch (err) {
    showAlert('Object "module" not defined in the "controller.js"' +
        'file which is required when the framework type "singleDevice"' +
        'is being used.');
}

/**
 * Initialization logic for the analog inputs module.
**/
$('#single-device-framework-obj').ready(function(){
    if($('#module-chrome-contents').css('display') === 'none') {
        $('#module-chrome-contents').fadeIn();
    }
    //gives access to device
    var keeper = device_controller.getDeviceKeeper();
    //list of devices
    devices = keeper.getDevices();

    // Check for any load-errors
    var loadErrors = fs_facade.getLoadErrors();
    if(loadErrors.length > 0) {
        loadErrors.forEach(function(data) {
            console.log('Error Data: ', data);
            showCriticalAlert(data);
        });
        var moduleName = LOADED_MODULE_INFO_OBJECT.name;
        showCriticalAlert('Not Starting Module: ' + moduleName);
    } else {
        // Get the active tab ID
        if(sdFramework.moduleName !== getActiveTabID()) {
            console.warn("Shouldn't run FW");
        }
        var getFinish = function(mess) {
            var finishFunc = function() {
                if($('#module-chrome-contents').css('display') === 'none') {
                    $('#module-chrome-contents').fadeIn(function() {
                        unlockModuleLoader();
                    });
                } else {
                    unlockModuleLoader();
                }
            };
            return finishFunc;
        };
        // Run the framework if there aren't any load errors
        sdFramework.runFramework()
        .then(getFinish('Run FW'),getFinish('Failed Running FW'));
    }
});

//End bracket for autoLinkToFramework
}





