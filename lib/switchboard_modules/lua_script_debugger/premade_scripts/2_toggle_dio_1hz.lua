--[[
    Name: 2_toggle_dio_1hz.lua
    Desc: This example shows how to toggle DIO
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Toggle the digital I/O called FIO3 (FIO5 on T4) at 1 Hz. Generates a 0.5Hz square wave.")
-- The PRODUCT_ID register holds the device type
local devtype = MB.readName("PRODUCT_ID")
-- Assume the user is using a T7, toggle FIO3
local outpin = "FIO3"
if devtype == 4 then
  -- If the user is actually using a T4, toggle FIO5
  outpin = "FIO5"
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
    MB.writeName(outpin, diostatus)
  end
end
