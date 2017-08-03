--This is an example that uses the PS-ITG-3200 Gyroscope on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X gyro = 46000 (degrees per second)
--Y gyro = 46002
--Z gyro = 46004

fwver = MB.R(60004, 3)
if fwver < 1.0224 then
  print("This lua script requires a firmware version of 1.0224 or higher. Program Stopping")
  MB.W(6000, 1, 0)
end

function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return -1*res
end

SLAVE_ADDRESS = 0x69

I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
found = 0
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.W(6000, 1, 0)
end

--init sensor
I2C.write({0x15, 0x00})
I2C.write({0x16, 0x18})
I2C.write({0x3E, 0x00})

LJ.IntervalConfig(0, 200)
error=0
while true do
  if LJ.CheckInterval(0) then
    reg = 0x1D--0x1D for X-axis for starting register. see page 22 of datasheet for more info
    raw = {0, 0}
    raw[1] = I2C.writeRead({reg}, 1)[1]
    raw[2] = I2C.writeRead({reg+1}, 1)[1]
    raw[3] = I2C.writeRead({reg+2}, 1)[1]
    raw[4] = I2C.writeRead({reg+3}, 1)[1]
    raw[5] = I2C.writeRead({reg+4}, 1)[1]
    raw[6] = I2C.writeRead({reg+5}, 1)[1]
    rateX = convert_16_bit(raw[1], raw[2], 14.375)
    rateY = convert_16_bit(raw[3], raw[4], 14.375)
    rateZ = convert_16_bit(raw[5], raw[6], 14.375)
    print("X: "..rateX)--rate = rotational rate in degrees per second (°/s)
    print("Y: "..rateY)
    print("Z: "..rateZ)
    print("----------")
    MB.W(46000, 3, rateX)--write to modbus registers USER_RAM0_F32
    MB.W(46002, 3, rateY)--write to modbus registers USER_RAM1_F32
    MB.W(46004, 3, rateZ)--write to modbus registers USER_RAM2_F32
  end
end
