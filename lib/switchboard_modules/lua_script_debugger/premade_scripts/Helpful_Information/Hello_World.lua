-- hello world.lua
-- the first program in every language
-- see the full Lua functions list at http://www.lua.org/manual/5.2/manual.html#3

LJ.IntervalConfig(0, 1000)
local checkInterval=LJ.CheckInterval		--local function for faster processing

while true do

  if checkInterval(0) then

    --Code to run once per second here.
    print("Hello world, from ", _VERSION, "!\n")

  end

end