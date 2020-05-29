--[[
    Name: gyro-l3gd20h.lua
    Desc: This is an example that uses the L3GD20H Gyroscope on the I2C Bus on
          EIO4(SCL) and EIO5(SDA)
    Note: I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

--Outputs data to Registers:
--X gyro = 46012
--Y gyro = 46014
--Z gyro = 46016

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

SLAVE_ADDRESS = 0x6B

--Configure the I2C Bus
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
-- Write CTRL2, disable filtering
I2C.write({0x21, 0x00})
-- Write CTRL3, disable interupts
I2C.write({0x22, 0x00})
-- Write CTRL4, continuous update, MSB at lower addr,2000 deg per second
I2C.write({0x23, 0x60})
-- Write Reference to default 0
I2C.write({0x25, 0x00})
-- Write CTRL5, disable FIFO and interupts
I2C.write({0x24, 0x00})
-- Write CTRL1, enable all axes, 380Hz ODR
I2C.write({0x20, 0xBF})
-- Configure a 200ms interval
LJ.IntervalConfig(0, 200)
local ramaddress = MB.nameToAddress("USER_RAM6_F32")
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    local rawgyrodata = {}
    for i=0, 5 do
      I2C.write({0x28+i})
      local indata = I2C.read(2)
      table.insert(rawgyrodata, indata[1])
    end
    local gyrodata = {}
    -- Get the gyro data and store it in USER_RAM
    for i=0, 2 do
      table.insert(gyrodata, convert_16_bit(rawgyrodata[1+i*2], rawgyrodata[2+i*2], (0x7FFF/2000)))
      MB.W(ramaddress+i*2, 3, gyrodata[i+1])
    end
    print("X: "..gyrodata[1])
    print("Y: "..gyrodata[2])
    print("Z: "..gyrodata[3])
    print("------")
  end
end