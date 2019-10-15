--[[
    Name: low_level_speed_test-toggle_led.lua
    Desc: This example will toggle the orange LED at 30-40kHz
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

-- Assign functions locally for faster processing
local set_lua_throttle = LJ.setLuaThrottle
local get_lua_throttle = LJ.getLuaThrottle
local interval_config = LJ.IntervalConfig
local check_interval = LJ.CheckInterval
local toggle_led = LJ.ledtog

print("Low-Level Benchmarking Test: toggle orange status LED as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. Default throttle setting is 10 instructions
local throttle = 40
set_lua_throttle(throttle)
throttle = get_lua_throttle()
print ("Current Lua Throttle Setting: ", throttle)

-- Use an interval of 2000ms
local interval = 2000
local numwrites = 0

interval_config(0, interval)
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