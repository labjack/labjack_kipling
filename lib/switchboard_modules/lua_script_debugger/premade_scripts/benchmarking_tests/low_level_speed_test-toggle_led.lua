--[[
    Name: low_level_speed_test-toggle_led.lua
    Desc: This example will toggle the orange LED as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local check_interval = LJ.CheckInterval
local toggle_led = LJ.ledtog

print("Low-Level Benchmarking Test: toggle orange status LED as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 40
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- Use an interval of 2000ms
local interval = 2000
local numwrites = 0

LJ.IntervalConfig(0, interval)
while true do
  toggle_led()
  numwrites = numwrites + 1
  -- If the 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end