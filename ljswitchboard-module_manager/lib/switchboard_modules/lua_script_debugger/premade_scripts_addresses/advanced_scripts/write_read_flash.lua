--[[
    Name: write_read_flash.lua
    Desc: Demonstrates how to write and read internal flash
    Note: Lua works with single precision floats, so 32-bit registers should be
          written & read as two 16-bit values. See this page for more details:
            https://labjack.com/support/datasheets/t-series/lua-scripting#32-bit
--]]

-- Give Lua higher priority
LJ.setLuaThrottle(100)
print("\nWrite values to internal flash then read them back out\n")
local usersectionkey = {0x6615, 0xE336}
local clearkey = {0x0000,0x0000}

local startaddress = {0x0000,0x0000}
local writevals = {0x1234, 0x5678, 0x9876, 0x5432, 0x0000, 0x7898, 0x7654, 0x3210}
local err
print("Erasing flash now...")
LJ.ResetOpCount()
-- Set the flash key to look at the user section of flash
MB.WA(61800, 0, 2, usersectionkey)
-- Erase a (4KB) section of flash before writing to it
err = MB.WA(61820, 0, 2, startaddress)
-- Clear the flash key
MB.WA(61800, 0, 2, clearkey)
if err ~= 0 then
  print("  ... Failed to erase flash section.")
  MB.W(6000, 1, 0)
else
  print(" ... Successfully erased flash section")
end

print("Writing flash now...")
LJ.ResetOpCount()
-- Move the write pointer to the starting address of interest
MB.WA(61830, 0, 2, startaddress)
-- Set the flash key to look at the user section of flash
MB.WA(61800, 0, 2, usersectionkey)
-- Write 32-bit values to the user section
err = MB.WA(61832, 0, 8, writevals)
-- Clear the flash key
MB.WA(61800, 0, 2, clearkey)
if err ~= 0 then
  print("  ... Failed to write flash section.")
  MB.W(6000, 1, 0)
else
  print(" ... Successfully wrote flash section\n")
end

print("Reading flash now...")
for i=0,3 do
  local readvals = {}
  -- Values are accessed by 32-bit values, addressed by byte; 4 bytes=32 bits
  local relativeaddress = i*4
  -- Convert the 32-bit address to two 16-bit values
  local addressMSW = startaddress[1]
  local addressLSW = relativeaddress + startaddress[2]
  -- If the variable holding the LSW data is bigger than 16-bits adjust
  -- so that it only holds the LSW (Move the "overflow" to the MSW)
  if addressLSW > 0xFFFF then
    local LSWoverflow = bit.band(0xFFFF0000, addressLSW)
    addressLSW = addressLSW - LSWoverflow
    addressMSW = addressMSW + LSWoverflow
  end
  local addressarr = {addressMSW, addressLSW}

  LJ.ResetOpCount()
  -- Move the read pointer to the starting address of a 32-bit value in flash
  MB.WA(61810, 0, 2, addressarr)
  -- Read a 32-bit value from flash
  readvals,err = MB.RA(61812, 0, 2)
  if err ~= 0 then
    print("  ... Failed to read flash section.")
    MB.W(6000, 1, 0)
  end
  -- Reprint our read value as a hexadecimal number
  print(string.format("readval MSW: 0x%x\t readval LSW: 0x%x", readvals[1], readvals[2]))
end
print("\nDone!\n")
-- Stop the script
MB.W(6000, 1, 0)
