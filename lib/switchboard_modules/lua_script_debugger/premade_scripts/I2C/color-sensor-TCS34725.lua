--This is an example that uses the TCS34725 Color Sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--See datasheet for TCS34725 for more information
--Outputs data to Registers:
--Raw:
--clear: 46100
--red: 46102
--green: 46104
--blue: 46106
--Intensity:
--red: 46000
--green: 46002
--blue: 46004

I2C_Utils= {}
function I2C_Utils.configure(self, isda, iscl, ispeed, ioptions, islave, idebug)--Returns nothing   
  self.sda = isda
  self.scl = iscl
  self.speed = ispeed
  self.options = ioptions
  self.slave = islave
  self.debugEn = idebug
  MB.W(5100, 0, self.sda)
  MB.W(5101, 0, self.scl)
  MB.W(5102, 0, self.speed)
  MB.W(5103, 0, self.options)
  MB.W(5104, 0, self.slave)
end
function I2C_Utils.data_read(self, inumBytesRX)--Returns an array of {numAcks, Array of {bytes returned}}   
  self.numBytesRX = inumBytesRX
  self.numBytesTX = 0
  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  MB.W(5110, 0, 1)
  dataRX = MB.RA(5160, 99, self.numBytesRX)
  numAcks = MB.R(5114, 1)
  return {numAcks, dataRX}
end
function I2C_Utils.data_write(self, idataTX)--Returns an array of {NumAcks, errorVal}   
  self.numBytesRX = 0
  self.dataTX = idataTX
  self.numBytesTX = table.getn(self.dataTX)
  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  errorVal = MB.WA(5120, 99, self.numBytesTX, self.dataTX)
  MB.W(5110, 0, 1)
  numAcks = MB.R(5114, 1)
  return {numAcks, errorVal}
end
function I2C_Utils.data_write_and_read(self, idataTX, inumBytesRX)--Returns an array of {numAcks, Array of {bytes returned}, errorVal}   
  self.dataTX = idataTX
  self.numBytesRX = inumBytesRX
  self.numBytesTX = table.getn(self.dataTX)

  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  errorVal = MB.WA(5120, 99, self.numBytesTX, self.dataTX)
  MB.W(5110, 0, 1)
  numAcks = MB.R(5114, 1)
  dataRX = MB.RA(5160, 99, self.numBytesRX)
  return {numAcks, dataRX, errorVal}
end
function I2C_Utils.calc_options(self, iresetAtStart, inoStopAtStarting, idisableStretching)--Returns a number 0-7    
  self.resetAtStart = iresetAtStart
  self.noStop = inoStopAtStarting
  self.disableStre = idisableStretching
  optionsVal = 0
  optionsVal = self.resetAtStart*1+self.noStop*2+self.disableStre*4
  return optionsVal
end
function I2C_Utils.find_all(self, ilower, iupper)--Returns an array of all valid addresses, in number form  
  validAddresses = {}
  origSlave = self.slave
  for i = ilower, iupper do
    slave = i
    MB.W(5104, 0, slave)
    self.numBytesTX = 0
    self.numBytesRX = 1
    MB.W(5108, 0, self.numBytesTX)
    MB.W(5109, 0, self.numBytesRX)
    MB.W(5110, 0, 1)
    numAcks = MB.R(5114, 1)
    
    if numAcks ~= 0 then
      table.insert(validAddresses, i)
      -- print("0x"..string.format("%x",slave).." found")
    end
    for j = 0, 1000 do
      --delay
    end
  end
  addrLen = table.getn(validAddresses)
  if addrLen == 0 then
    print("No valid addresses were found  over the range")
  end
  MB.W(5104, 0, origSlave)
  return validAddresses
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

myI2C = I2C_Utils

SLAVE_ADDRESS = 0x29
myI2C.configure(myI2C, 13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = myI2C.find_all(myI2C, 0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    break
  end
end

--init slave
MB.W(2006, 0, 1)

LJ.IntervalConfig(0, 1500)             
stage = 0 --used to control program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      LJ.IntervalConfig(0, 100)
      stage = 1
    elseif stage == 1 then
      myI2C.data_write(myI2C, {0x80+0x00, 0x03})
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      dataIn = {}
      for i=0,3 do
        myI2C.data_write(myI2C, {0x80+0x14+2*i, 0x80+0x15+2*i})
        raw = myI2C.data_read(myI2C, 2)[2]
        table.insert(dataIn, raw[2]*256+raw[1])
      end
      MB.W(46100, 1, dataIn[1])--write clear light value in raw form
      MB.W(46102, 1, dataIn[2])--write red
      MB.W(46104, 1, dataIn[3])--write green
      MB.W(46106, 1, dataIn[4])--write blue
      red =   ((dataIn[2])/dataIn[1])
      MB.W(46000, 3, red)
      green = ((dataIn[3])/dataIn[1])
      MB.W(46002, 3, green)
      blue =  ((dataIn[4])/dataIn[1])
      MB.W(46004, 3, blue)
      --print(red, green, blue)--print relative (to clear) intesity
      print("Clear:", dataIn[1], "Red:",  dataIn[2], "Green:",  dataIn[3], "Blue:", dataIn[4])--print absolute intesity
      if red > blue and red > green then
        print("Dominant: Red")
      elseif blue > green and blue > red then
        print("Dominant: Blue")
      else
        print("Dominant: Green")
      end
      print("-----------")
      LJ.IntervalConfig(0, 1000)
      stage = 0
    end
  end
end