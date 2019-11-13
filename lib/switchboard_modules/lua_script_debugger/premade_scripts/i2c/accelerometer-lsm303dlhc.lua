--[[
    Name: accelerometer-lsm303dlhc.lua
    Desc: This is an example that uses the LSM303DLHC Accelerometer on the I2C
          Bus on EIO4(SCL) and EIO5(SDA)
--]]

--Outputs data to Registers:
--X = 46006
--Y = 46008
--Z = 46010

-------------------------------------------------------------------------------
--  Desc: Returns a number adjusted using the conversion factor
--        Use 1 if not desired
-------------------------------------------------------------------------------
local function convert_16_bit(msb, lsb, conv)
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

SLAVE_ADDRESS = 0x19

-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Make sure the device slave address is found
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
--Data Rate: 10Hz, disable low-power, enable all axes
I2C.write({0x20, 0x27})
-- Continuous update, LSB at lower addr, +- 2g, Hi-Res disable
I2C.write({0x23, 0x49})
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    local rawacceldata = {}
    -- Sequentially read the addresses containing the accel data
    for i=0, 5 do
      I2C.write({0x28+i})
      local indata = I2C.read(2)
      table.insert(rawacceldata, indata[1])
    end
    local acceldata = {}
    -- Convert the data into Gs
    for i=0, 2 do
      table.insert(acceldata, convert_16_bit(rawacceldata[1+i*2], rawacceldata[2+i*2], (0x7FFF/2)))
    end
    -- Add accelX value, in Gs, to the user_ram register
    MB.writeName("USER_RAM3_F32", acceldata[1])
    -- Add accelY
    MB.writeName("USER_RAM4_F32", acceldata[2])
    -- Add accelZ
    MB.writeName("USER_RAM5_F32", acceldata[3])
    print("X: "..acceldata[1])
    print("Y: "..acceldata[2])
    print("Z: "..acceldata[3])
    print("------")
  end
end