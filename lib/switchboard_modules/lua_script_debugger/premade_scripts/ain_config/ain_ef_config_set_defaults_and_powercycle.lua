--[[
    Name: ain_ef_config_set_defaults_and_powercycle.lua
    Desc: This is a general AIN_EF config example that shows the basic process
          for configuring any AIN_EF feature on a T-Series device, saving them
          as defaults, and powercycling the device. This example configures
          AIN0 and AIN2 to enable the Average/Min/Max extended feature.
          For a list of all AIN_EF options, see the T-Series datasheet:
            https://labjack.com/support/datasheets/t-series/ain/extended-features

    Note: This should not be run multiple times. It will gradually cause flash wear
--]]

-- Assign global functions locally for faster processing
local modbus_write = MB.W

-------------------------------------------------------------------------------
--  Desc: Generic function that can be used to configure general analog input
--        settings such as range, resolution, and settling. More information
--        about these settings can be found on the LabJack website under the
--        AIN section:
--          https://labjack.com/support/datasheets/t-series/ain
-------------------------------------------------------------------------------
local function ain_ef_config(
  channelnum,
  index,
  configa,
  configb,
  configc,
  configd,
  confige,
  configf,
  configg,
  configh,
  configi,
  configj
)
  -- Disable AIN_EF
  modbus_write(9000 + channelnum * 2, 1, 0)
  -- Enable AIN_EF
  modbus_write(9000 + channelnum * 2, 1, index)
  modbus_write(9300 + channelnum * 2, 1, configa)
  modbus_write(9600 + channelnum * 2, 1, configb)
  modbus_write(9900 + channelnum * 2, 1, configc)
  modbus_write(10200 + channelnum * 2, 3, configd)
  modbus_write(10500 + channelnum * 2, 3, confige)
  modbus_write(10800 + channelnum * 2, 3, configf)
  modbus_write(11100 + channelnum * 2, 3, configg)
  modbus_write(11400 + channelnum * 2, 3, configh)
  modbus_write(11700 + channelnum * 2, 3, configi)
  modbus_write(12000 + channelnum * 2, 3, configj)
end

print("Generic Config AIN_EF & set power-up defaults")
-- Enable AIN0 and AIN2
local ainchannels = {0, 2}
-- Index 3 is the max,min, average feature
local index = 3
local numsamples = 200
-- Set the device to scan at 6000 samples per second
local scanrate = 6000

-- Configure each analog input
for i=1,table.getn(ainchannels) do
    ain_ef_config(ainchannels[i], index,numsamples,0,0,scanrate,0,0,0,0,0,0)
end

-- Set as power-up default
print("Saving settings as power-up defaults")
modbus_write(49002, 1, 1)

-- Re-set device
print("Rebooting Device")
-- Write to SYSTEM_REBOOT so the system reboots after 200ms (last 4 bytes of
-- the write value tells the device how many 50ms ticks to wait before reboot)
modbus_write(61998, 1, 0x4C4A0004)

