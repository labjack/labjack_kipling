--This is an example that uses the VL6180X TOF Ranging sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA), following the AN4545 Application note.
--Outputs data to Registers:
-- Value in mm: 46080
-- Value in in: 46000

sI = {}
sI[1] =  {0x02, 0x07, 0x01}
sI[2] =  {0x02, 0x08, 0x01}
sI[3] =  {0x00, 0x96, 0x00}
sI[4] =  {0x00, 0x97, 0xfd}
sI[5] =  {0x00, 0xe3, 0x00}
sI[6] =  {0x00, 0xe4, 0x04}
sI[7] =  {0x00, 0xe5, 0x02}
sI[8] =  {0x00, 0xe6, 0x01}
sI[9] =  {0x00, 0xe7, 0x03}
sI[9] =  {0x00, 0xf5, 0x02}
sI[10] = {0x00, 0xd9, 0x05}
sI[11] = {0x00, 0xdb, 0xce}
sI[12] = {0x00, 0xdc, 0x03}
sI[13] = {0x00, 0xdd, 0xf8}
sI[14] = {0x00, 0x9f, 0x00}
sI[15] = {0x00, 0xa3, 0x3c}
sI[16] = {0x00, 0xb7, 0x00}
sI[17] = {0x00, 0xbb, 0x3c}
sI[18] = {0x00, 0xb2, 0x09}
sI[19] = {0x00, 0xca, 0x09}
sI[20] = {0x01, 0x98, 0x01}
sI[21] = {0x01, 0xb0, 0x17}
sI[22] = {0x01, 0xad, 0x00}
sI[23] = {0x00, 0xff, 0x05}
sI[24] = {0x01, 0x00, 0x05}
sI[25] = {0x01, 0x99, 0x05}
sI[26] = {0x01, 0xa6, 0x1b}
sI[27] = {0x01, 0xac, 0x3e}
sI[28] = {0x01, 0xa7, 0x1f}
sI[29] = {0x00, 0x30, 0x00}

I2C_Utils= {}

function I2C_Utils.configure(self, isda, iscl, ispeed, ioptions, islave, idebug)--Returns nothing   
  self.sdaNum = isda
  self.sclNum = iscl
  self.speed = ispeed
  self.options = ioptions
  self.slave = islave
  self.debugEnable = idebug
  MB.W(5100, 0, self.sdaNum)
  MB.W(5101, 0, self.sclNum)
  MB.W(5102, 0, self.speed)
  MB.W(5103, 0, self.options)
  MB.W(5104, 0, self.slave)
  if self.debugEnable == 1 then
    print("Configured I2C Bus")
  end
end
function I2C_Utils.data_read(self, inumBytesRX)--Returns an array of {numAcks, Array of {bytes returned}}   
  self.numBytesRX = inumBytesRX
  self.numBytesTX = 0

  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  
  MB.W(5110, 0, 1)
  
  dataRX = MB.RA(5160, 99, self.numBytesRX)
  numAcks = MB.R(5114, 1)
  
  if self.debugEnable == 1 then
    dataRXStr = ""
    for i=1, self.numBytesRX do
      dataRXStr = dataRXStr.."0x"..string.upper(string.format("%x",dataRX[i])).." "
    end
    print("Received "..dataRXStr.."with "..string.format("%d",numAcks).." acks")
  end
  
  return {numAcks, dataRX}--Array of {numAcks, Array of {bytes returned}}
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
  
  if self.debugEnable == 1 then
    dataTXStr = ""
    for i=1, self.numBytesTX do
      dataTXStr = dataTXStr.."0x"..string.upper(string.format("%x",self.dataTX[i])).." "
    end
    print("Transmitted "..dataTXStr.."with "..string.format("%d",numAcks).." acks")
  end

  return {numAcks, errorVal}--Array of {NumAcks, errorVal}
end
function I2C_Utils.calc_options(self, iresetAtStart, inoStopAtStarting, idisableStretching)--Returns a number 0-7    
  self.resetAtStart = iresetAtStart
  self.noStop = inoStopAtStarting
  self.disableStretching = idisableStretching
  optionsVal = 0
  optionsVal = self.resetAtStart*1+self.noStop*2+self.disableStretching*4
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
      if self.debugEnable == 1 then
        print("Recieved "..string.format("%d",numAcks).." acks from address ".."0x"..string.format("%x",slave).."(Hex) "..string.format("%d",slave).."(Decimal)")
      end
    end
    for j = 0, 1000 do
      --delay
    end
  end
  if self.debugEnable == 1 then
    addrLen = table.getn(validAddresses)
    if addrLen == 0 then
      print("No valid addresses were found  over the range "..string.format("%d", ilower).." to "..string.format("%d", iupper))
    end
  end
  MB.W(5104, 0, origSlave)
  return validAddresses
end

myI2C = I2C_Utils

SLAVE_ADDRESS = 0x29
myI2C.configure(myI2C, 13, 12, 65516, tempOptions, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = myI2C.find_all(myI2C, 0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    break
  end
end

for i = 1, 29 do--send the neccissarry intialization bytes to the slave    
  acks = myI2C.data_write(myI2C, sI[i])[1]
  if acks == 0 then
    print("Writing sint["..i.."] failed")
  end
end
print("Sensor Initialized")

LJ.IntervalConfig(0, 900)             --set interval to 900 for 900ms
stage = 0 --used to monitor program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      myI2C.data_write(myI2C, {0x00, 0x18, 0x03})
      LJ.IntervalConfig(0, 40)       --set interval to 100 for 100ms to give the range finder some processing time
      stage = 1
    elseif stage == 1 then
      myI2C.data_write(myI2C, {0x00, 0x62})
      LJ.IntervalConfig(0, 40)       --set interval to 100 for 100ms to give the range finder some processing time
      stage = 2
    elseif stage == 2 then
      distRaw = myI2C.data_read(myI2C, 2)[2]
      MB.W(46080, 2, distRaw[2])--Store value, in mm, for user to access with another program, such as LabVIEW or Python
      MB.W(46000, 3,  distRaw[2]/25.4)--Store value in in.
      print("Distance: "..string.format("%.2f", distRaw[2]).."mm "..string.format("%.2f", distRaw[2]/25.4).."in")
      LJ.IntervalConfig(0, 420)       --reset interval to 900ms
      stage = 0
    end
  end
end


