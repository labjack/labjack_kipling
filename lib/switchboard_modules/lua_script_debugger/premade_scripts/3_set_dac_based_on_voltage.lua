--[[
    Name: 3_set_dac_based_on_voltage.lua
    Desc: This example shows how to set a DAC according to an input voltage
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Read AIN3 input voltage and set DAC0 output voltage. Update at 10Hz")
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
if devtype == 4 then
  -- If using a T4 and the firmware does not meet the minimum requirement
  if fwversion < t4minfirmware then
    print("Error: this example requires firmware version", t4minfirmware, "or higher on the T4")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
elseif devtype == 7 then
  -- If using a T7 and the firmware does not meet the minimum requirement
  if fwversion < t7minfirmware then
    print("Error: this example requires firmware version", t7minfirmware, "or higher on the T7")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
end

local threshold = 2.5
local vout0 = 4.5
local vout1 = 0

-- Configure a 100ms interval
LJ.IntervalConfig(0, 100)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get an input voltage by reading AIN3
    local vin = MB.readName("AIN3")
    print("AIN3: ", vin, "V")
    -- If vin exceeds the threshold (2.5V)
    if vin > threshold then
      -- Set DAC0 to 4.5V
      MB.writeName("DAC0", vout0)
      print ("DAC0: ", vout0)
    else
      -- Set DAC0 to 0V
      MB.writeName("DAC0", vout1)
      print ("DAC0: ", vout1)
    end
  end
end