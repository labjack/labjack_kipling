--[[
    Name: hello world.lua
    Desc: The first program in every language. Prints hello world every second
          for 5 seconds
    Note: See the full Lua functions list at http://www.lua.org/manual/5.2/manual.html#3
--]]

-- Assign functions locally for faster processing
local interval_config = LJ.IntervalConfig
local check_interval = LJ.CheckInterval
local modbus_write_name = MB.writeName

-- Set interval timer 0 with a 1000ms interval
interval_config(0, 1000)
-- Set interval timer 1 with a 5s interval
interval_config(1, 5000)
local done = false

-- loop while our 5s interval is not finished
while not done do
  -- If interval 0 is up (1000ms have passed) print hello world
  if check_interval(0) then
    print("Hello world, from ", _VERSION, "!\n")
  end
  -- If interval 1 is up (5s have passed) stop this loop
  if check_interval(1) then
    done = true
  end
end

print("Exiting Lua Script")
-- Writing 0 to LUA_RUN stops the script
modbus_write_name("LUA_RUN", 0)