/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.updateTimer = undefined;

    this.graphData = [];
    this.displayData = [];
    var totalPoints = 3000;

    this.allowUpdate = false;
    this.getDataSize = function() {
        return self.graphData.length;
    };
    this.getDisplayDataSize = function() {
        return self.displayData.length;
    };


    function getRandomNumber(previousVal) {
        var newVal = previousVal + Math.random() * 10 - 5;
        if(newVal < 0) {
            newVal = 0;
        } else if(newVal > 100) {
            newVal = 100;
        }
        return newVal;
    }
    function initializeRandomData(length) {
        var dataStore = [[0, 0]];
        var i;
        for(i = 1; i < length; i++) {
            dataStore[i] = [i, getRandomNumber(dataStore[i-1][1])];
        }
        return dataStore;
    }
    function addNewRandomData(dataStore, numNew) {
        var numDataPoints = dataStore.length;
        var lastIndex = numDataPoints - 1;
        var i;


        var indexOffset = numDataPoints - numNew;
        for(i = indexOffset; i < numDataPoints; i++) {
            // Add a new element
            dataStore.push([i, getRandomNumber(dataStore[lastIndex][1])]);

            // Get rid of last element
            dataStore.shift();
        }

        // Re-index data
        for(i = 0; i < totalPoints; i++) {
            dataStore[i][0] = i;
        }
    }

    this.chartUpdateInterval = 10;
    this.numDataPointsPerUpdate = 500;
    this.intervalHandle = undefined;
    this.isUpdating = false;
    this.updatePlot = function() {
        if(self.allowUpdate) {
            if(!self.isUpdating) {
                self.isUpdating = true;

                // Add new random data
                var dataA = self.displayData[0];
                addNewRandomData(dataA, self.numDataPointsPerUpdate);

                self.plot.setData(self.displayData);

                // Since the axes don't change, we don't need to call plot.setupGrid()
                self.plot.draw();

                // if(global.gc) {
                //     if(typeof(global.gc) === 'function') {
                //         global.gc();
                //     }
                // }
                self.isUpdating = false;
            } else {
                console.log('Not Updating..... is still updating...');
            }
        }
    };
    this.initializeIntervalHandle = function() {
        self.allowUpdate = true;
        self.intervalHandle = setInterval(self.updatePlot, self.chartUpdateInterval);
    };
    this.destroyIntervalHandle = function() {
        self.allowUpdate = false;
        clearInterval(self.intervalHandle);
        self.intervalHandle = null;
    };
    function initializeUpdater() {
        $("#updateInterval").val(self.chartUpdateInterval).change(function () {
            var v = $(this).val();
            if (v && !isNaN(+v)) {
                self.chartUpdateInterval = +v;
                if (self.chartUpdateInterval < 1) {
                    self.chartUpdateInterval = 1;
                } else if (self.chartUpdateInterval > 2000) {
                    self.chartUpdateInterval = 2000;
                }
                $(this).val("" + self.chartUpdateInterval);

                self.destroyIntervalHandle();
                self.initializeIntervalHandle();
            }
        });
        self.initializeIntervalHandle();
    }

    this.plot = undefined;
    function initializeFlotPlot() {
        // Initialize data
        self.displayData[0] = initializeRandomData(totalPoints);
        console.error($)
        self.plot = $.plot("#placeholder", self.displayData, {
            series: {
                shadowSize: 0   // Drawing is faster without shadows
            },
            yaxis: {
                min: 0,
                max: 100
            },
            xaxis: {
                show: false
            }
        });
    }
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

        onSuccess();
    };

    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        self.activeDevices = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        onSuccess();
    };

    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        initializeFlotPlot();
        initializeUpdater();

        console.log('Template has loaded!!');
        var ioi = io_manager.io_interface();
        var lc = ioi.getLoggerController();
        console.log('We got the logger controller',lc);
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.destroyIntervalHandle();
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(true);
    };

    var self = this;
}
