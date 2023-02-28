print ("SPI Example. Jumper FIO2 (MISO) and FIO3 (MOSI) together (FIO6 and FIO7 on T4)")
--This example sends out a packet of data over SPI and reads it back.
--If the packet recieved matches the packet sent, SPI is working properly.
--Otherwise, there may be some issues with the SPI circuitry
local mbWrite = MB.W

--Configure T7s SPI pins
devType = MB.R(60000, 3)
if devType == 7 then--if T7
	mbWrite(5000, 0, 0)  --CS (FIO0)
	mbWrite(5001, 0, 1)  --CLK
	mbWrite(5002, 0, 2)  --MISO
	mbWrite(5003, 0, 3)  --MOSI (FIO3)
elseif devType == 4 then--if T4
	mbWrite(5000, 0, 4)  --CS (FIO4)
	mbWrite(5001, 0, 5)  --CLK
	mbWrite(5002, 0, 6)  --MISO
	mbWrite(5003, 0, 7)  --MOSI (FIO7)
end

mbWrite(5004, 0, 0)  --Mode
mbWrite(5005, 0, 0)  --Speed
mbWrite(5006, 0, 1)  --Options, disable CS
mbWrite(5009, 0, 1)  --Num Bytes to Tx/Rx

local testData = {{0xA, 0xB, 0xC, 0xD, 0xE, 0xF, 0x1, 0x7}, 
                  {0xD, 0xE, 0xA, 0xD, 0xB, 0xE, 0xE, 0xF}}
local dataSelect = 2-- 1 or 2 for each dataset, change this for different data sets

LJ.IntervalConfig(0, 100) --Configure Interval, in millis
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then
    local testLen = table.getn(testData[dataSelect])
    MB.W(5009, 0, testLen)--load the number of bytes
    MB.WA(5010, 99, testLen, testData[dataSelect])--load data into DATA_TX
    MB.W(5007, 0, 1)--SPI_GO
    local rxData = MB.RA(5050, 99, testLen)--read data from DATA_RX
    
    --Compare the data
    local pass = 1
    for i=1,testLen do
      if(testData[dataSelect][i] ~= rxData[i]) then
        print(string.format("0x%x (tx) does not match 0x%x (rx)", testData[dataSelect][i], rxData[i]))--Show data recieved
        pass = 0
      end
    end
    if(pass == 1) then
      print("Data recieved")
    else
      print("----")
    end
  end
end
