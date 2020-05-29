--[[
    Name: proximity-vl6180x.lua
    Desc: This is an example that uses the VL6180X TOF Ranging sensor on the
          I2C Bus on EIO4(SCL) and EIO5(SDA), following the AN4545 Application
          note
    Note: I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

--Outputs data to Registers:
-- Value in mm: 46080
-- Value in in: 46000

SLAVE_ADDRESS = 0x29

si = {}
si[1] =  {0x02, 0x07, 0x01}
si[2] =  {0x02, 0x08, 0x01}
si[3] =  {0x00, 0x96, 0x00}
si[4] =  {0x00, 0x97, 0xfd}
si[5] =  {0x00, 0xe3, 0x00}
si[6] =  {0x00, 0xe4, 0x04}
si[7] =  {0x00, 0xe5, 0x02}
si[8] =  {0x00, 0xe6, 0x01}
si[9] =  {0x00, 0xe7, 0x03}
si[9] =  {0x00, 0xf5, 0x02}
si[10] = {0x00, 0xd9, 0x05}
si[11] = {0x00, 0xdb, 0xce}
si[12] = {0x00, 0xdc, 0x03}
si[13] = {0x00, 0xdd, 0xf8}
si[14] = {0x00, 0x9f, 0x00}
si[15] = {0x00, 0xa3, 0x3c}
si[16] = {0x00, 0xb7, 0x00}
si[17] = {0x00, 0xbb, 0x3c}
si[18] = {0x00, 0xb2, 0x09}
si[19] = {0x00, 0xca, 0x09}
si[20] = {0x01, 0x98, 0x01}
si[21] = {0x01, 0xb0, 0x17}
si[22] = {0x01, 0xad, 0x00}
si[23] = {0x00, 0xff, 0x05}
si[24] = {0x01, 0x00, 0x05}
si[25] = {0x01, 0x99, 0x05}
si[26] = {0x01, 0xa6, 0x1b}
si[27] = {0x01, 0xac, 0x3e}
si[28] = {0x01, 0xa7, 0x1f}
si[29] = {0x00, 0x30, 0x00}
-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Verify that the target device was found
for i=1, addrslen do
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.writeName("LUA_RUN", 0)
end
local errorout = 0
--send the necessary initialization bytes to the slave
for i = 1, 29 do
  errorout = I2C.write(I2C, si[i])
end
if errorout == 0 then
  print("Sensor Initialized")
else
  print("Writing si["..i.."] failed")
end
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)
-- Used to monitor program progress
local stage = 0
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if stage == 0 then
      I2C.write({0x00, 0x18, 0x03})
      -- Set an interval to give the range finder some processing time
      LJ.IntervalConfig(0, 40)
      stage = 1
    elseif stage == 1 then
      I2C.write({0x00, 0x62})
      -- Set an interval to give the range finder some processing time
      LJ.IntervalConfig(0, 40)
      stage = 2
    elseif stage == 2 then
      distRaw = I2C.read(2)
      --Store value, in mm, for the user to access in another program
      MB.writeName("USER_RAM0_I32", distRaw[2])
      -- Store the value in inches in USER_RAM
      MB.writeName("USER_RAM0_F32",  distRaw[2]/25.4)
      print("Distance: "..string.format("%.2f", distRaw[2]).."mm "..string.format("%.2f", distRaw[2]/25.4).."in")
      --reset the initial Interval
      LJ.IntervalConfig(0, 420)
      stage = 0
    end
  end
end


