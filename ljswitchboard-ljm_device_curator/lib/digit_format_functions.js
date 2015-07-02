
var q = require('q');
var async = require('async');
var data_parser = require('ljswitchboard-data_parser');

var digit_light_calibration = require('./digit_light_calibration');

var aRawCounts = digit_light_calibration.aRawCounts;
var aTempC = digit_light_calibration.aTempC;
var aLux = digit_light_calibration.aLux;

function convertRawTemperatureC(latestRawTemperature) {
	var currentTemperature;

	currentTemperature = parseInt(latestRawTemperature);

	// Temperature is negative, MSB==1
	if(currentTemperature >= 32768) {
		currentTemperature = ((currentTemperature) >> 4); // Get rid of flag bits
		currentTemperature = ((currentTemperature) << 4);
		currentTemperature = ((currentTemperature) - 1);

        currentTemperature = ~(currentTemperature);
        currentTemperature = currentTemperature & 0xFFFF; // Disregard upper-order bits

        currentTemperature = ((currentTemperature) >> 4);
        currentTemperature = currentTemperature & 0xFFFF; // Disregard upper-order bits
        currentTemperature = (currentTemperature) * (-1);
	} else { // temperature is positive, MSB==0
		currentTemperature = ((currentTemperature) >> 4);
	}

	// Conversion factor 0.0625
	currentTemperature = ((currentTemperature) * 0.0625);
	return currentTemperature;
}
exports.convertRawTemperatureC = convertRawTemperatureC;


function convertRawHumidity(rawHumidity, currentTemperature, deviceCal) {
	var percentRelativeHumidity;

	var CalOffsetH = deviceCal.CalOffsetH;
	var Hslope = deviceCal.Hslope;
	var TslopeH = deviceCal.TslopeH;
	var ToffsetH = 0;
	var Tmin = -38; // Minimum allowed temperature of Digit-TLH, per low-level documentation

	//%RH = (RawCapacitance - CalOffsetH + TOffsetH)(Hslope)
    //where...
    //ToffsetH = ((TslopeH)(Tcurrent)) - ((TslopeH)(Tmin))
    ToffsetH = (TslopeH * currentTemperature) - (TslopeH * Tmin);
    percentRelativeHumidity = (rawHumidity - CalOffsetH + ToffsetH) * Hslope;

	return percentRelativeHumidity;
}
exports.convertRawHumidity = convertRawHumidity;

function linearInterpolate (a, b, coefficient) {
	return (a + (coefficient * (b - a) ) );
}
var ENABLE_LUX_CONVERSION_DEBUGGING = false;
function debugLightConversion() {
	if(ENABLE_LUX_CONVERSION_DEBUGGING) {
		console.log.apply(console, arguments);
	}
}
function convertRawLight(rawLight, currentTemperature, onUSBPower) {
	var lightValueLux;

	var RawLight = rawLight;
	var Lux = 0;
	var CurrentdegreesC = currentTemperature;
	var OnUSBPower = 0;
	if(onUSBPower) {
		OnUSBPower = 1;
	}

	// Calling function defined by caleb...
	var RoundedDegC = 0;
    var j = 0;
    var aMatchingLux = [];
    var aMatchingRaw = [];
    var i = 0;
    for(i = 0; i < 14; i++) {
    	aMatchingLux.push(0);
    	aMatchingRaw.push(0);
    }


    var fractionalIndex = 0;

    // Round current temperature to nearest degree Celsius, to allow for perfect match with 'aTempC[]' calibration values
    RoundedDegC = Math.floor(CurrentdegreesC);
    debugLightConversion('RoundedDegC', RoundedDegC);

    //Reduce raw value by 35% due to 3.3V reg(USB), instead of 3.0V(battery).
    if (OnUSBPower == 1) {
        RawLight = (RawLight * 0.65);
    }
    

    // Create two arrays: Raw light readings and Lux, for a single temperature (the current temperature).  
    // This is how the 3D surface is simplifed, as discussed in the low-level docs 
    for(i = 0; i < 1792; i++){
        // Match found?
        if(aTempC[i] == RoundedDegC){
            // Corresponding temperature slice found. There are always 14 slices. Use the 14 indices to make 2 simplified arrays
            aMatchingLux[j] = aLux[i];
            aMatchingRaw[j++] = aRawCounts[i];
        }
    }           

    // Linear interpolate. Generate a fractional index given the 1D array aRawCounts[] and a raw value, then 
    // use the fractional index on the 1D Lux array to get the interpolated Lux value.
    if (RawLight <= aMatchingRaw[0]){ // outside of typical bounds, use lowest available raw value(Max Lux, 12000)
        Lux = aMatchingLux[0];
    } else if (RawLight >= aMatchingRaw[13]) { // outside of typical bounds, use highest available raw value(Min Lux, 1)
        Lux = aMatchingLux[13];
    } else {
        for(var k = 0; k < 14; k++) {
            if(aMatchingRaw[k] >= RawLight) {
            	debugLightConversion('converted RawLight', RawLight);
            	debugLightConversion('MatchingRaw', aMatchingRaw[k], aMatchingRaw[k-1]);
                //k, and k-1 are the raw values that bracket the input value
                fractionalIndex = (RawLight - aMatchingRaw[k-1]) / (aMatchingRaw[k] - aMatchingRaw[k-1]);

                debugLightConversion('MatchingLux', aMatchingLux[k], aMatchingLux[k-1]);
                debugLightConversion('FractionalIndex', fractionalIndex);
                
                Lux = linearInterpolate(aMatchingLux[k-1], aMatchingLux[k], fractionalIndex);
                break;
            }
        }
    }
	// End Calling function defined by caleb...

	lightValueLux = Lux;
	return lightValueLux;
}
exports.convertRawLight = convertRawLight;

