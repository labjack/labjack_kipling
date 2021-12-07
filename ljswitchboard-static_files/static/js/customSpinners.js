global.customSpinners = function (owner, infoArray, writeFunc, updateFunc) {
    var maxVal = 10.5;
    var minVal = -0.2;

    var dacListerners = {};
    infoArray.forEach(function(info){
        dacListerners[info.spinnerID] = {};
        dacListerners[info.spinnerID].type = '';
        dacListerners[info.spinnerID].timer = null;
        dacListerners[info.spinnerID].reg = info.reg;
    });
    this.dacListerners = dacListerners;
    this.writeDACSpinner = function(spinner, value) {
        if(value < minVal) {
            value = minVal;
        }
        if(typeof(value) !== 'undefined') {
            spinner.val(value.toFixed(3));
        }
    };
    this.writeSpinner = function(spinner,value) {
        if(value < minVal) {
            value = minVal;
        }
        if(typeof(value) !== 'undefined') {
            spinner.val(value.toFixed(3));
        }
    };
    this.writeDisplayedVoltage = function(register, selectedVoltage) {
        var devEl = $('#' + register + '-device_input_spinner');
        var dbEl = $('#' + register + '_input_spinner');
        self.writeSpinner(devEl,selectedVoltage);
        self.writeSpinner(dbEl,selectedVoltage);
    };
    this.setVoltage = function(event,id,element) {
        var setFunc = function() {
            var type = self.dacListerners[id].type;
            var isWrite = false;
            if (type === 'scroll') {
                element.blur();
                isWrite = true;
            } else if (type === 'enterButton') {
                element.blur();
                isWrite = true;
            } else if (type === 'focusLeft') {
                isWrite = true;
            } else if (type === 'increment') {
                element.blur();
                isWrite = true;
            }
            if(isWrite) {
                var val = element.spinner('value');
                var reg = self.dacListerners[id].reg;
                if(typeof(val) === 'number') {
                    if (val < minVal) {
                        val = minVal;
                    } else if (val > maxVal) {
                        val = maxVal;
                    }
                    self.writeSpinner(element,val);
                    writeFunc(reg,val)
                } else {
                    self.writeSpinner(element,owner.currentValues.get(reg));
                }
                self.dacListerners[id].type = '';
            }
        };
        return setFunc;
    };
    this.onVoltageSelectedSpinStop = function(event) {
        if(typeof(event.currentTarget) !== 'undefined') {
            var targetID = event.currentTarget.id;
            var targetElement = $('#'+targetID);
            if(typeof(self.dacListerners[targetID]) !== 'undefined') {
                clearTimeout(self.dacListerners[targetID].timer);
                self.dacListerners[targetID].timer = setTimeout(
                    self.setVoltage(event,targetID,targetElement),
                    500
                );
                self.spinStopData = event;
            } else {
                var targetElement = event.currentTarget.parentElement.children[0];
                var targetID = targetElement.id;
                var targetObject = $('#'+targetID);
                self.dacListerners[targetID].type = 'increment';
                clearTimeout(self.dacListerners[targetID].timer);
                // Enable this code for timeed blur events for up/down arrows
                self.dacListerners[targetID].timer = setTimeout(
                    self.setVoltage(targetElement,targetID,targetObject),
                    500
                );
                // Enable this code for immediate writes to up/down arrows
                // self.setVoltage(targetElement,targetID,targetObject)();
            }
        }
    };
    this.onVoltageSelectedSpin = function(event) {
        if(typeof(event.currentTarget) !== 'undefined') {
            var targetID = event.currentTarget.id;
            // console.log('id',targetID,event.currentTarget);
            if(typeof(self.dacListerners[targetID]) !== 'undefined') {
                self.dacListerners[targetID].type = 'scroll';
                self.spinData = event;
                if(typeof(updateFunc) !== 'undefined') {
                    var targetElement = $('#'+targetID);
                    var val = targetElement.spinner('value');
                    var reg = self.dacListerners[targetID].reg;
                    updateFunc(reg,val);
                }
            } else {
                var targetElement = event.currentTarget.parentElement.children[0];
                var targetID = targetElement.id;
                self.dacListerners[targetID].type = 'increment';
                self.spinData = $('#'+targetID);
            }
        }
    };
    this.onVoltageSelectedChange = function(event) {
        if(typeof(event.currentTarget) !== 'undefined') {
            var targetID = event.currentTarget.id;
            var targetElement = $('#'+targetID);
            var isFocused = targetElement.is(":focus");
            if(self.dacListerners[targetID].type !== 'scroll') {
                if(self.dacListerners[targetID].type !== 'enterButton') {
                    clearTimeout(self.dacListerners[targetID].timer);
                    if(!isFocused) {
                        self.dacListerners[targetID].type = 'focusLeft';
                        self.setVoltage(event,targetID,targetElement)();
                    }
                }
            }
        }
    };
    this.handleKeypress = function(event) {
        var code = event.keyCode || event.which;
        var targetID = event.currentTarget.id;
        self.dacListerners[targetID].type = 'keyPress';
        clearTimeout(self.dacListerners[targetID].timer);
        if(code == 13) { //Enter keycode
            var targetElement = $('#'+targetID);
            self.dacListerners[targetID].type = 'enterButton';
            clearTimeout(self.dacListerners[targetID].timer);
            self.setVoltage(event,targetID,targetElement)();
        }
    };

    this.createSpinners = function() {
        $( ".spinner" ).unbind();
        $( ".spinner" ).spinner({
            'step': 0.001,
            'numberFormat': "n",
            'max': maxVal,
            'min': minVal,
            'change': self.onVoltageSelectedChange,
            'spin': self.onVoltageSelectedSpin,
            'stop': self.onVoltageSelectedSpinStop
        });
        $( ".spinner" ).bind('keypress', self.handleKeypress);
    };
    var self = this;
};
