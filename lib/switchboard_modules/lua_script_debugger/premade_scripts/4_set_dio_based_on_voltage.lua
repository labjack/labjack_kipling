--[[
    Name: 4_set_dio_based_on_voltage.lua
    Desc: This example shows how to set DIO according to an input voltage
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Set a DIO based on voltage. Digital I/O is FIO3 (FIO5 on T4), voltage measured on AIN1. Update at 10Hz")
-- Assume the user is using a T7, toggle FIO3
local outpin = "FIO3"
local devtype = MB.readName("PRODUCT_ID")
-- If the user is actually using a T4, toggle FIO5
if devtype == 4 then
  outpin = "FIO5"
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