var formatters = {
	'DGT_TEMPERATURE_LATEST_RAW': {
		'formatter': function(deviceCal, newData, results) {
			// console.log('in DGT_TEMPERATURE_LATEST_RAW formatter', newData, results);
			results.temperature = convertRawTemperatureC(
				newData.DGT_TEMPERATURE_LATEST_RAW
			);
			results.rawTemperature = newData.DGT_TEMPERATURE_LATEST_RAW;
		},
		'order': 0,
	},
	'DGT_HUMIDITY_RAW': {
		'formatter': function(deviceCal, newData, results) {
			// console.log('in DGT_HUMIDITY_RAW formatter', newData, results);

			results.relativeHumidity = convertRawHumidity(
				newData.DGT_HUMIDITY_RAW,
				results.temperature,
				deviceCal
			);
			results.rawHumidity = newData.DGT_HUMIDITY_RAW;
		},
		'order': 1,
	},
	'DGT_LIGHT_RAW': {
		'formatter': function(deviceCal, newData, results) {
			// console.log('in DGT_LIGHT_RAW formatter', newData, results);
			try {
				results.lux = convertRawLight(
					newData.DGT_LIGHT_RAW,
					results.temperature,
					true
				);
				results.rawLight = newData.DGT_LIGHT_RAW;
			} catch(err) {
				console.log('Error converting to lux', err);
			}
		},
		'order': 2,
	}
};
function sortReadings(a, b) {
	var aOrder;
	var bOrder;

	try {
		aOrder = formatters[a.name].order;
		bOrder = formatters[b.name].order;
	} catch(err) {
		console.error('Error Sorting Readings (digit_format_functions)', err);
		aOrder = 0;
		bOrder = 0;
	}

	if(aOrder > bOrder) {
		return 1;
	}
	if(aOrder < bOrder) {
		return -1;
	}
	return 0;
}

function applyFormatters(device, latestReadings) {
	var defered = q.defer();
	var results = {};
	var newData = {};

	var isValid = false;
	var i;
	for(i = 0; i < latestReadings.length; i++) {
		if(latestReadings[i].name) {
			if(latestReadings[i].name === 'DGT_TEMPERATURE_LATEST_RAW') {
				isValid = true;
			}
			newData[latestReadings[i].name] = latestReadings[i].res;
		}
	}

	if(isValid) {
		// var currentTemperature = convertRawTemperatureC(
		// 	newData.DGT_TEMPERATURE_LATEST_RAW
		// );
		
		// Sort the readings to make sure that the temperature conversion is
		// applied first.
		latestReadings.sort(sortReadings);


		latestReadings.forEach(function(latestReading) {
			try {
				formatters[latestReading.name].formatter({
						'CalOffsetH': device.savedAttributes.DGT_HUMIDITY_CAL_OFFSET,
						'Hslope': device.savedAttributes.DGT_HUMIDITY_CAL_SLOPE,
						'TslopeH': device.savedAttributes.DGT_HUMIDITY_CAL_T_SLOPE,
					},
					newData,
					results
				);
			} catch(err) {
				// catch any errors....
				console.error('Error converting:', latestReading.name, err, '(digit_format_functions)');
			}
		});

		defered.resolve(results);
	} else {
		console.error('Missing the latest temperature value');
		defered.reject(results);
	}
	return defered.promise;
}
exports.applyFormatters = applyFormatters;

