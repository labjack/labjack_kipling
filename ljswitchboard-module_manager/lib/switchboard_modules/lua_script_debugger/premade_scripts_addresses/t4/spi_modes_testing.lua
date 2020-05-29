--This is an SPI example for the T4.  It tests SPI functionality using the
--standard loop-back methidology where a user must connect the MISO and MOSI
--data lines together.
print ("T4 SPI Loop-Back Example")


SPI_Utils={}
function SPI_Utils.configure(self, cs, clk, miso, mosi, mode, speed, options, debug)
  self.cs=cs
  self.clk=clk
  self.miso=miso
  self.mosi=mosi
  self.mode=mode
  self.speed=speed
  self.options=options
  self.debug=debug

  MB.W(5000, 0, cs)  --CS
  MB.W(5001, 0, clk)  --CLK
  MB.W(5002, 0, miso)  --MISO
  MB.W(5003, 0, mosi)  --MOSI

  MB.W(5004, 0, mode)  --Mode
  MB.W(5005, 0, speed)  --Speed
  MB.W(5006, 0, options)  --Options, enable CS
  
end
function SPI_Utils.transfer(self, txData)
  local numBytes = table.getn(txData)

  --Configure num bytes to read/write
  MB.W(5009, 0, numBytes)  --Num Bytes to Tx/Rx
  local errorVal = MB.WA(5010, 99, numBytes, txData) --SPI_DATA_TX
  MB.W(5007, 0, 1) --SPI_GO
  local rxData = MB.RA(5050, 99, numBytes) --SPI_DATA_RX
  return rxData
end
function SPI_Utils.transferString(self, txString)
  local numBytes = string.len(txString)

  local txData={}
  for i=1,numBytes do
    txData[i]=string.byte(txString,i)
  end
  
  --Append a null character
  -- numBytes += 1
  -- txData[numBytes]=0

  --Configure num bytes to read/write
  MB.W(5009, 0, numBytes)  --Num Bytes to Tx/Rx
  local errorVal = MB.WA(5010, 99, numBytes, txData) --SPI_DATA_TX
  MB.W(5007, 0, 1) --SPI_GO
  local rxData = MB.RA(5050, 99, numBytes) --SPI_DATA_RX

  local rxString = ""
  for i=1,numBytes do
    rxString = rxString..string.char(rxData[i])
  end
  return rxString
end
function SPI_Utils.calc_options(self, autoCSDisable)
  autoCSDisableVal = autoCSDisable and 1 or 0
  return autoCSDisableVal*1
end
function SPI_Utils.calc_mode(self, cpol, cpha)
  cpolVal = cpol and 1 or 0
  cphaVal = cpha and 1 or 0
  return cpolVal*2 + cphaVal*1
end


spi = SPI_Utils

--Define DIO Numbers
spiCS=8
spiCLK=9
spiMISO=10
spiMOSI=11

--Define SPI Options
spiSpeed = 0
spiOptions = spi.calc_options(spi, false)

--Configure SPI bus
txString = "!cpol&!cpha"
-- print("Configuring for case: "..txString)
spiMode = spi.calc_mode(spi, false, false)
spi.configure(spi, spiCS, spiCLK, spiMISO, spiMOSI, spiMode, spiSpeed, spiOptions, false)

rxString = spi.transferString(spi, txString)
-- print("Received String: "..rxString)

--Configure SPI bus
txString = "!cpol&cpha"
-- print("Configuring for case: "..txString)
spiMode = spi.calc_mode(spi, false, true)
spi.configure(spi, spiCS, spiCLK, spiMISO, spiMOSI, spiMode, spiSpeed, spiOptions, false)

rxString = spi.transferString(spi, txString)
-- print("Received String: "..rxString)

--Configure SPI bus
txString = "cpol&!cpha"
-- print("Configuring for case: "..txString)
spiMode = spi.calc_mode(spi, true, false)
spi.configure(spi, spiCS, spiCLK, spiMISO, spiMOSI, spiMode, spiSpeed, spiOptions, false)

rxString = spi.transferString(spi, txString)
-- print("Received String: "..rxString)

--Configure SPI bus
txString = "cpol&cpha"
-- print("Configuring for case: "..txString)
spiMode = spi.calc_mode(spi, true, true)
spi.configure(spi, spiCS, spiCLK, spiMISO, spiMOSI, spiMode, spiSpeed, spiOptions, false)

rxString = spi.transferString(spi, txString)
-- print("Received String: "..rxString)

--Configure SPI bus
txString = "enable CS"
-- print("Configuring for case: "..txString)
spiMode = spi.calc_mode(spi, false, false)
spiOptions = spi.calc_options(spi, true)
spi.configure(spi, spiCS, spiCLK, spiMISO, spiMOSI, spiMode, spiSpeed, spiOptions, false)

rxString = spi.transferString(spi, txString)
-- print("Received String: "..rxString)

--Stop the Lua Script
MB.W(6000, 1, 0)