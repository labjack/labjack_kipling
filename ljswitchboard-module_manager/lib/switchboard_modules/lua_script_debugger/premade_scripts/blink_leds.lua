--[[
    Name: blink_leds.lua
    Desc: This example shows how to blink the status and COMM LEDs
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Blink the COMM and Status LEDs at 1 Hz.")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
local ledstatus = 0
local i = 0
local numiterations = 5
-- Set the LED operation to manual (This allows users to control the status
-- and COMM LEDs)
MB.writeName("POWER_LED", 4)
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while i < numiterations do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- If the LEDs are on
    if ledstatus == 1 then
      -- Turn the LEDs off
      ledstatus = 0
      print(ledstatus, "Off")
    else
      -- Turn the LEDs on
      ledstatus = 1
      print(ledstatus, "On")
    end
    -- Apply the changes to the LEDs
    MB.writeName("LED_COMM", ledstatus)
    MB.writeName("LED_STATUS", ledstatus)
    i = i + 1
  end
end

-- Set the LED operation back to normal
MB.writeName("POWER_LED", 1)
print("")
print("Finished")
-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)