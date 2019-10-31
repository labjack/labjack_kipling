-- This is a general AIN_EF config example that shows the basic process for
-- configuring any AIN_EF feature on a T-Series device, saving them as defaults
-- and then powercycling the device.  This example configures AIN0 and AIN2 to
-- enable the Average/Min/Max extended feature.

-- For a list of all AIN_EF options, see the T-Series datasheet:
-- https://labjack.com/support/datasheets/t-series/ain/extended-features
print("Generic Config AIN_EF & set power-up defaults")

-- Note: THIS SHOULD NOT BE RUN MULTIPLE TIMES. IT WILL SLOWLY CAUSE FLASH WEAR.

-- Generic function that can be used to configure general analog input settings 
-- such as Range, Resolution, and Settling.  More information about these 
-- settings can be found on the LabJack website under the AIN section:
-- https://labjack.com/support/datasheets/t-series/ain
function ainEFConfig(chNum, index, cfgA, cfgB, cfgC, cfgD, cfgE, cfgF, cfgG, cfgH, cfgI, cfgJ)
	MB.W(9000 + chNum * 2, 1, 0) -- Disable AIN_EF
	MB.W(9000 + chNum * 2, 1, index) -- Enable AIN_EF
	MB.W(9300 + chNum * 2, 1, cfgA)
	MB.W(9600 + chNum * 2, 1, cfgB)
	MB.W(9900 + chNum * 2, 1, cfgC)
	MB.W(10200 + chNum * 2, 3, cfgD)
	MB.W(10500 + chNum * 2, 3, cfgE)
	MB.W(10800 + chNum * 2, 3, cfgF)
	MB.W(11100 + chNum * 2, 3, cfgG)
	MB.W(11400 + chNum * 2, 3, cfgH)
	MB.W(11700 + chNum * 2, 3, cfgI)
	MB.W(12000 + chNum * 2, 3, cfgJ)
end

ainChannels = {0, 2} -- Enable AIN0 and AIN2
numSamples = 200
scanRate = 6000

-- Configure each analog input
for i=1,table.getn(ainChannels) do
    ainEFConfig(ainChannels[i], 3,numSamples,0,0,scanRate,0,0,0,0,0,0)
end

-- Set as power-up default
print("Saving settings as power-up defaults")
MB.W(49002, 1, 1)

-- Re-set device
print("Rebooting Device")
MB.W(61998, 1, 0x4C4A0004)

