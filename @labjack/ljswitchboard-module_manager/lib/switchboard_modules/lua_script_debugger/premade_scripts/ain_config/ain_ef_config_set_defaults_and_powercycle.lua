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

  local indexaddress = MB.nameToAddress("AIN0_EF_INDEX")
  local confaddressa = MB.nameToAddress("AIN0_EF_CONFIG_A")
  local confaddressb = MB.nameToAddress("AIN0_EF_CONFIG_B")
  local confaddressc = MB.nameToAddress("AIN0_EF_CONFIG_C")
  local confaddressd = MB.nameToAddress("AIN0_EF_CONFIG_D")
  local confaddresse = MB.nameToAddress("AIN0_EF_CONFIG_E")
  local confaddressf = MB.nameToAddress("AIN0_EF_CONFIG_F")
  local confaddressg = MB.nameToAddress("AIN0_EF_CONFIG_G")
  local confaddressh = MB.nameToAddress("AIN0_EF_CONFIG_H")
  local confaddressi = MB.nameToAddress("AIN0_EF_CONFIG_I")
  local confaddressj = MB.nameToAddress("AIN0_EF_CONFIG_J")
  -- Disable AIN_EF
  MB.W(indexaddress + channelnum * 2, 1, 0)
  -- Enable AIN_EF
  MB.W(indexaddress + channelnum * 2, 1, index)
  MB.W(confaddressa + channelnum * 2, 1, configa)
  MB.W(confaddressb + channelnum * 2, 1, configb)
  MB.W(confaddressc + channelnum * 2, 1, configc)
  MB.W(confaddressd + channelnum * 2, 3, configd)
  MB.W(confaddresse + channelnum * 2, 3, confige)
  MB.W(confaddressf + channelnum * 2, 3, configf)
  MB.W(confaddressg + channelnum * 2, 3, configg)
  MB.W(confaddressh + channelnum * 2, 3, configh)
  MB.W(confaddressi + channelnum * 2, 3, configi)
  MB.W(confaddressj + channelnum * 2, 3, configj)
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
MB.writeName("IO_CONFIG_SET_DEFAULT_TO_CURRENT", 1)

-- Re-set device
print("Rebooting Device")
-- Write to SYSTEM_REBOOT so the system reboots after 200ms (last 4 hex vals of
-- the write value tells the device how many 50ms ticks to wait before reboot)
MB.writeNameArray("SYSTEM_REBOOT", 2, {0x4C4A, 0x0004}, 0)

