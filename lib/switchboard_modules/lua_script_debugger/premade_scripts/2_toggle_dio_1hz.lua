--[[
    Name: 2_toggle_dio_1hz.lua
    Desc: This example shows how to toggle DIO
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Toggle the digital I/O called FIO3 (FIO5 on T4) at 1 Hz. Generates a 0.5Hz square wave.")
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
-- Assume the user is using a T7, toggle FIO3
local outpin = 2003
if devtype == 4 then
  -- If the user is actually using a T4, toggle FIO5
  outpin = 2005
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

local diostatus = 0
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- If the DIO pin is set high
    if diostatus == 1 then
      -- Set the DIO pin low
      diostatus = 0
      print(diostatus, "low")
    else
      -- Set the DIO pin high
      diostatus = 1
      print(diostatus, "high")
    end
    -- Apply the change to the DIO pin register (toggle on or off)
    MB.W(outpin, diostatus)
  end
end
