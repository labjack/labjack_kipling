--This is an example that uses the LSM303DLHC Accelerometer & Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X accel = 46006
--Y accel = 46008
--Z accel = 46010

function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

SLAVE_ADDRESS = 0x19
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    break
  end
end

--init slave
I2C.write({0x20, 0x27})
I2C.write({0x23, 0x49})

LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then

    dataRaw = {}
    -- I2C.write({0x28})
    -- dataIn = I2C.read(6)[2]  
    for i=0, 5 do
      I2C.write({0x28+i})
      dataIn = I2C.read(1)
      table.insert(dataRaw, dataIn[1])
    end
    data = {}
    for i=0, 2 do
      table.insert(data, convert_16_bit(dataRaw[1+i*2], dataRaw[2+i*2], (0x7FFF/2)))
      MB.W(46006+i*2, 3, data[i+1])
    end
    print("X: "..data[1])
    print("Y: "..data[2])
    print("Z: "..data[3])
    print("------")
  end
end