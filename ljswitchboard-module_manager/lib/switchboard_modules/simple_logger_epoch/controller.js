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

    var data = [];
    var displayData = [];
    var totalPoints = 300;

    this.allowUpdate = false;
    this.getDataSize = function() {
        return data.length;
    };
    this.getDisplayDataSize = function() {
        return displayData.length;
    };
    var getRandomData = function(numNewDataPoints) {
        var i = 0;

        var numOriginal = data.length;

        for(i = 0; i < numNewDataPoints; i++) {
            data.shift();
            displayData.shift();
        }

        
        var numNew = 0;
        while(data.length < totalPoints) {
            var prev = data.length > 0 ? data[data.length - 1] : 50,
                y = prev + Math.random() * 10 - 5;

            if(y < 0) {
                y = 0;
            } else if (y > 100) {
                y = 100;
            }

            data.push(y);
            numNew += 1;
        }

        

        // var numToRemove = displayData.length - totalPoints;
        // if(numToRemove > 0) {
        //     displayData.
        // }
        // console.log('numNew Vals', numNew);
        for(i = 0; i < numNew; i++) {
            displayData.push([i + numOriginal, data[i]]);
        }
        var numShifted = 0;
        while(displayData.length > totalPoints) {
            displayData.shift(1);
            numShifted += 1;
        }
        // console.log('Shifted...', numShifted, displayData.length);

        // Re-index data
        for(i = 0; i < data.length; i++) {
            displayData[i][0] = i;
        }

        // displayData = [];
        // for(i = 0; i < data.length; i++) {
        //     displayData.push([i, data[i]]);
        // }


        return displayData;
    };

    this.chartUpdateInterval = 1000;
    this.numDataPointsPerUpdate = 1;
    var initializeUpdater = function() {
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
            }
        });
        function update() {
            if(self.allowUpdate) {
                var y = Math.random()*10;

                if(y < 0) {
                    y = 0;
                } else if (y > 10) {
                    y = 10;
                }
                self.addData(y);
                // var newData = getRandomData(self.numDataPointsPerUpdate);
                // self.plot.setData([newData]);

                // Since the axes don't change, we don't need to call plot.setupGrid()

                // self.plot.draw();

                setTimeout(update, self.chartUpdateInterval);
            }
        }

        update();
    };

    this.chartInstance = undefined;
    var initializeFlotPlot = function() {
        var dateInstance = new Date();
        var timeA = dateInstance.getTime();
        var timeB = timeA + 10;
        var timeC = timeB + 10;
        console.log('Times', timeA, timeB, timeC);

        var data = [
          { label: 'Layer 1', values: [ {time: 0, y: 0}, {time: 1, y: 1}, {time: 2, y: 2} ] },
          { label: 'Layer 2', values: [ {time: 0, y: 0}, {time: 1, y: 1}, {time: 2, y: 4} ] }
        ];
        self.chartInstance = $('#area').epoch({
            type: 'time.line',
            data: data,
            axes: ['left', 'right', 'bottom']
        });
    };

    this.numAdded = 3;
    this.addData = function(newVal) {
        self.chartInstance.push([
            {time: self.numAdded, y: newVal},
            {time: self.numAdded, y: newVal + 1}
        ]);
        self.numAdded += 1;
    };
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


    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {

        // self.getRegistersToDisplay()
        // .then(self.getRegistersModbusInfo)
        // .then(self.cachedRegistersToDisplay)
        // .then(self.getInitialDeviceData)
        // .then(function(registers) {
        //     console.log('Registers to display:', registers);
        //     self.moduleContext = {
        //         'activeRegisters': self.getActiveRegistersData(registers)
        //     };
        //     framework.setCustomContext(self.moduleContext);
        //     onSuccess();
        // });
        // framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
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
        self.allowUpdate = true;
        initializeFlotPlot();
        initializeUpdater();
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.allowUpdate = false;
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
