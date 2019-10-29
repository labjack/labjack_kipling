--[[
    Name: 11_lua_io_ram.lua
    Desc: Example showing how to save and access data in USER RAM
    Note: The USER_RAM registers are useful in situations when a script is
          collecting readings, but external software running on a remote
          computer also needs to log or view the data. *formerly called LUA_IO_MEM

          The Lua script handles the complicated sensor comm(I2C, SPI, 1-Wire,
          etc), and then saves the resultant values to RAM.  Then, the external
          software simply reads the result out of the RAM registers.
          See the datasheet for more on USER RAM
            http://labjack.com/support/datasheets/t7/scripting

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Save some data to RAM for subsequent access by an external computer.")
--To get started, simply run the script.
--Once the script is running, open up the Register Matrix, and search USER_RAM0_F32
--add this USER_RAM0_F32 register to the active watch area, and
--view cooldata changing in real-time!
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
if devtype == 4 then
  -- If using a T4 and the firmware does not meet the minimum requirement
  if fwversion < t4minfirmware then
    print("Error: this example requires firmware version", t4minfirmware, "or higher on the T4")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
elseif devtype == 7 then
  -- If using a T7 and the firmware does not meet the minimum requirement
  if fwversion < t7minfirmware then
    print("Error: this example requires firmware version", t7minfirmware, "or higher on the T7")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
end

-- This is the data to store in USER_RAM
local cooldata = 0
-- Configure an interval of 100ms
LJ.IntervalConfig(0, 100)

-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    MB.writeName("USER_RAM0_F32", cooldata)
    print("cooldata:", cooldata, "\n")
    cooldata = cooldata + 1
  end
end