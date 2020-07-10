/**
 * Goals for the Network Settings module.
 * This module will give the user the ability to configure Ethernet and WiFi 
 * device settings.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {

    var ENABLE_DEBUG_LOG = true;
    function debugLog() {
        if(ENABLE_DEBUG_LOG) {
            var dataToPrint = [];
            dataToPrint.push('(hello_world.js)');
            for(var i = 0; i < arguments.length; i++) {
                dataToPrint.push(arguments[i]);
            }
            console.log.apply(console, dataToPrint);
        }
    }

    this.debug_validators = false;
    
    this.moduleConstants = {};
    this.configOnlyRegisters = {};
    this.ethernetRegisters = {};
    this.wifiRegisters = {};
    this.ethernetStatusRegisters = {};
    this.wifiStatusRegisters = {};

    this.moduleContext = {};
    this.templates = {};
    this.moduleData = undefined;

    this.activeDevice = undefined;
    this.connectionType = -1;

    this.isEthernetConnected = false;
    this.isWifiConnected = false;

    this.refreshEthernetInfo = false;
    this.refreshWifiInfo = false;

    this.currentValues = dict();
    this.bufferedValues = dict();

    this.dhcpText = ['Manual','Use DHCP'];

    this.saveBufferedValue = function(address,value,formattedVal) {
        self.bufferedValues.set(address,{val:value,fVal:formattedVal});
    };
    this.commitBufferedValues = function(address,value,formattedVal) {
        self.bufferedValues.forEach(function(data,name){
            self.currentValues.set(name,data);
        });
    };
    this.saveConfigResult = function(address, value, status) {
        if(status === 'success') {
            if(address === 'WIFI_SSID') {
                if(value !== '') {
                    self.currentValues.set(address,value);
                } else {
                    self.currentValues.set(address,{val:null,fVal:null,status:'error'});
                }
            } else {
                self.currentValues.set(address,value);
            }
        } else {
            self.currentValues.set(address,{val:null,fVal:null,status:'error'});
        }
    };
    this.saveCurrentValue = function(address,value,formattedVal) {
        self.currentValues.set(address,{val:value,fVal:formattedVal});
    };

    this.formatIPAddress = function(info) {
        var ipAddress = info.value;
        var ipString = "";
        ipString += ((ipAddress>>24)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress>>16)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress>>8)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress)&0xFF).toString();
        return ipString;
    };
    this.unformatIPAddress = function(ipString) {
        var value = 0;
        var stringArray = ipString.split('.');
        value += stringArray[0] << 24;
        value += stringArray[1] << 16;
        value += stringArray[2] << 8;
        value += stringArray[3];
        return value;
    };
    this.dot2num = function(dot) {
        var d = dot.split('.');
        return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
    };
    this.formatStatus = function(info) {
        var status = info.value;
        var statusString = "";
        if(status > 0) {
            statusString = "Enabled";
        } else {
            statusString = "Disabled";
        }
        return statusString;
    };
    // Test function for trying to get WiFi module to report RSSI;
    this.sendUDPMessage = function() {
        try {
            var dgram = require('dgram');
            // var message = new Buffer('Some bytes');
            // var message = Buffer.from('Some bytes');
            var client = dgram.createSocket('udp4');

            var message = 'Some Bytes';
            var ip = self.currentValues.get('WIFI_IP').fVal;
            client.send(message,0,message.length,5002,ip, function(err) {
                client.close();
            });
        } catch(err) {
             console.log('err',err);
        }
    };
    this.formatRSSI = function(info) {
        var rssi = info.value;
        var rssiString = "";
        rssiString = rssi.toString() + "dB";
        return rssiString;
    };
    this.formatWifiStatus = function(info) {
        var status = info.value;
        var statusString = {
            2900: 'Associated',
            2901: 'Associating',
            2902: 'Association Failed',
            2903: 'Un-Powered',
            2904: 'Booting Up',
            2905: 'Could Not Start',
            2906: 'Applying Settings',
            2907: 'DHCP Started',
            2908: 'Unknown',
            2909: 'Other'
        }[status];
        if (statusString === undefined) {
            statusString = "Status Unknown";
        }
        return statusString + ' ('+status.toString()+')';
    };
    this.hideEthernetAlerts = function() {
        $('#ethernet_settings .configSettingsTable .alert').hide();
    };
    this.selectivelyShowEthernetAlerts = function() {
        var elements = $('#ethernet_settings .configSettingsTable .networkSetting input');
        elements.trigger('change');
    };
    this.showManualEthernetSettings = function() {
        $('#ethernet_settings .Auto_Value').hide();
        $('#ethernet_settings .Manual_Value').show();
        var dhcpToggleEl = $('#ethernet-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#ethernet-DHCP-Select-Toggle #Ethernet_DHCP_Manual').text());
        self.selectivelyShowEthernetAlerts();
    };
    this.showAutoEthernetSettings = function() {
        $('#ethernet_settings .Manual_Value').hide();
        $('#ethernet_settings .Auto_Value').show();
        var dhcpToggleEl = $('#ethernet-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#ethernet-DHCP-Select-Toggle #Ethernet_DHCP_Auto').text());
        self.hideEthernetAlerts();
    };
    this.setEthernetSettings = function(mode) {
        if(mode === 'auto') {
            self.showAutoEthernetSettings();
        } else {
            self.showManualEthernetSettings();
        }
    };
    this.toggleEthernetSettings = function() {
        if($('#ethernet_settings .Manual_Value').css('display') === 'none') {
            self.showManualEthernetSettings();
        } else {
            self.showAutoEthernetSettings();
        }
    };
    this.hideWifiAlerts = function() {
        $('#wifi_settings .wifiConfigSettingsTable .alert').hide();
    };
    this.selectivelyShowWifiAlerts = function() {
        var elements = $('#wifi_settings .configSettingsTable .networkSetting input');
        elements.trigger('change');
    };
    this.updateInput = function(element, value) {
        var isFocused = element.is(":focus");
        if(isFocused) {
            // don't update the element
        } else {
            // Update the element
            element.val(value);
        }
    };
    this.updateDetailedStatusTable = function(type) {
        var list = [];
        if(type === 'wifi') {
            list = self.getOrganizedWiFiIPSettingsRegList();
        } else {
            list = self.getOrganizedEthernetIPSettingsRegList();
        }
        list.forEach(function(reg) {
            var curVal = self.currentValues.get(reg.current.reg).fVal;
            var defVal = self.currentValues.get(reg.default.reg).fVal;
            var curEl = $('#CURRENT_VAL_'+reg.current.reg);
            var defEl = $('#DEFAULT_VAL_'+reg.current.reg);

            curEl.text(curVal);
            defEl.text(defVal);
        });
    };
    this.updateIPSettings = function(type) {
        debugLog('Updating IP Settings',type);
        var list = [];
        if(type === 'wifi') {
            list = self.getWiFiIPRegisterList();
        } else {
            list = self.getEthernetIPRegisterList();
        }
        list.forEach(function(reg) {
            var strVal = self.currentValues.get(reg).fVal;
            var autoEl = $('#'+reg+'_VAL .'+reg+'_AUTO_VAL');
            var manEl = $('#'+reg+'_VAL .'+reg+'_MAN_VAL');

            autoEl.text(strVal);
            // manEl.attr('placeholder',strVal);
            self.updateInput(manEl, strVal);
        });
        
        try {
            self.updateDetailedStatusTable(type);
        } catch(err) {
            console.error('err updating detailed status table:',err);
        }
    };
    this.updateEthernetSettings = function() {
        var dhcpDefault = self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val;
        var dhcp = self.currentValues.get('ETHERNET_DHCP_ENABLE').val;

        var dhcpTextEl = $('#ethernet-DHCP-Select-Toggle .btnText');
        // dhcpTextEl.text(self.dhcpText[dhcpDefault]);
        // if(dhcpDefault === 0) {
        //     self.showManualEthernetSettings();
        // } else {
        //     self.showAutoEthernetSettings();
        // }
        self.updateIPSettings('ethernet');
    };
    this.updateWifiSettings = function() {
        var wifiSSID = self.currentValues.get('WIFI_SSID').val;
        var dhcpDefault = self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val;
        

        var ssidEl = $('#WIFI_SSID_DEFAULT_VAL .WIFI_SSID_DEFAULT_AUTO_VAL');
        // ssidEl.val('');
        ssidEl.attr('placeholder',wifiSSID);
        // ssidEl.trigger('change');

        var dhcpTextEl = $('#wifi-DHCP-Select-Toggle .btnText');
        // dhcpTextEl.text(self.dhcpText[dhcpDefault]);
        // if(dhcpDefault === 0) {
        //     self.showManualWifiSettings();
        // } else {
        //     self.showAutoWifiSettings();
        // }
        var wifiPower = self.currentValues.get('POWER_WIFI').val;
        if(wifiPower === 0) {
            self.saveCurrentValue('WIFI_IP',0,'0.0.0.0');
            self.saveCurrentValue('WIFI_SUBNET',0,'0.0.0.0');
            self.saveCurrentValue('WIFI_GATEWAY',0,'0.0.0.0');
        }
        self.updateIPSettings('wifi');
    };
    this.showManualWifiSettings = function() {
        $('#wifi_settings .Auto_Value').hide();
        $('#wifi_settings .Manual_Value').show();
        var dhcpToggleEl = $('#wifi-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#wifi-DHCP-Select-Toggle #WiFi_DHCP_Manual').text());
        self.selectivelyShowWifiAlerts();
        KEYBOARD_EVENT_HANDLER.initInputListeners();
    };
    this.showAutoWifiSettings = function() {
        $('#wifi_settings .Manual_Value').hide();
        $('#wifi_settings .Auto_Value').show();
        var dhcpToggleEl = $('#wifi-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#wifi-DHCP-Select-Toggle #WiFi_DHCP_Auto').text());
        self.hideWifiAlerts();
    };
    this.setWifiSettings = function(mode) {
        if(mode === 'auto') {
            self.showAutoWifiSettings();
        } else {
            self.showManualWifiSettings();
        }
    };
    this.toggleWifiSettings = function() {
        if($('#wifi_settings .Manual_Value').css('display') === 'none') {
            self.showManualWifiSettings();
        } else {
            self.showAutoWifiSettings();
        }
    };
    this.buildJqueryIDStr = function(idStr) {
        var jqueryStr = "";
        if(idStr.indexOf('#') === 0) {
            jqueryStr = idStr;
        } else {
            jqueryStr = "#"+idStr;
        }
        return jqueryStr;
    };
    this.buildJqueryClassStr = function(idStr) {
        var jqueryStr = "";
        if(idStr.indexOf('.') === 0) {
            jqueryStr = idStr;
        } else {
            jqueryStr = "."+idStr;
        }
        return jqueryStr;
    };
    this.setAutoVal = function(settingID,val) {
        var autoValEl = $(self.buildJqueryIDStr(settingID) + '.Auto_Value');
        autoValEl.text(val);
    };
    this.getAutoVal = function(settingID) {
        var autoValEl = $(self.buildJqueryIDStr(settingID) + '.Auto_Value');
        return {value:autoValEl.text()};
    };
    this.setManualVal = function(settingID, val) {
        var manStr = " .Manual_Value input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);

        // manualValEl[0].value = val;
        self.updateInput(manualValEl, val);
    };
    this.getManualVal = function(settingID) {
        var manStr = "  .Manual_Value input";
        // console.log('Element String', self.buildJqueryIDStr(settingID) + manStr);
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var value = "";
        var isNew = false;
        if(manualValEl.hasClass('inputVerified')) {
            value = manualValEl.val();
            isNew = true;
        } else {
            // value = manualValEl[0].placeholder;
            value = manualValEl.val();
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.getDHCPVal = function(settingID) {
        var manStr = " .btnText";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var dhcpValues = {};
        dhcpValues[self.dhcpText[0]] = 0;
        dhcpValues[self.dhcpText[1]] = 1;
        
        var strVal = manualValEl.text();
        var value = "";
        var isNew = false;

        if(manualValEl.hasClass('inputVerified')) {
            value = dhcpValues[strVal];
            isNew = true;
        } else {
            value = dhcpValues[strVal];
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.getToggleVal = function(settingID) {
        var manStr = " input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var value = "";
        var isNew = false;
        if(manualValEl.hasClass('inputVerified')) {
            value = manualValEl.val();
            isNew = true;
        } else {
            value = manualValEl[0].placeholder;
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.getInputVal = function(settingID) {
        var manStr = " input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var value = "";
        var isNew = false;
        if(manualValEl.hasClass('inputVerified')) {
            value = manualValEl.val();
            isNew = true;
        } else {
            // value = manualValEl[0].placeholder;
            value = manualValEl.val();
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.setInputVal = function(settingID, val) {
        var manStr = " input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        // manualValEl.val(val);
        self.updateInput(manualValEl, val);
    };
    this.setNetworkName = function(networkName) {
        self.setInputVal('#WIFI_SSID_DEFAULT_VAL',networkName);
    };
    this.setWifiPassword = function(password) {
        self.setInputVal('#WIFI_PASSWORD_DEFAULT_VAL',password);
    };
    this.clearManualVal = function(settingID) {
        var manStr = " .Manual_Value input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        manualValEl.val('');
        manualValEl.trigger('change');
    };
    this.getIPRegisters = function(constList, attribute) {
        var regList = [];
        constList.forEach(function(reg) {
            var initValObj = self.currentValues.get(reg.name);
            if(initValObj !== null) {
                reg.initVal = initValObj.fVal;
            }
            if ((reg.type === 'ip') && (reg.isConfig)){
                if ((attribute === '')||(typeof(attribute) === 'undefined')) {
                    regList.push(reg);
                } else {
                    regList.push(reg[attribute]);
                }
            }
        });
        return regList;
    };
    this.getOrganizedIPSettingsRegisterList = function(constList) {
        var regList = [];
        var curDevType = self.activeDevice.savedAttributes.deviceTypeName;
        constList.forEach(function(reg) {
            var info = JSON.parse(JSON.stringify(reg));
            info.current.val = "0.0.0.0";
            info.default.val = "0.0.0.0";

            var currentStateVal = self.currentValues.get(reg.current.reg);
            if(currentStateVal !== null) {
                info.current.val = currentStateVal.fVal;
            }
            var defaultStateVal = self.currentValues.get(reg.default.reg);
            if(defaultStateVal !== null) {
                info.default.val = defaultStateVal.fVal;
            }

            if(reg.deviceTypes.indexOf(curDevType) >= 0) {
                regList.push(info);
            }
        });
        return regList;
    };
    this.getOrganizedEthernetIPSettingsRegList = function() {
        return self.getOrganizedIPSettingsRegisterList(self.ethernetStatusRegisters);
    };
    this.getOrganizedWiFiIPSettingsRegList = function() {
        return self.getOrganizedIPSettingsRegisterList(self.wifiStatusRegisters);
    };
    this.getWiFiIPRegisterList = function() {
        return self.getIPRegisters(self.wifiRegisters,'name');
    };
    this.getEthernetIPRegisterList = function() {
        return self.getIPRegisters(self.ethernetRegisters,'name');
    };
    this.clearNewEthernetSettings = function() {
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.clearManualVal(regName+'_VAL');
        });
    };

    this.getNewEthernetSettings = function() {
        var newEthernetSettingRegs = [];
        var newEthernetSettingVals = [];
        var ethernetSettingRegs = [];
        var ethernetSettingVals = [];
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.getManualVal(regName+'_VAL');
            // console.log('Getting Ethernet IP Data', regName, configData);
            var ipVal = parseInt(self.dot2num(configData.value));
            if(configData.isNew) {
                newEthernetSettingRegs.push(regName+'_DEFAULT');
                newEthernetSettingVals.push(ipVal);
            }
            ethernetSettingRegs.push(regName+'_DEFAULT');
            ethernetSettingVals.push(ipVal);
        });
        var dhcpSetting = self.getDHCPVal('#ethernetDHCPSelect');
        if(dhcpSetting.isNew) {
            newEthernetSettingRegs.push('ETHERNET_DHCP_ENABLE_DEFAULT');
            newEthernetSettingVals.push(dhcpSetting.value);
        }
        ethernetSettingRegs.push('ETHERNET_DHCP_ENABLE_DEFAULT');
        ethernetSettingVals.push(dhcpSetting.value);
        return {
            newRegisters: newEthernetSettingRegs,
            newValues: newEthernetSettingVals,
            registers: ethernetSettingRegs,
            values: ethernetSettingVals
        };
    };
    this.getNewWifiSettings = function() {
        var newWifiSettingRegs = [];
        var newWifiSettingVals = [];
        var wifiSettingRegs = [];
        var wifiSettingVals = [];
        self.getWiFiIPRegisterList().forEach(function(regName){
            var configData = self.getManualVal(regName+'_VAL');
            var ipVal = parseInt(self.dot2num(configData.value));
            if(configData.isNew) {
                newWifiSettingRegs.push(regName+'_DEFAULT');
                newWifiSettingVals.push(ipVal);
            }
            wifiSettingRegs.push(regName+'_DEFAULT');
            wifiSettingVals.push(ipVal);
        });
        var dhcpSetting = self.getDHCPVal('#wifiDHCPSelect');
        if(dhcpSetting.isNew) {
            newWifiSettingRegs.push('WIFI_DHCP_ENABLE_DEFAULT');
            newWifiSettingVals.push(dhcpSetting.value);
        }
        wifiSettingRegs.push('WIFI_DHCP_ENABLE_DEFAULT');
        wifiSettingVals.push(dhcpSetting.value);
        return {
            newRegisters: newWifiSettingRegs, 
            newValues: newWifiSettingVals,
            registers: wifiSettingRegs,
            values: wifiSettingVals
        };
    };
    this.resetAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertEl.hide();
        alertMessageEl.removeClass('icon-close');
        alertMessageEl.addClass('icon-checkmark-3');
        alertEl.removeClass('alert-block');
        alertEl.addClass('alert-success');
        alertEl.attr('title',"Valid IP Address");
        inputTextEl.removeClass('inputVerified');
    };
    this.showInvalidAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertMessageEl.addClass('icon-close');
        alertEl.addClass('alert-block');
        alertEl.attr('title',"Invalid IP Address");
        inputTextEl.removeClass('inputVerified');
        alertEl.show(); 
    };
    this.showValidAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertMessageEl.addClass('icon-checkmark-3');
        alertEl.addClass('alert-success');
        alertEl.attr('title',"Valid IP Address");
        inputTextEl.addClass('inputVerified');
        alertEl.show();
    };
    this.updateValidationStatus = function(isValid,classId,applyButtonId) {
        if(isValid) {
            var numInvalid = $('#'+classId+' .icon-close').length;
            var numNew = $('#'+classId+' .inputVerified').length;
            if((numInvalid === 0) && (numNew > 0)) {
                $('#'+applyButtonId+'').removeAttr('disabled');
            } else {
                $('#'+applyButtonId+'').attr('disabled','disabled');
            }
        } else {
            $('#'+applyButtonId+'').attr('disabled','disabled');
        }
    };
    this.updateWifiValidationStatus = function(isValid) {
        self.updateValidationStatus(isValid,'wifi_settings','wifiApplyButton');
    };
    this.ipAddressValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        var isValid = true;

        var currentRegister = settingID.split('_VAL')[0];
        var currentValue = self.currentValues.get(currentRegister).fVal;
        if(self.debug_validators) {
            console.info('in ipAddressValidator', currentValue, inputText);
        }

        if(inputText !== currentValue) {
            // Remove Existing styles 
            alertMessageEl.removeClass('icon-checkmark-3');
            alertEl.removeClass('alert-success');
            alertMessageEl.removeClass('icon-close');
            alertEl.removeClass('alert-block');
            alertEl.removeAttr('title');
            inputTextEl.removeClass('inputVerified');

            // Add appropriate styles
            if(inputText.match(ipformat))  {
                self.showValidAlertIcon(alertEl,inputTextEl);
                if(settingID === 'ETHERNET_IP_VAL') {
                    if(inputText === '0.0.0.0') {
                        isValid = false;
                    }
                } else {
                    isValid = true;
                }
            } else {
                self.showInvalidAlertIcon(alertEl,inputTextEl);
                isValid = false;
            } 
        } else {
            self.resetAlertIcon(alertEl,inputTextEl);
            isValid = true;
        }
        if (settingID.search('ETHERNET') >= 0 ) {
            self.updateValidationStatus(isValid,'ethernet_settings','ethernetApplyButton');
        } else {
            self.updateWifiValidationStatus(isValid);
        }
        inputTextEl.blur();
    };
    this.networkNameValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        inputTextEl.removeClass('inputVerified');

        var currentRegister = settingID.split('_VAL')[0];
        var currentValue = self.currentValues.get(currentRegister).fVal;
        if(self.debug_validators) {
            console.info('in networkNameValidator', currentValue, inputText);
        }

        if(inputText !== currentValue) {
            if(true) {
                alertMessageEl.removeClass('icon-close');
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.removeClass('alert-block');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Valid Input');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            alertEl.hide();
            // alertMessageEl.removeClass('icon-checkmark-3');
            // alertMessageEl.addClass('icon-close');
            alertMessageEl.removeClass('icon-close');
            alertMessageEl.addClass('icon-checkmark-3');
            alertEl.addClass('alert-success');
            // alertEl.removeClass('alert-block');
            alertEl.attr('title','Valid Input');
            inputTextEl.removeClass('inputVerified');
            isValid = true;
        }
        self.updateWifiValidationStatus(isValid);
        inputTextEl.blur();
    };
    this.networkPasswordValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        inputTextEl.removeClass('inputVerified');
        var currentRegister = settingID.split('_VAL')[0];
        var currentValue = self.currentValues.get(currentRegister);
        if(self.debug_validators) {
            console.info('in networkPasswordValidator', currentValue, inputText);
        }

        if(inputText !== "") {
            if(true) {
                alertMessageEl.removeClass('icon-close');
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.removeClass('alert-block');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Password Required Before Applying Settings');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            // alertMessageEl.removeClass('icon-checkmark-3');
            // alertMessageEl.addClass('icon-close');
            alertMessageEl.removeClass('icon-close');
            alertMessageEl.addClass('icon-checkmark-3');
            alertEl.removeClass('alert-success');
            alertEl.addClass('alert-block');
            // alertEl.removeClass('alert-block');
            // alertEl.addClass('alert-success');
            alertEl.attr('title','Password Required Before Applying Settings, Currently Blank');
            // inputTextEl.removeClass('inputVerified');
            inputTextEl.addClass('inputVerified');
            alertEl.show();
            isValid = true;
        }
        self.updateWifiValidationStatus(isValid);
        inputTextEl.blur();
    };
    this.attachIPInputValidators = function() {
        var inputElements = $('.networkSetting .ipAddress');
        inputElements.bind('change',self.ipAddressValidator);
        // console.log('attaching validators',inputElements);
    };
    this.attachNetworkNameValidator = function() {
        var networkNameEl = $('#WIFI_SSID_DEFAULT_VAL input');
        // console.log('attaching validator...',networkNameEl);
        networkNameEl.bind('change',self.networkNameValidator);
    };
    this.attachNetworkPasswordValidator = function() {
        var networkPasswordEl = $('#WIFI_PASSWORD_DEFAULT_VAL input');
        // console.log('attaching validator...',networkPasswordEl);
        networkPasswordEl.bind('change',self.networkPasswordValidator);
    };
    this.attachInputValidators = function() {
        self.attachIPInputValidators();
        self.attachNetworkNameValidator();
        self.attachNetworkPasswordValidator();
    };
    this.ethernetPowerButton = function(data, onSuccess) {
        // console.log('in ethernetPowerButton listener');
        self.refreshEthernetInfo = true;
        var getEthernetResFunc = function(val,type) {
            var messages = [
                {'success':'disable ethernet success','err':'disable ethernet error'},
                {'success':'enable ethernet success','err':'enable ethernet error'}
            ];
            var fValStr = ['Disabled','Enabled'];
            var btnText = ['Turn Ethernet On','Turn Ethernet Off'];
            return function(result) {
                // console.log(messages[val][type],result);
                self.saveCurrentValue('POWER_ETHERNET',val,fValStr[val]);
                self.saveCurrentValue('POWER_ETHERNET_DEFAULT',val,fValStr[val]);
                $('#ethernetPowerButton .buttonText').text(btnText[val]);
                onSuccess();
            };
        };
        var curStatus = sdModule.currentValues.get('POWER_ETHERNET').val;
        // console.log('in ethernetPowerButton',curStatus);
        if(curStatus === 0) {
            self.activeDevice.iWriteMany(
                ['POWER_ETHERNET','POWER_ETHERNET_DEFAULT'],
                [1,1]
            )
            .then(getEthernetResFunc(1,'success'),getEthernetResFunc(1,'err'));
        } else {
            self.activeDevice.iWriteMany(
                ['POWER_ETHERNET','POWER_ETHERNET_DEFAULT'],
                [0,0]
            )
            .then(getEthernetResFunc(0,'success'),getEthernetResFunc(0,'err'));
        }
    };
    this.showEthernetDHCPChanged = function() {
        $('#ethernetDHCPSelect .dhcpAlert').show();
    };
    this.hideEthernetDHCPChanged = function() {
        $('#ethernetDHCPSelect .dhcpAlert').hide();
    };
    this.showWifiDHCPChanged = function() {
        $('#wifiDHCPSelect .dhcpAlert').show();
    };
    this.hideWifiDHCPChanged = function() {
        $('#wifiDHCPSelect .dhcpAlert').hide();
    };
    this.toggleDHCP = function() {
        var isEthernet = $('#ethernetDHCPSelect .dhcpAlert').css('display');
        var isWifi = $('#wifiDHCPSelect .dhcpAlert').css('display');
        if(isEthernet === 'none') {
            self.showEthernetDHCPChanged();
        } else {
            self.hideEthernetDHCPChanged();
        }
        if(isWifi === 'none') {
            self.showWifiDHCPChanged();
        } else {
            self.hideWifiDHCPChanged();
        }
    };
    this.ethernetDHCPSelect = function(data, onSuccess) {
        // console.log('in ethernetDHCPSelect listener',data.eventData);
        var dhcpOption = data.eventData.toElement.id;
        var dhcpTextId;
        var dhcpTextEl;

        if (dhcpOption === 'Ethernet_DHCP_Auto') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showAutoEthernetSettings();
            if(self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val === 0) {
                self.showEthernetDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            } else {
                self.hideEthernetDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            }
            self.updateValidationStatus(true,'ethernet_settings','ethernetApplyButton');
        } else if (dhcpOption === 'Ethernet_DHCP_Manual') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showManualEthernetSettings();
            if(self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val === 0) {
                self.hideEthernetDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            } else {
                self.showEthernetDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            }
            self.updateValidationStatus(true,'ethernet_settings','ethernetApplyButton');
        }
        onSuccess();
    };
    this.qPowerCycleEthernet = function() {
        var ioDeferred = q.defer();
        self.activeDevice.iWriteMany(
            ['POWER_ETHERNET','POWER_ETHERNET'],
            [0,1]
        );
        
        ioDeferred.resolve();
        return ioDeferred.promise;
    };
    this.powerCycleEthernet = function() {
        self.qPowerCycleEthernet()
        .then(function() {
            console.log('Success!');
        }, function(err) {
            console.log('err',err);
        });
    };
    this.ethernetApplyButton = function(data, onSuccess) {
        console.log('in ethernetApplyButton listener');
        var configData = self.getNewEthernetSettings();
        var newNames = configData.newRegisters;
        var newVals = configData.newVals;
        var names = configData.registers;
        var vals = configData.values;

        var applySettings = false;
        var ioError = function(err) {
            var ioDeferred = q.defer();
            if(typeof(err) === 'number') {
                console.log(self.ljmDriver.errToStrSync(err));
            } else {
                console.log('Ethernet Applying Settings Error',err);
            }
            ioDeferred.resolve();
            return ioDeferred.promise;
        };
        var writeSettings = function() {
            var ioDeferred = q.defer();
            if(newNames.length > 0) {
                applySettings = true;
                // console.log('Writing',names,vals);
                self.activeDevice.iWriteMany(names,vals)
                .then(function() {
                    // console.log('Finished Writing Ethernet Settings');
                    ioDeferred.resolve();
                }, function() {
                    ioDeferred.reject();
                });
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var applyEthernetSettings = function() {
            var ioDeferred = q.defer();
            var promise;
            var useApply = true;
            if(useApply) {
                promise = self.activeDevice.iWrite('ETHERNET_APPLY_SETTINGS', 0);
            } else {
                promise = self.activeDevice.iWriteMany(
                ['POWER_ETHERNET','POWER_ETHERNET'],
                [0,1]);
            }
            promise.then(function(){
                // console.log('Successfully configured ethernet',names,vals);
                ioDeferred.resolve();
            },function(err){
                console.log('Error configuring Ethernet...',err);
                ioDeferred.reject(err);
            });
            return ioDeferred.promise;
        };
        writeSettings()
        .then(applyEthernetSettings,ioError)
        // self.activeDevice.iWriteMany(newNames,newVals)
        .then(function() {
            names.forEach(function(name,index) {
                var stringVal = '';
                if(name === 'ETHERNET_DHCP_ENABLE_DEFAULT') {
                    if(vals[index] === 0) {
                        stringVal = 'Disabled';
                    } else {
                        stringVal = 'Enabled';
                    }
                } else {
                    stringVal = self.formatIPAddress({value:vals[index]});
                }
                self.saveCurrentValue(name,vals[index],stringVal);
            });
            self.clearEthernetInputs();
            onSuccess();
        },function(err) {
            console.log('Error Applying Ethernet Settings',err);
            onSuccess();
        });
    };
    this.ethernetCancelButton = function(data, onSuccess) {
        console.log('in ethernetCancelButton listener');
        var dhcp = self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val;
        var buttonText = self.dhcpText[dhcp];
        $('#ethernetDHCPSelect .btnText').text(buttonText);
        if(dhcp === 0) {
            self.showManualEthernetSettings();
        } else {
            self.showAutoEthernetSettings();
        }
        self.clearEthernetInputs();
        onSuccess();
    };
    this.ethernetHelpButton = function(data, onSuccess) {
        console.log('in wifiHelpButton listener');
        // gui.Shell.openExternal("https://labjack.com/support/app-notes/basic-networking-troubleshooting");
        gui.Shell.openExternal("https://labjack.com/support/app-notes/wifi-and-ethernet-t7-t4-t7-pro");
        onSuccess();
    };
    this.updateActiveEthernetSettings = function() {
        var innerDeferred = q.defer();
        var wifiIPRegisters = self.getEthernetIPRegisterList();
        var newNames = [];
        var newVals = [];
        var getErrHandle = function(step) {
            return function() {
                var ioDeferred = q.defer();
                console.log('Read Error',step);
                ioDeferred.resolve();
                return ioDeferred.promise;
            };
        };
        var readAndSaveInfo = function() {
            var ioDeferred = q.defer();
            self.activeDevice.sReadMany(wifiIPRegisters)
            .then(function(newResults) {
                var results = newResults.map(function(newResult) {
                    return newResult.res;
                });
                newNames = newNames.concat(wifiIPRegisters);
                newVals = newVals.concat(results);
                results.forEach(function(result,index) {
                    var ipStr = self.formatIPAddress({value:result});
                    self.saveCurrentValue(
                        wifiIPRegisters[index],
                        result,
                        ipStr
                    );
                });
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        var readAndSaveDHCP = function() {
            var ioDeferred = q.defer();
            self.activeDevice.qRead('ETHERNET_DHCP_ENABLE')
            .then(function(result) {
                newNames = newNames.concat('ETHERNET_DHCP_ENABLE');
                newVals = newVals.concat(result);
                var strRes = 'Enabled';
                if(result === 0) {
                    strRes = 'Disabled';
                }
                self.saveCurrentValue(
                    'ETHERNET_DHCP_ENABLE',
                    result,
                    strRes
                );
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        readAndSaveInfo()
        .then(readAndSaveDHCP,getErrHandle('readAndSaveInfo'))
        .then(function() {
            // console.log('Ethernet Status Regs Updated',newNames,newVals);
            innerDeferred.resolve();
        },getErrHandle('readAndSaveDHCP'))
        .then(function() {
            innerDeferred.resolve();
        },innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.updateActiveWifiSettings = function() {
        var innerDeferred = q.defer();
        var wifiIPRegisters = self.getWiFiIPRegisterList();
        var newNames = [];
        var newVals = [];
        var getErrHandle = function(step) {
            return function() {
                var ioDeferred = q.defer();
                console.log('Read Error',step);
                ioDeferred.resolve();
                return ioDeferred.promise;
            };
        };
        var readAndSaveInfo = function() {
            var ioDeferred = q.defer();
            self.activeDevice.sReadMany(wifiIPRegisters)
            .then(function(newResults) {
                var results = newResults.map(function(newResult) {
                    return newResult.res;
                });
                newNames = newNames.concat(wifiIPRegisters);
                newVals = newVals.concat(results);
                results.forEach(function(result,index) {
                    var ipStr = self.formatIPAddress({value:result});
                    self.saveCurrentValue(
                        wifiIPRegisters[index],
                        result,
                        ipStr
                    );
                });
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        var readAndSaveSSID = function() {
            var ioDeferred = q.defer();
            self.activeDevice.qRead('WIFI_SSID')
            .then(function(result) {
                newNames = newNames.concat('WIFI_SSID');
                newVals = newVals.concat(result);
                self.saveCurrentValue(
                    'WIFI_SSID',
                    result,
                    result
                );
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        var readAndSaveDHCP = function() {
            var ioDeferred = q.defer();
            self.activeDevice.qRead('WIFI_DHCP_ENABLE')
            .then(function(result) {
                newNames = newNames.concat('WIFI_DHCP_ENABLE');
                newVals = newVals.concat(result);
                var strRes = 'Enabled';
                if(result === 0) {
                    strRes = 'Disabled';
                }
                self.saveCurrentValue(
                    'WIFI_DHCP_ENABLE',
                    result,
                    strRes
                );
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        var readAndSaveRSSI = function() {
            var ioDeferred = q.defer();
            self.activeDevice.qRead('WIFI_RSSI')
            .then(function(result) {
                newNames = newNames.concat('WIFI_RSSI');
                newVals = newVals.concat(result);
                var strRes = self.formatRSSI({value:result});
                self.saveCurrentValue(
                    'WIFI_RSSI',
                    result,
                    strRes
                );
                ioDeferred.resolve();
            }, function(err) {
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
        readAndSaveInfo()
        .then(readAndSaveSSID,getErrHandle('readAndSaveInfo'))
        .then(readAndSaveDHCP,getErrHandle('readAndSaveSSID'))
        .then(readAndSaveRSSI,getErrHandle('readAndSaveDHCP'))
        .then(function() {
            // console.log('Wifi Status Regs Updated',newNames,newVals);
            innerDeferred.resolve();
        },getErrHandle('readAndSaveRSSI'))
        .then(function() {
            innerDeferred.resolve();
        },innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.wifiPowerButton = function(data, onSuccess) {
        self.refreshWifiInfo = true;
        var getWifiResFunc = function(val,type) {
            var messages = [
                {'success':'disable wifi success','err':'disable wifi error'},
                {'success':'enable wifi success','err':'enable wifi error'}
            ];
            var fValStr = ['Disabled','Enabled'];
            var btnText = ['Turn WiFi On','Turn WiFi Off'];
            return function(result) {
                console.log(messages[val][type],result);
                self.saveCurrentValue('POWER_WIFI',val,fValStr[val]);
                self.saveCurrentValue('POWER_WIFI_DEFAULT',val,fValStr[val]);
                $('#wifiPowerButton .buttonText').text(btnText[val]);
                onSuccess();
            };
        };
        var curStatus = sdModule.currentValues.get('POWER_WIFI').val;
        console.log('in wifiPowerButton',curStatus);
        if(curStatus === 0) {
            self.activeDevice.iWriteMany(
                ['POWER_WIFI','POWER_WIFI_DEFAULT'],
                [1,1]
            )
            .then(getWifiResFunc(1,'success'),getWifiResFunc(1,'err'));
        } else {
            self.activeDevice.iWriteMany(
                ['POWER_WIFI','POWER_WIFI_DEFAULT'],
                [0,0]
            )
            .then(getWifiResFunc(0,'success'),getWifiResFunc(0,'err'));
        }
    };
    this.readWifiStatus = function(onSuccess) {
        self.activeDevice.sReadMany(
            ['POWER_WIFI','POWER_WIFI_DEFAULT']
            )
        .then(function(newResults){
                var data = newResults.map(function(newResult) {
                    return newResult.res;
                });
                console.log(data);
                onSuccess(data);
            },function(err){
                console.log(err);
            }
        );
    };
    this.wifiDHCPSelect = function(data, onSuccess) {
        // console.log('in wifiDHCPSelect listener');
        var dhcpOption = data.eventData.toElement.id;
        var dhcpTextId;
        var dhcpTextEl;

        if (dhcpOption === 'WiFi_DHCP_Auto') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showAutoWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            } else {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            }
        } else if (dhcpOption === 'WiFi_DHCP_Manual') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showManualWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            } else {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            }
        }
        self.updateWifiValidationStatus(true);
        onSuccess();
    };
    // Function that stalls the execution queue to wait for proper wifi state
    this.waitForWifiNotBlocking = function() {
        var ioDeferred = q.defer();
        var checkWifiStatus = function() {
            var innerIODeferred = q.defer();
            console.log('Reading Wifi Status (reg)');
            self.activeDevice.qRead('WIFI_STATUS')
            .then(function(result) {
                console.log('Wifi status (reg)',result);
                if((result != 2904) && (result != 2902)) {
                    innerIODeferred.resolve();
                } else {
                    innerIODeferred.reject();
                }
            },innerIODeferred.reject);
            return innerIODeferred.promise;
        };
        var getDelayAndCheck = function(iteration) {
            var iteration = 0;
            var timerDeferred = q.defer();
            var configureTimer = function() {
                console.log('configuring wifi status timer');
                setTimeout(delayedCheckWifiStatus,500);
            };
            var delayedCheckWifiStatus = function() {
                console.log('Reading Wifi Status (delay)',iteration);
                self.activeDevice.qRead('WIFI_STATUS')
                .then(function(result) {
                    console.log('Wifi status (delay)',result,iteration);
                    if((result != 2904) && (result != 2902)) {
                        timerDeferred.resolve();
                    } else {
                        iteration += 1;
                        configureTimer();
                    }
                },timerDeferred.reject);
            };
            configureTimer();
            return timerDeferred.promise;
        };
        checkWifiStatus()
        .then(ioDeferred.resolve,getDelayAndCheck)
        .then(ioDeferred.resolve,function(err){
            console.log('Failed to wait for WIFI_STATUS',err);
            ioDeferred.reject();
        });
        return ioDeferred.promise;
    };
    this.clearEthernetInputs = function() {
        var dhcpTextEl = $('#ethernetDHCPSelect .btnText');
        self.hideEthernetDHCPChanged();
        dhcpTextEl.removeClass('inputVerified');
        var ethernetRegisters = self.getEthernetIPRegisterList();
        console.log('Clearing Ethernet Inputs');
        ethernetRegisters.forEach(function(reg) {
            var autoVal = $('#'+reg+'_VAL .'+reg+'_AUTO_VAL');
            var manVal = $('#'+reg+'_VAL .'+reg+'_MAN_VAL');
            var newVal = self.currentValues.get(reg).fVal;
            autoVal.text(newVal);
            // manVal.attr('placeholder',newVal);
            manVal.val(newVal);
            manVal.trigger('change');
        });
        console.log('Ethernet Inputs Cleared');
    };
    this.clearWifiInputs = function() {
        var dhcpTextEl = $('#wifiDHCPSelect .btnText');
        self.hideWifiDHCPChanged();
        dhcpTextEl.removeClass('inputVerified');
        var wifiRegisters = self.getWiFiIPRegisterList();
        console.log('Clearing Wifi Inputs');
        wifiRegisters.forEach(function(reg) {
            var autoVal = $('#'+reg+'_VAL .'+reg+'_AUTO_VAL');
            var manVal = $('#'+reg+'_VAL .'+reg+'_MAN_VAL');
            var newVal = self.currentValues.get(reg).fVal;
            autoVal.text(newVal);
            // manVal.attr('placeholder',newVal);
            manVal.val(newVal);
            manVal.trigger('change');
        });
        console.log('Wifi Inputs Cleared');
    };
    this.wifiApplyButton = function(data, onSuccess) {
        var configData = self.getNewWifiSettings();
        var newNames = configData.newRegisters;
        var newVals = configData.newVals;
        var names = configData.registers;
        var vals = configData.values;
        var networkName = self.getInputVal('WIFI_SSID_DEFAULT_VAL');
        var networkPassword = self.getInputVal('WIFI_PASSWORD_DEFAULT_VAL');

        var applySettings = false;

        var getIOError = function(message) {
            return function(err) {
                var ioDeferred = q.defer();
                if(typeof(err) === 'number') {
                    console.log(message,self.ljmDriver.errToStrSync(err));
                } else {
                    console.log('Wifi Applying Settings Error',message,err);
                }
                ioDeferred.resolve();
                return ioDeferred.promise;
            };
        };
        // Function that stalls the execution queue to wait for proper wifi state
        var waitForWifi = function() {
            var ioDeferred = q.defer();
            var checkWifiStatus = function() {
                var innerIODeferred = q.defer();
                // console.log('Reading Wifi Status (reg)');
                self.activeDevice.qRead('WIFI_STATUS')
                .then(function(result) {
                    if(result != 2904) {
                        innerIODeferred.resolve();
                    } else {
                        innerIODeferred.reject();
                    }
                },innerIODeferred.reject);
                return innerIODeferred.promise;
            };
            var getDelayAndCheck = function(iteration) {
                var timerDeferred = q.defer();
                var configureTimer = function() {
                    setTimeout(delayedCheckWifiStatus,500);
                };
                var delayedCheckWifiStatus = function() {
                    // console.log('Reading Wifi Status (delay)',iteration);
                    self.activeDevice.qRead('WIFI_STATUS')
                    .then(function(result) {
                        if(result != 2904) {
                            timerDeferred.resolve();
                        } else {
                            iteration += 1;
                            configureTimer();
                        }
                    },timerDeferred.reject);
                };
                configureTimer();
                return function() {
                    return timerDeferred.promise;
                };
            };
            checkWifiStatus()
            .then(ioDeferred.resolve,getDelayAndCheck(0))
            .then(ioDeferred.resolve,ioDeferred.reject);
            return ioDeferred.promise;
        };

        var writeSettings = function() {
            var ioDeferred = q.defer();
            if(newNames.length > 0) {
                applySettings = true;
                self.activeDevice.iWriteMany(names,vals)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var writeNetworkName = function() {
            var ioDeferred = q.defer();
            if(networkName.isNew) {
                applySettings = true;
                self.activeDevice.iWrite('WIFI_SSID',networkName.value)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var writeNetworkNameDefault = function() {
            var ioDeferred = q.defer();
            if(networkName.isNew) {
                applySettings = true;
                self.activeDevice.iWrite('WIFI_SSID_DEFAULT',networkName.value)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var writeNetworkPassword = function() {
            var ioDeferred = q.defer();
            if(networkPassword.isNew) {
                applySettings = true;
                self.activeDevice.iWrite('WIFI_PASSWORD_DEFAULT',networkPassword.value)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var enableWifiByDefault = function() {
            var ioDeferred = q.defer();
            self.activeDevice.iWrite('POWER_WIFI_DEFAULT',1)
            .then(ioDeferred.resolve,ioDeferred.reject);
            return ioDeferred.promise;
        };
        var applyWifiSettings = function() {
            var ioDeferred = q.defer();
            // self.ljmDriver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',2000);
            if(applySettings) {
                self.activeDevice.iWrite('WIFI_APPLY_SETTINGS',1)
                .then(function(res) {
                    console.log('WIFI_APPLY_SETTINGS-suc',res);
                    // self.ljmDriver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',20000);
                    ioDeferred.resolve();
                },function(err) {
                    console.log('WIFI_APPLY_SETTINGS-err',err);
                    // self.ljmDriver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',20000);
                    ioDeferred.resolve();
                });
            } else {
                console.log('Not Applying Wifi Settings');
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        
        var performWrites = networkPassword.isNew;
        if(performWrites) {
            waitForWifi()
            .then(writeSettings,getIOError('disableWifi'))
            // .then(writeNetworkName,getIOError('writeSettings'))
            .then(writeNetworkNameDefault,getIOError('writeSettings'))
            .then(writeNetworkPassword,getIOError('writeNetworkNameDefault'))
            .then(enableWifiByDefault,getIOError('writeNetworkPassword'))
            .then(applyWifiSettings,getIOError('enableWifiByDefault'))
            .then(function() {
                    console.log('Successfully Applied Wifi Settings',names,vals,configData);
                    // Save Current Settings
                    self.saveCurrentValue(
                        'WIFI_SSID_DEFAULT',
                        networkName.value,
                        networkName.value
                    );
                    self.saveCurrentValue(
                        'WIFI_SSID',
                        networkName.value,
                        networkName.value
                    );
                    self.saveCurrentValue(
                        'WIFI_PASSWORD_DEFAULT',
                        networkPassword.value,
                        networkPassword.value
                    );
                    names.forEach(function(name,index){
                        var strVal = '';
                        if(name === 'WIFI_DHCP_ENABLE_DEFAULT') {
                            if(vals[index] === 0) {
                                strVal = 'Disabled';
                            } else {
                                strVal = 'Enabled';
                            }
                        } else {
                            strVal = self.formatIPAddress({value:vals[index]});
                        }
                        console.log(name,vals[index],strVal);
                        self.saveCurrentValue(
                            name,
                            vals[index],
                            strVal
                        );
                    });
                    self.clearWifiInputs();
                    onSuccess();
                },function(err) {
                    console.log('Error Applying Wifi Settings',err);
                    showAlert('Failed to Apply Wifi Settings');
                    onSuccess();
            });
        } else {
            console.log('Must Enter a Network Password before applying settings');
            onSuccess();
        }
    };
    this.wifiCancelButton = function(data, onSuccess) {
        console.log('in wifiCancelButton listener');
        var dhcp = self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val;
        var buttonText = self.dhcpText[dhcp];
        $('#wifiDHCPSelect .btnText').text(buttonText);
        if(dhcp === 0) {
            self.showManualWifiSettings();
        } else {
            self.showAutoWifiSettings();
        }
        self.clearWifiInputs();
        onSuccess();
    };
    this.wifiHelpButton = function(data, onSuccess) {
        console.log('in wifiHelpButton listener');
        // gui.Shell.openExternal("https://labjack.com/support/app-notes/basic-networking-troubleshooting");
        gui.Shell.openExternal("https://labjack.com/support/app-notes/wifi-and-ethernet-t7-t4-t7-pro");
        onSuccess();
    };
    this.getEthernetStatus = function() {
        var statusString = '';
        var power = self.currentValues.get('POWER_ETHERNET').val;
        var ip = self.currentValues.get('ETHERNET_IP').val;
        if(power === 0) {
            statusString = 'Un-Powered';
        } else {
            if(ip === 0) {
                statusString = 'Disconnected';
            } else {
                statusString = 'Connected';
            }
        }
        return statusString;
    };
    this.getStatusMessage = function(type) {
        var statusString = '';
        if (type === 'ethernet') {
            var isPowered = self.currentValues.get('POWER_ETHERNET').val;
            var ethernetIP = self.currentValues.get('ETHERNET_IP').val;
            var ethernetIPs = self.currentValues.get('ETHERNET_IP').fVal;
            var isDHCP = self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val;
            var defaultIPs = self.currentValues.get('ETHERNET_IP_DEFAULT').fVal;
            if (isPowered === 0) {
                statusString = 'Ethernet is currently not powered.';
            } else {
                if(ethernetIP === 0) {
                    // statusString = 'Ethernet is not connected but is trying to connect';
                    // if (isDHCP === 0) {
                    //     statusString += ' with the IP address ';
                    //     statusString += defaultIPs;
                    // } else {
                    //     statusString += ' with DHCP enabled';
                    // }
                    // statusString += '.';
                    statusString = 'Either the cable for Ethernet is not'
                    statusString += ' plugged in or the device at the other '
                    statusString += 'end is not responding.'
                } else {
                    statusString = 'Ethernet is connected and has the IP address ';
                    statusString += ethernetIPs;
                    statusString += '.';
                }
            }
        } else if (type === 'wifi') {
            var ssidDefault = self.currentValues.get('WIFI_SSID_DEFAULT').val;
            var ssid = self.currentValues.get('WIFI_SSID').val;
            var wifiStatus = self.currentValues.get('WIFI_STATUS').val;
            var wifiIP = self.currentValues.get('WIFI_IP').fVal;
            var wifiDHCP = self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val;
            var wifiDefaultIP = self.currentValues.get('WIFI_IP_DEFAULT').fVal;
            var wifiRSSI = self.currentValues.get('WIFI_RSSI').fVal;

            if(((wifiStatus == 2900) && (ssid === ssidDefault) && (ssid === ''))
                                || ((wifiStatus == 2900) && (ssid !== ''))) {
                statusString = 'WiFi is connected to ';
                statusString += ssid;
                statusString += ' and has the IP address ';
                statusString += wifiIP;
                statusString +=' with an initial signal strength of ';
                statusString += wifiRSSI;
                statusString += '.';
            } else if (wifiStatus == 2903) {
                statusString = 'WiFi is currently not powered.';
            } else {
                statusString = 'WiFi is not connected but is trying to connect to ';
                statusString += ssidDefault;
                if (wifiDHCP === 0) {
                    statusString += ' with the IP address ';
                    statusString += wifiDefaultIP;
                } else {
                    statusString += ' with DHCP enabled';
                }
                statusString += '.';
            }
        } else {
            throw 'getStatusMessage, wrong type';
        }
        return statusString;
    };

    this.compileTemplate = function(templateName) {
        try {
            self.templates[templateName] = handlebars.compile(
                self.moduleData.htmlFiles[templateName]
            );
        } catch(err) {
            console.error(
                'Error compiling template',
                templateName,
                err
            );
        }
    };
    
    var templatesToCompile = [
        'ethernet_settings',
        'wifi_settings',
        'current_pc_settings',
    ];

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // Save Module Constant objects
        self.moduleConstants = framework.moduleConstants;
        self.configOnlyRegisters = framework.moduleConstants.configOnlyRegisters;
        self.ethernetRegisters = framework.moduleConstants.ethernetRegisters;
        self.wifiRegisters = framework.moduleConstants.wifiRegisters;

        self.ethernetStatusRegisters = framework.moduleConstants.ethernetStatusRegisters;
        self.wifiStatusRegisters = framework.moduleConstants.wifiStatusRegisters;


        self.moduleData = framework.moduleData;

        // Compile module templates
        
        templatesToCompile.forEach(self.compileTemplate);

        
        onSuccess();
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {object} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        // Save the selected device as the module's activeDevice
        self.activeDevice = device;

        // Save the devices current connection type
        self.connectionType = device.savedAttributes.connectionType;

        // Configure bindings...
        var genericConfigCallback = function(data, onSuccess) {
            // console.log('genericConfigCallback');
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            // console.log('genericPeriodicCallback');
            // self.saveCurrentValue(data.binding.binding,data.value,data.stringVal);
            self.saveBufferedValue(data.binding.binding,data.value,data.stringVal);
            if(data.binding.binding === 'ETHERNET_IP') {
                // console.log(data.binding.binding,data.value,data.stringVal);
            }
            onSuccess();
        };
        var ethernetStatusListner = function(data, onSuccess) {
            // console.log('in ethernetStatusListner!');
            self.bufferedValues.forEach(function(data,name){
                // console.log(name,data);
            });
            var currentIP = self.currentValues.get('ETHERNET_IP').val;
            var currentIPs = self.currentValues.get('ETHERNET_IP').fVal;
            var newIP = self.bufferedValues.get('ETHERNET_IP').val;
            var newIPs = self.bufferedValues.get('ETHERNET_IP').fVal;
            var currentPower = self.currentValues.get('POWER_ETHERNET').val;
            var newPower = self.currentValues.get('POWER_ETHERNET').val;
            var updateInfo = self.refreshEthernetInfo;
            // var newIsPowered = self.activeDevice.read('POWER_ETHERNET');
            var currentIsPowered = self.currentValues.get('POWER_ETHERNET');
            var checkEthernetConnection = function() {
                if(currentIP == newIP) {

                } else {
                    updateInfo = true;
                    if (newIP === 0) {
                        // console.log('Ethernet Disconnected!');
                        self.isEthernetConnected = false;
                    } else {
                        // console.log('Ethernet Connected!');
                        self.isEthernetConnected = true;
                    }
                }
            };
            var checkEthernetPower = function() {
                if(currentPower == newPower) {
                    
                } else {
                    updateInfo = true;
                }
            };
            checkEthernetPower();
            checkEthernetConnection();
            // updateActiveEthernetSettings()
            var updateEthernetInfo = function() {
                var message = self.getStatusMessage('ethernet');
                $('#ethernetStatusMessage').text(message);
                var ip = self.currentValues.get('ETHERNET_IP').val;
                var ethStatusString = self.getEthernetStatus();
                $('#ethernet_connection_status').text(ethStatusString);
                self.updateEthernetSettings();
                self.refreshEthernetInfo = false;
            };
            if(updateInfo) {
                self.commitBufferedValues();
                self.updateActiveEthernetSettings()
                .then(function() {
                    updateEthernetInfo();
                    onSuccess();
                },function() {
                    console.log('onModuleLoaded.ethernetStatusListner error');
                    updateEthernetInfo();
                    onSuccess();
                });
                
            } else {
                onSuccess();
            }
        };

        var wifiStatusListner = function(data, onSuccess) {

            var currentStatus = self.currentValues.get('WIFI_STATUS').val;
            var newStatus = data.value;
            var updateStatusMessage = self.refreshWifiInfo;
            if(currentStatus == newStatus) {
                if (newStatus == 2903 ) {
                    self.saveCurrentValue('POWER_WIFI',0,'Disabled');
                    $('#wifiPowerButton .buttonText').text('Turn WiFi On');
                } else if (newStatus == 2900) {
                    var curSSID = self.currentValues.get('WIFI_SSID').val;
                    if(curSSID === '') {
                        updateStatusMessage = true;
                    } else {
                        var curDefaultSSID = self.currentValues.get('WIFI_SSID_DEFAULT').val;
                        if (curSSID === curDefaultSSID) {
                            updateStatusMessage = false;
                        } else {
                            updateStatusMessage = true;
                        }
                    }
                }
            } else {
                // console.log('WiFi Status has changed',data.value,data.stringVal);
                self.saveCurrentValue('WIFI_STATUS',data.value,data.stringVal);
                updateStatusMessage = true;
                if( newStatus == 2900 ) {
                    self.saveCurrentValue('POWER_WIFI',1,'Enabled');
                    $('#wifiPowerButton .buttonText').text('Turn WiFi Off');
                    self.isWifiConnected = true;
                    // console.log('Wifi Connected!');
                    self.activeDevice.sRead('WIFI_SSID');
                    // console.log('Wifi SSID: (on connect-change)',);
                } else if (newStatus == 2903) {
                    self.saveCurrentValue('POWER_WIFI',0,'Disabled');
                    $('#wifiPowerButton .buttonText').text('Turn WiFi On');
                } else {
                    self.saveCurrentValue('POWER_WIFI',1,'Enabled');
                    $('#wifiPowerButton .buttonText').text('Turn WiFi Off');
                    self.isWifiConnected = false;
                    // console.log('Wifi Disconnected!');
                }
            }
            var updateWifiInfo = function() {
                var message = self.getStatusMessage('wifi');
                $('#wifiStatusMessage').text(message);
                var ssidDefault = self.currentValues.get('WIFI_SSID_DEFAULT').val;
                var ssid = self.currentValues.get('WIFI_SSID').val;
                if(self.isWifiConnected) {
                    if(ssid === '') {
                        if(ssid === ssidDefault) {
                            self.updateWifiSettings();
                        }
                    } else {
                        self.updateWifiSettings();
                    }
                }
                self.refreshWifiInfo = false;
            };
            if(updateStatusMessage) {
                self.updateActiveWifiSettings()
                .then(function() {
                    updateWifiInfo();
                    onSuccess();
                },function() {
                    console.log('onModuleLoaded.wifiStatusListner error');
                    updateWifiInfo();
                    onSuccess();
                });
                
            } else {
                onSuccess();
            }
        };
        var genericCallback = function(data, onSuccess) {
            console.log('genericCallback');
            onSuccess();
        };
        // console.log('moduleConstants', self.moduleConstants);
        var smartBindings = [];

        // Add setupOnlyRegisters
        self.configOnlyRegisters.forEach(function(regInfo){
            if(regInfo.deviceTypes.indexOf(self.activeDevice.savedAttributes.deviceTypeName) >= 0) {
                smartBindings.push({
                    bindingName: regInfo.name, 
                    smartName: 'setupOnlyRegister',
                    configCallback: genericConfigCallback
                });
            }
        });

        var addSmartBinding = function(regInfo) {
            if(regInfo.deviceTypes.indexOf(self.activeDevice.savedAttributes.deviceTypeName) >= 0) {
                var binding = {};
                var format;
                var customFormatFunc;
                var isPeriodic = (typeof(regInfo.isPeriodic) === 'boolean');
                isPeriodic &= (regInfo.isPeriodic);
                if (regInfo.type === 'ip') {
                    format = 'customFormat';
                    customFormatFunc = self.formatIPAddress; 
                } else if (regInfo.type === 'status') {
                    format = 'customFormat';
                    customFormatFunc = self.formatStatus; 
                } else if (regInfo.type === 'rssi') {
                    format = 'customFormat';
                    customFormatFunc = self.formatRSSI;
                } else if (regInfo.type === 'wifiStatus') {
                    format = 'customFormat';
                    customFormatFunc = self.formatWifiStatus;
                }
                
                binding.bindingName = regInfo.name;
                binding.format = format;
                binding.customFormatFunc = customFormatFunc;
                
                if (isPeriodic) {
                    binding.smartName = 'readRegister';
                    // if (regInfo.name === 'ETHERNET_IP') {
                    //     binding.periodicCallback = ethernetStatusListner;
                    // } else 
                    if (regInfo.name === 'WIFI_STATUS') {
                        binding.periodicCallback = wifiStatusListner;
                    } else {
                        binding.periodicCallback = genericPeriodicCallback;
                    }
                } else {
                    binding.smartName = 'setupOnlyRegister';
                }
                binding.configCallback = genericConfigCallback;
                smartBindings.push(binding);
            }
        };

        // Add Ethernet readRegisters
        self.ethernetRegisters.forEach(addSmartBinding);

        // Add Wifi readRegisters
        self.wifiRegisters.forEach(addSmartBinding);

        var customSmartBindings = [
            {
                // Define binding to handle Ethernet-Status updates.
                bindingName: 'ethernetStatusManager', 
                smartName: 'periodicFunction',
                periodicCallback: ethernetStatusListner
            },{
                // Define binding to handle Ethernet Power button presses.
                bindingName: 'ethernetPowerButton', 
                smartName: 'clickHandler',
                callback: self.ethernetPowerButton
            },{
                // Define binding to handle Ethernet DHCP-select button presses.
                bindingName: 'ethernet-DHCP-Select-Toggle', 
                smartName: 'clickHandler',
                callback: self.ethernetDHCPSelect
            },{
                // Define binding to handle Ethernet Apply button presses.
                bindingName: 'ethernetApplyButton', 
                smartName: 'clickHandler',
                callback: self.ethernetApplyButton
            },{
                // Define binding to handle Ethernet Cancel button presses.
                bindingName: 'ethernetCancelButton', 
                smartName: 'clickHandler',
                callback: self.ethernetCancelButton
            },{
                // Define binding to handle Ethernet Cancel button presses.
                bindingName: 'ethernetHelpButton', 
                smartName: 'clickHandler',
                callback: self.ethernetHelpButton
            },{
                // Define binding to handle Wifi Power button presses.
                bindingName: 'wifiPowerButton', 
                smartName: 'clickHandler',
                callback: self.wifiPowerButton
            },{
                // Define binding to handle Wifi DHCP-select button presses.
                bindingName: 'wifi-DHCP-Select-Toggle', 
                smartName: 'clickHandler',
                callback: self.wifiDHCPSelect
            },{
                // Define binding to handle Wifi Apply button presses.
                bindingName: 'wifiApplyButton', 
                smartName: 'clickHandler',
                callback: self.wifiApplyButton
            },{
                // Define binding to handle Wifi Cancel button presses.
                bindingName: 'wifiCancelButton', 
                smartName: 'clickHandler',
                callback: self.wifiCancelButton
            },{
                // Define binding to handle Ethernet Cancel button presses.
                bindingName: 'wifiHelpButton', 
                smartName: 'clickHandler',
                callback: self.wifiHelpButton
            }
        ];
        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        // Filter the "customSmartBindings" to get rid of WiFi handlers if the
        // device doesn't have WiFi.
        var filteredCustomSmartBindings = customSmartBindings;

        if(self.activeDevice.savedAttributes.deviceTypeName === 'T4') {
            filteredCustomSmartBindings = customSmartBindings.filter(function(binding) {
                if(binding.bindingName.indexOf('wifi') >= 0) {
                    // console.log('Using a T4, filtering out wifi customSmartBinding', binding);
                    return false;
                } else {
                    return true;
                }
            });
        }
        // Save the customSmartBindings to the framework instance.
        framework.putSmartBindings(filteredCustomSmartBindings);
        // Clear current config bindings to prevent from double-event listeners.
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');

        // Indicate to the framework that it is ok to continue
        onSuccess();
    };

    /**
     * Function to configure the module's view.html template.
     * @param  {object} framework the sdFramework object returned by the 
     * framework.
    **/
    this.configureModuleContext = function(framework) {
        var ethernetWarningMessage = '';
        var wifiWarningMessage = '';
        var ethernetPowerButtonWarning = '';
        var wifiPowerButtonWarning = '';
        var showWifiWarning = false;
        var showEthernetWarning = false;
        if(self.connectionType == driver_const.LJM_CT_TCP) {
            showEthernetWarning = true;
            showWifiWarning = true;
            ethernetWarningMessage = 'Current Connection type is TCP, applying settings may break your connection.';
            wifiWarningMessage = 'Current Connection type is TCP, applying settings may break your connection.';
            ethernetPowerButtonWarning = 'Current Connection type is Ethernet, turning off Ethernet may break your connection.';
            wifiPowerButtonWarning = 'Current Connection type is WiFi, turning off Wifi may break your connection.';
        } else if (self.connectionType == driver_const.LJM_CT_ETHERNET) {
            showEthernetWarning = true;
            ethernetWarningMessage = 'Current Connection type is Ethernet, applying settings may break your connection.';
            ethernetPowerButtonWarning = 'Current Connection type is Ethernet, turning off Ethernet will break your connection.';
        } else if(self.connectionType == driver_const.LJM_CT_WIFI) {
            showWifiWarning = true;
            wifiWarningMessage = 'Current Connection type is WiFi, applying settings may break your connection.';
            wifiPowerButtonWarning = 'Current Connection type is WiFi, turning off Wifi will break your connection.';
        }
        self.moduleContext.showEthernetWarning = showEthernetWarning;
        self.moduleContext.ethernetWarningMessage = ethernetWarningMessage;
        self.moduleContext.ethernetPowerButtonWarning = ethernetPowerButtonWarning;
        self.moduleContext.showWifiWarning = showWifiWarning;
        self.moduleContext.wifiWarningMessage = wifiWarningMessage;
        self.moduleContext.wifiPowerButtonWarning = wifiPowerButtonWarning;

        var hasWiFi = false;
        self.moduleContext.hasWiFi = null;
        if(self.activeDevice.savedAttributes.deviceTypeName === 'T7') {
            if (self.activeDevice.savedAttributes.isPro) {
                hasWiFi = true;
                self.moduleContext.hasWiFi = true;
            }
        }

        var hasPowerEthernet = true;
        if(self.activeDevice.savedAttributes.deviceTypeName === 'T4') {
            hasPowerEthernet = false;
        }
        self.moduleContext.hasPowerEthernet = hasPowerEthernet;

        var networkNameDefault;
        if(hasWiFi) {
            // Get and save wifiNetworkName
            networkNameDefault = self.currentValues.get('WIFI_SSID_DEFAULT').fVal;
            self.moduleContext.wifiNetworkName = networkNameDefault;
        }

        // Get and save ethernetPowerStatus
        var isEthernetPowered = self.currentValues.get('POWER_ETHERNET').val;
        if(isEthernetPowered === 0) {
            self.moduleContext.isEthernetPowered = false;
            self.moduleContext.ethernetPowerButtonString = 'Turn Ethernet On';
        } else {
            self.moduleContext.isEthernetPowered = true;
            self.moduleContext.ethernetPowerButtonString = 'Turn Ethernet Off';
        }

        var isWifiPowered;
        if(hasWiFi) {
            // Get and save wifiPowerStatus
            isWifiPowered = self.currentValues.get('POWER_WIFI').val;
            if(isWifiPowered === 0) {
                self.moduleContext.isWifiPowered = false;
                self.saveCurrentValue('POWER_WIFI',0,'Disabled');
                self.moduleContext.wifiPowerButtonString = 'Turn WiFi On';
            } else {
                self.moduleContext.isWifiPowered = true;
                self.saveCurrentValue('POWER_WIFI',1,'Enabled');
                self.moduleContext.wifiPowerButtonString = 'Turn WiFi Off';
            }
            if(isWifiPowered === 0) {
                self.saveCurrentValue('WIFI_IP',0,'0.0.0.0');
                self.saveCurrentValue('WIFI_SUBNET',0,'0.0.0.0');
                self.saveCurrentValue('WIFI_GATEWAY',0,'0.0.0.0');
            }
        }

        

        var initialEthernetDHCPStatus = self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT');
        if (initialEthernetDHCPStatus.val === 0) {
            self.moduleContext.ethernetDHCPStatusBool = false;
            self.moduleContext.ethernetDHCPStatusString = self.dhcpText[0];
        } else {
            self.moduleContext.ethernetDHCPStatusBool = true;
            self.moduleContext.ethernetDHCPStatusString = self.dhcpText[1];
        }

        var initialWifiDHCPStatus;
        if(hasWiFi) {
            initialWifiDHCPStatus = self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT');
            if (initialWifiDHCPStatus.val === 0) {
                self.moduleContext.wifiDHCPStatusBool = false;
                self.moduleContext.wifiDHCPStatusString = self.dhcpText[0];
            } else {
                self.moduleContext.wifiDHCPStatusBool = true;
                self.moduleContext.wifiDHCPStatusString = self.dhcpText[1];
            }
        }
        self.moduleContext.dhcpDisabledText = self.dhcpText[0];
        self.moduleContext.dhcpEnabledText = self.dhcpText[1];

        var initialEthernetIP = self.currentValues.get('ETHERNET_IP').val;
        if(initialEthernetIP === 0) {
            self.isEthernetConnected = false;
        } else {
            self.isEthernetConnected = true;
        }
        var ethStatusString = self.getEthernetStatus();
        self.moduleContext.ethernetConnectionStatus = ethStatusString;

        var initialWifiStatus;
        if(hasWiFi) {
            initialWifiStatus = self.currentValues.get('WIFI_STATUS').val;
            if (initialWifiStatus === 2900) {
                self.isWifiConnected = true;
            } else {
                self.isWifiConnected = false;
            }
        }

        var ethernetStatusMessage = self.getStatusMessage('ethernet');
        self.moduleContext.ethernetStatusMessage = ethernetStatusMessage;
        
        var wifiStatusMessage;
        if(hasWiFi) {
            wifiStatusMessage = self.getStatusMessage('wifi');
            self.moduleContext.wifiStatusMessage = wifiStatusMessage;
        }

        var i;
        var dhcpStatus;
        // Get and save ethernetIPRegisterList
        var ethernetIPRegisters = self.getIPRegisters(self.ethernetRegisters);
        //Add the isDHCPAuto flag
        for(i=0;i<ethernetIPRegisters.length;i++){
            dhcpStatus = self.moduleContext.ethernetDHCPStatusBool;
            ethernetIPRegisters[i].isDHCPAuto = dhcpStatus;
        }
        self.moduleContext.ethernetIPRegisters = ethernetIPRegisters;

        self.moduleContext.ethernetStatusRegisters = self.getOrganizedEthernetIPSettingsRegList();

        
        if(hasWiFi) {
            // Get and save wifiIPRegisterList
            var wifiIPRegisters = self.getIPRegisters(self.wifiRegisters);
            //Add the isDHCPAuto flag
            for(i=0;i<wifiIPRegisters.length;i++){
                dhcpStatus = self.moduleContext.wifiDHCPStatusBool;
                wifiIPRegisters[i].isDHCPAuto = dhcpStatus;
            }
            self.moduleContext.wifiIPRegisters = wifiIPRegisters;
            self.moduleContext.wifiStatusRegisters = self.getOrganizedWiFiIPSettingsRegList();
        }

        // console.log('Init context',self.moduleContext);

        self.moduleContext.availableNetworkInterfaces = {};
        try {
            var os = require('os');
            var networkInterfaces = {};
            var availableInterfaces = os.networkInterfaces();
            var keys = Object.keys(availableInterfaces);
            keys.forEach(function(key) {
                var interfaceID = key.split(' ').join('_');
                networkInterfaces[interfaceID] = {};
                networkInterfaces[interfaceID].addresses = availableInterfaces[key];
                networkInterfaces[interfaceID].id = interfaceID;
                networkInterfaces[interfaceID].name = key;
                
            });
            console.log('Available network interfaces (network_settings/controller.js)', networkInterfaces);
            self.moduleContext.networkInterfaces = networkInterfaces;
        } catch(err) {
            // Error...
            console.log('Error getting networkInterfaces info', err);
        }

        templatesToCompile.forEach(function(templateName) {
            try {
                self.moduleContext[templateName] = self.templates[templateName](
                    self.moduleContext
                );
            } catch(err) {
                console.error('error populating template', templateName);
            }
        });
        framework.setCustomContext(self.moduleContext);
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // console.log('In onDeviceConfigured');
        var isConfigError = false;
        var errorAddresses = [];
        var errorBindings = dict();
        setupBindings.forEach(function(setupBinding){
            if(setupBinding.status === 'error') {
                isConfigError = true;
                var addr = setupBinding.address;
                var dnrAddr = [
                    'WIFI_MAC',
                    'ETHERNET_MAC',
                    'WIFI_PASSWORD_DEFAULT'
                ];
                if(dnrAddr.indexOf(addr) < 0) {
                    errorAddresses.push(addr);
                    errorBindings.set(addr,framework.setupBindings.get(addr));
                }
            }
            self.saveConfigResult(
                setupBinding.address,
                {val:setupBinding.result,fVal:setupBinding.formattedResult,status:setupBinding.status},
                setupBinding.status
            );
        });

        // Asynchronously loop through the addresses that failed to read during 
        // the modules initial load step.  This commonly happens when the T7's
        // flash is un-available (wifi-module is starting) aka reading _DEFAULT 
        // values.
        async.eachSeries(
            errorAddresses,
            function( addr, callback) {
                var binding = errorBindings.get(addr);
                self.activeDevice.qRead(addr)
                .then(function(result){
                    var strRes = "";
                    if(binding.format === 'customFormat') {
                        strRes = binding.formatFunc({value:result});
                    } else {
                        strRes = result;
                    }
                    console.log('re-read-success',addr,result,strRes);
                    callback();
                }, function(err) {
                    console.log('re-read-err',addr,err);
                    showAlert('Issues Loading Module'+err.toString());
                    callback();
                });
            }, function(err){
                // When we are finished re-reading values call function to 
                // configure the module's initial display context & return 
                // control back to the framework.
                // console.log('Configure module context');
                self.configureModuleContext(framework);
                onSuccess();
            });
    };

    /**
     * Function to be called when template is loaded to automatically fill
     * inputs with information.
    **/
    this.configureInputsForTesting = function() {
        // var os = require("os");
        // var computerName = os.hostname();
        // if(computerName === 'chris-johnsons-macbook-pro-2.local' && window.toolbar.visible) {
        //     // self.setNetworkName('AAA');
        //     self.setWifiPassword('timmarychriskevin');
        // }

        // self.setNetworkName('5PoundBass');
        // self.setNetworkName('- DEN Airport Free WiFi');
        // self.setNetworkName('Courtyard_GUEST');
        // self.setWifiPassword('smgmtbmb3cmtbc');
        // self.setNetworkName('AAA');
    };

    /**
     * Function gets called by the framework when the module's template has
     * been loaded.
     * @param  {object} framework the framework object
     * @param  {function} onError   function to be called if an error occurs.
     * @param  {function} onSuccess function to be called when finished 
     *                            successfully.
    **/
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        // Attach the input validators to the ui boxes.
        self.attachInputValidators();

        // force validations to occur
        self.selectivelyShowEthernetAlerts();
        self.selectivelyShowWifiAlerts();
        
        // Collapse tables
        $('.collapse').collapse();
        
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
        framework.deleteAllSmartBindings();
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
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
        if(typeof(description.retError) === 'number') {
            var info = modbus_map.getErrorInfo(description.retError);
            console.log('in onRefreshError',info);
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
