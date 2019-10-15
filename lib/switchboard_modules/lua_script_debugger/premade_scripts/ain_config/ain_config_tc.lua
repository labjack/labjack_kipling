--[[
    Name: ain_config_tc.lua
    Desc: This is an example that illustrates specifically how to Enable a
          thermocouple to be read on AIN0 in differential input mode. For the
          most up to date thermocouple type constants, see the
          T-Series datasheet page:
            https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple

          For general assistance with thermocouples, read our general
          thermocouples App-Note as well as the related device-specific one:
            https://labjack.com/support/app-notes/thermocouples
--]]

-- Assign functions locally for faster processing
local modbus_read = MB.R
local modbus_write = MB.W
local interval_config = LJ.IntervalConfig
local check_interval = LJ.CheckInterval

-------------------------------------------------------------------------------
--  Desc: This function can be used to configure the extended AIN feature
--        settings designed for thermocouples such as thermocouple type,
--        temperature unit used, temperature probe address, cjc slope, and cjc
--        offset. See the thermocouple datasheet in the script description for
--        more information on these settings
-------------------------------------------------------------------------------
local function ain_ef_config_tc(ainchannel, tctype, unit, cjcaddressess, cjcslope, cjcoffset)
  -- Disable AIN_EF
  modbus_write(9000 + ainchannel * 2, 1, 0)
  -- Enable AIN_EF
  modbus_write(9000 + ainchannel * 2, 1, tctype)
  -- Write to _EF_CONFIG_A
  modbus_write(9300 + ainchannel * 2, 1, unit)
  -- Write to _EF_CONFIG_B
  modbus_write(9600 + ainchannel * 2, 1, cjcaddressess)
  -- Write to _EF_CONFIG_D
  modbus_write(10200 + ainchannel * 2, 3, cjcslope)
  -- Write to _EF_CONFIG_E
  modbus_write(10500 + ainchannel * 2, 3, cjcoffset)
end

-------------------------------------------------------------------------------
--  Desc: This function can be used to configure general analog input settings
--        such as range, resolution, and settling.  More information about
--        these settings can be found on the LabJack website under the AIN
--        section:
--          https://labjack.com/support/datasheets/t-series/ain
-------------------------------------------------------------------------------
local function ain_channel_config(ainchannel, range, resolution, settling, isdifferential)
  -- Set AIN range
  modbus_write(40000 + ainchannel * 2, 3, range)
  -- Set resolution index
  modbus_write(41500 + ainchannel * 1, 0, resolution)
  -- Set settling time
  modbus_write(42000 + ainchannel * 2, 3, settling)

  -- Read the device type
  local devicetype = modbus_read(60000, 3)
  -- Setup the negative channel if using a differential input
  if isdifferential and (ainchannel%2 == 0) and (devicetype == 7) then
    -- The negative channels setting is only valid for even
    -- analog input channels and is not valid for the T4.
    if (ainchannel < 14) then
      -- The negative channel is 1+ the channel for AIN0-13 on the T7
      modbus_write(41000 + ainchannel, 0, ainchannel + 1)
    elseif (ainchannel > 47) then
      -- The negative channel is 8+ the channel for AIN48-127 on the T7
      -- when using a Mux80.
      -- https://labjack.com/support/datasheets/accessories/mux80
      modbus_write(41000 + ainchannel, 0, ainchannel + 8)
    else
      print(string.format("Can not set negative channel for AIN%d",ainchannel))
    end
  end
end

-- AIN#_EF_INDEX values for each thermocouple type
local tctypes = {}
tctypes["E"] = 20
tctypes["J"] = 21
tctypes["K"] = 22
tctypes["R"] = 23
tctypes["T"] = 24
tctypes["S"] = 25
tctypes["C"] = 30
-- AIN#_EF_CONFIG_A values corresponding to their temperature units
local tempunits = {}
tempunits["K"] = 0
tempunits["C"] = 1
tempunits["F"] = 2
-- Enable AIN0 and AIN2
local ainchannels = {0, 2}
local tctype = "J"
local tempunit = "K"
-- Use the device"s internal temp sensor, TEMPERATURE_DEVICE_K
local cjcaddress = 60052
local range = 0.1
local resolution = 8
-- Use default settling time
local settling = 0
local isdifferential = true

-- Configure each analog input
for i=1,table.getn(ainchannels) do
  -- As per our App-Note, we HIGHLY RECOMMEND configuring the AIN
  -- to use the differential input mode instead of single ended.
  -- Enable the following line to do so:
  ain_channel_config(ainchannels[i],range,resolution,settling,isdifferential)
  ain_ef_config_tc(ainchannels[i],tctypes[tctype],tempunits[tempunit],cjcaddress)
end

--Configure a 500ms interval
interval_config(0, 500)
local checkInterval=LJ.CheckInterval

while true do
  --If the interval has finished
  if check_interval(0) then
    -- Read & Print out each read AIN channel
    for i=1, table.getn(ainchannels) do
      local temperature = modbus_read(7000 + ainchannels[i] * 2, 3)
      print(string.format("Temperature: %.3f %s", temperature, tempunit))
    end
  end
end

