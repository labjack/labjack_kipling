--[[
    Name: sleep_function.lua
    Desc: blink the LED and implement a software-sleep function.
--]]

print("Example implementation of a software defined sleep function")

function sleep(time_ms)
    LJ.IntervalConfig(7, time_ms)  
    while( LJ.CheckInterval(7) ~= 1 )do
    end
end


-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
local ledstatus = 0
local i = 0
local numiterations = 5
-- Set the LED operation to manual (This allows users to control the status
-- and COMM LEDs)
MB.writeName("POWER_LED", 4)

-- Turn off LEDs
MB.writeName("LED_COMM", 0)
MB.writeName("LED_STATUS", 0)

sleep(1000)

-- Turn on LEDs
MB.writeName("LED_COMM", 1)
MB.writeName("LED_STATUS", 1)

sleep(1000)

-- Set the LED operation back to normal
MB.writeName("POWER_LED", 1)
print("")
print("Finished")

-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)

