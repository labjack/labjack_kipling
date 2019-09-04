
-- This is an example that illustrates specifically how to Enable
-- a thermocouple to be read on AIN0 in differential input mode.
-- For the most up to date thermocouple type constants, see the
-- T-Series datasheet page:
-- https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple

-- For general assistance with thermocouples, read our general thermocouples
-- App-Note as well as the related device-specific one:
-- https://labjack.com/support/app-notes/thermocouples

tcTypes = {}
tcTypes['E']=20
tcTypes['J']=21
tcTypes['K']=22
tcTypes['R']=23
tcTypes['T']=24
tcTypes['S']=25
tcTypes['C']=30

tempUnits = {}
tempUnits['K']=0
tempUnits['C']=1
tempUnits['F']=2

function ainEFConfigTC(chNum, tcType, unit, cjcMBAddr, cjcSlope, cjcOffset)
    MB.W(9000 + chNum * 2, 1, 0) -- Disable AIN_EF
    MB.W(9000 + chNum * 2, 1, tcTypes[tcType]) -- Enable AIN_EF
    MB.W(9300 + chNum * 2, 1, tempUnits[tcType]) -- Write to _EF_CONFIG_A
    MB.W(9600 + chNum * 2, 1, cjcMBAddr) -- Write to _EF_CONFIG_B
    MB.W(10200 + chNum * 2, 3, cjcSlope) -- Write to _EF_CONFIG_D
    MB.W(10500 + chNum * 2, 3, cjcOffset) -- Write to _EF_CONFIG_E
end

function ainChConfig(ainChNum, range, resolution, settling, isDifferential)
    MB.W(40000 + ainChNum * 2, 3, range) -- Set AIN Range
    MB.W(41500 + ainChNum * 1, 0, resolution) -- Set Resolution Index
    MB.W(42000 + ainChNum * 2, 3, settling) -- Set Settling US

    dt = MB.R(60000, 3) -- Read device type
    if isDifferential and (ainChNum%2 == 0) and (dt == 7) then
        -- The negative channels setting is only valid for even
        -- analog input channels and is not valid for the T4.
        if (ainChNum < 14) then
            -- The negative channel is 1+ the channel for AIN0-13 on the T7
            MB.W(41000 + ainChNum, 0, ainChNum + 1)
        elseif (ainChNum > 47) then
            -- The negative channel is 8+ the channel for AIN48-127 on the T7
            -- when using a Mux80.
            -- https://labjack.com/support/datasheets/accessories/mux80
            MB.W(41000 + ainChNum, 0, ainChNum + 8)
        else
            print(string.format("Can not set negative channel for AIN%d",ainChNum))
        end
    end
end

ainChannels = {0, 2} -- Enable AIN0 and AIN2
tcType = "J"
tempUnit = "K"
cjcAddr = 60052 -- Use the device's internal temp sensor, TEMPERATURE_DEVICE_K
range = 0.1
resolution = 8
settling = 0 -- Default
isDifferential = true

-- Configure each analog input
for i=1,table.getn(ainChannels) do
    -- As per our App-Note, we HIGHLY RECOMMEND configuring the AIN
    -- to use the differential input mode instead of single ended.
    -- Enable the following line to do so:
    ainChConfig(ainChannels[i],range,resolution,settling,isDifferential)

    ainEFConfigTC(ainChannels[i],tcType,tempUnit,cjcAddr)
end

LJ.IntervalConfig(0, 500)           --Configure interval
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then     --interval finished
    -- Read & Print out each read AIN channel
    for i=1, table.getn(ainChannels) do
        temperature = MB.R(7000 + ainChannels[i] * 2, 3)
        print(string.format("Temperature: %.3f %s", temperature, tempUnit))
    end
  end
end

