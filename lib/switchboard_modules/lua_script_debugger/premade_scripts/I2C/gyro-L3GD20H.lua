--This is an example that uses the LSM303DLHC Accelerometer & Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X gyro = 46012
--Y gyro = 46014
--Z gyro = 46016

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
  return res
end

SLAVE_ADDRESS = 0x6B
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


--init slave
I2C.write({0x21, 0x00})--1. Write CTRL2, disable filtering
I2C.write({0x22, 0x00})--2. Write CTRL3, disable interupts
I2C.write({0x23, 0x60})--3. Write CTRL4, continuous update, MSB at lower addr,2000 deg per second 
I2C.write({0x25, 0x00})--5. Write Reference to default 0
I2C.write({0x24, 0x00})--9. Write CTRL5, disable FIFO and interupts
I2C.write({0x20, 0xBF})--10. Write CTRL1, enable all axes, 380Hz ODR

LJ.IntervalConfig(0, 200)
while true do
  if LJ.CheckInterval(0) then

    dataRaw = {}
    for i=0, 5 do
      I2C.write({0x28+i})
      dataIn, errorIn = I2C.read(2)
      table.insert(dataRaw, dataIn[1])
    end
    data = {}
    for i=0, 2 do
      table.insert(data, convert_16_bit(dataRaw[1+i*2], dataRaw[2+i*2], (0x7FFF/2000)))
      MB.W(46012+i*2, 3, data[i+1])
    end
    print("X: "..data[1])
    print("Y: "..data[2])
    print("Z: "..data[3])
    print("------")
  end
end