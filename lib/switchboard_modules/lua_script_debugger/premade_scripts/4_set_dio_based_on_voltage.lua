--[[
    Name: 4_set_dio_based_on_voltage.lua
    Desc: This example shows how to set DIO according to an input voltage
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Set a DIO based on voltage. Digital I/O is FIO3 (FIO5 on T4), voltage measured on AIN1. Update at 10Hz")
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
-- Assume the user is using a T7, toggle FIO3
local outpin = "FIO3"
-- If the user is actually using a T4, toggle FIO5
if devtype == 4 then
  outpin = "FIO5"
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

-- Configure a 100ms interval
LJ.IntervalConfig(0, 100)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get an input voltage by reading AIN1
    local vin = MB.readName("AIN1")
    print("AIN1: ", vin, "V")
    -- If vin exceeds the threshold (2.5V)
    if vin > threshold then
      -- Set outpin high
      MB.writeName(outpin, 1)
      print(1, "high")
    else
      -- Set outpin low
      MB.writeName(outpin, 0)
      print(0, "low")
    end
  end
end