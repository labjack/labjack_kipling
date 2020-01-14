--[[
    Name: read_saved_script.lua
    Desc: This example shows how to read a Lua Script saved to flash.
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("\r\n\r\nReading saved Lua Script")
local LJ_Product_ID = MB.readName("PRODUCT_ID")


-- Check device compatibility
if LJ_Product_ID == 7 then
elseif LJ_Product_ID == 4 then
else
  print("Unknown Device. Exiting")
  MB.writeName("LUA_RUN", 0)
end

--Define constants:
local EFAdd_LuaScript = 0x3D0000 -- Location in flash for Lua Scripts
local EFLen_Lua_Script = 0x10000 -- Length of dedicated flash space.
local LUA_HEADER_SIZE = 256 -- Size of "header".
local LUA_SRC_START = EFAdd_LuaScript + LUA_HEADER_SIZE

--[[
Lua header information is:

float Lua_SavedVersion
uint32 SrcLen
....
--]]

function sleep(time_ms)
    LJ.IntervalConfig(7, time_ms)  
    while( LJ.CheckInterval(7) ~= 1 )do
    end
end

function readFlash(addr)
	MB.W(61810, 1, addr) -- write: INTERNAL_FLASH_READ_POINTER
  	return MB.RA(61812, 99, 4) -- read: 
end

-- Read the saved Lua Script length
local scriptSize = 0
scriptSizePartials = readFlash(EFAdd_LuaScript+4)
scriptSize = scriptSizePartials[1] + scriptSizePartials[2]*256

-- Convert size from num butes to num uint32.
local rem = scriptSize%4
local numReads = scriptSize/4
if rem>0 then
	numReads = numReads + 1
end

-- Read out script into a local buffer & print after detecting each \n character.
local addr = 0
local vals = {}
local luaStr = ''

print('Saved Script is length:', scriptSize)
print('')
print('"""""START""""""')
for i=0, numReads-1, 1 do
  addr = LUA_SRC_START + 4*i
  vals = readFlash(addr)
  for j in pairs(vals) do
    if vals[j] == 10 then -- Print after detecting a new-line character.
      print(luaStr)
      luaStr = ''
    else
      if vals[j] ~= 255 then
        luaStr = luaStr .. string.char(vals[j])
      end
    end
  end

  sleep(20)
end
print(luaStr)
print('"""""END""""""')
MB.W(6000,1, 0)