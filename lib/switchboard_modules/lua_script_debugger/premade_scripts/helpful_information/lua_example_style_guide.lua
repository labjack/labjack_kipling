--[[
    Name: lua_example_style_guide.lua
    Desc: A template / style guide for lua script examples
    Note: I tried to model this guide off of the style used in the Lua manuals
--]]

-- Try to use locals rather than globals whenever possible
-- Assign any functions like MB.R as locals at the start of the script
local modbus_read = MB.R

-- Constants should be uppercase with underscores between words
local NUM_ITERATIONS = 10

-------------------------------------------------
--  Desc: Sample function and description
--
--  Note: Use snake_case for functions and try to
--        keep function definitions at the top
--        of the files
-------------------------------------------------
local function my_function(register, regtype, iterations)
  -- Use two spaces for indentation
  local sumval
  for i=0, iterations do
    -- Limit scope whenever possible
    local tempval = modbus_read(register, regtype)
    tempval = i*tempval
    sumval = sumval + tempval
  end
  return sumval
end

-- Strings should be in double quotes
local name = "FIO0"
-- Variables should be lowercase
local regtype = 0
local register = 2000
local printval = my_function(register, regtype, NUM_ITERATIONS)
print(name, printval)