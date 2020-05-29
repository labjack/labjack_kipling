--[[
    Name: gyro-ps-itg-3200.lua
    Desc: This is an example that uses the PS-ITG-3200 Gyroscope on the I2C Bus
          on EIO4(SCL) and EIO5(SDA)
    Note: I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

--Outputs data to Registers:
--X gyro = 46000 (degrees per second)
--Y gyro = 46002
--Z gyro = 46004

-------------------------------------------------------------------------------
--  Desc: Returns a number adjusted using the conversion factor
--        Use 1 if not desired
-------------------------------------------------------------------------------
function convert_16_bit(msb, lsb, conv)
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return -1*res
end

SLAVE_ADDRESS = 0x69

-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
found = 0
--Verify that the target device was found
for i=1, addrsLen do
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
-- Initialize the sensor
I2C.write({0x15, 0x00})
I2C.write({0x16, 0x18})
I2C.write({0x3E, 0x00})
-- Configure an interval of 200ms
LJ.IntervalConfig(0, 200)
error=0

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- 0x1D for X-axis for starting register. see the datasheet for more info
    local reg = 0x1D
    local raw = {0, 0}
    raw[1] = I2C.writeRead({reg}, 1)[1]
    raw[2] = I2C.writeRead({reg+1}, 1)[1]
    raw[3] = I2C.writeRead({reg+2}, 1)[1]
    raw[4] = I2C.writeRead({reg+3}, 1)[1]
    raw[5] = I2C.writeRead({reg+4}, 1)[1]
    raw[6] = I2C.writeRead({reg+5}, 1)[1]
    local rateX = convert_16_bit(raw[1], raw[2], 14.375)
    local rateY = convert_16_bit(raw[3], raw[4], 14.375)
    local rateZ = convert_16_bit(raw[5], raw[6], 14.375)
    -- Rate = rotational rate in degrees per second (°/s)
    print("X: "..rateX)
    print("Y: "..rateY)
    print("Z: "..rateZ)
    print("----------")
    --write values to USER_RAM
    MB.writeName("USER_RAM0_F32", rateX)
    MB.writeName("USER_RAM1_F32", rateY)
    MB.writeName("USER_RAM2_F32", rateZ)
  end
end
