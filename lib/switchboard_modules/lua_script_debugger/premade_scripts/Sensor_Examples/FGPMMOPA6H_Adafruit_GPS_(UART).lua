print("Get the GPS latitude & longitude from a FGPMMOPA6H Adafruit GPS Module.")
--UART part of the T7 datasheet http://labjack.com/support/datasheets/t7/digital-io/asynchronous-serial
--http://www.adafruit.com/datasheets/GlobalTop-FGPMMOPA6H-Datasheet-V0A.pdf
--http://www.adafruit.com/datasheets/PMTK_A11.pdf
--other helpful resources
--https://github.com/adafruit/Adafruit-GPS-Library/blob/master/Adafruit_GPS.h
--https://github.com/adafruit/Adafruit-GPS-Library/blob/master/Adafruit_GPS.cpp
--Change 6/28/2016.  Writes to register 5440 need to use type 0 and not 1.

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

local data = {}
local temp = 0
local temp2 = ""
local i = 0
local j = 0
local stringResult = ""


mbWrite(5400, 0, 0)      --disable ASYNCH during config
--4800,9600,14400,19200,38400,57600,115200
mbWrite(5420, 1, 9600)   --baud, 9600 is default of FGPMMOPA6H

devType = MB.R(60000, 3)
if devType == 7 then--if T7
	mbWrite(5405, 0, 1)      --RX set to FIO1
	mbWrite(5410, 0, 0)      --TX set to FIO0
elseif devType == 4 then--if T4
	mbWrite(5405, 0, 5)      --RX set to FIO5
	mbWrite(5410, 0, 4)      --TX set to FIO4
end


mbWrite(5460, 0, 0)      --ASYNCH_PARITY set to 0=none
mbWrite(5430, 0, 600)    --ASYNCH_RX_BUFFER_SIZE_BYTES set to 600

mbWrite(5400, 0, 1)      --enable ASYNCH


PMTK_SET_NMEA_UPDATE_1HZ = "$PMTK220,1000*1F"
PMTK_API_SET_FIX_CTL_1HZ ="$PMTK300,1000,0,0,0,0*1C"
PMTK_SET_BAUD_9600 = "$PMTK251,9600*17"
--Lua seems to respond better when variables are not defined on-the-fly, or reused?
--in any case, it was working better when these were all explicit and globals
local strLen = 0
local strLen1 = 0
local strLen2 = 0
local ASCIIcharAsByte = 0
local ASCIIcharAsByte1 = 0
local ASCIIcharAsByte2 = 0


--Set the baud rate
strLen = string.len(PMTK_SET_BAUD_9600)
mbWrite(5440, 0, strLen)--ASYNCH_NUM_BYTES_TX
for i=1, strLen do
  ASCIIcharAsByte = string.byte(PMTK_SET_BAUD_9600, i)
  mbWrite(5490, 0, ASCIIcharAsByte)
end
mbWrite(5450, 0, 1) --ASYNCH_TX_GO


--Set the update rate.  i.e.  the rate at which the signal is echoed.
strLen1 = string.len(PMTK_SET_NMEA_UPDATE_1HZ)
mbWrite(5440, 0, strLen1)--ASYNCH_NUM_BYTES_TX
for i=1, strLen1 do
  ASCIIcharAsByte1 = string.byte(PMTK_SET_NMEA_UPDATE_1HZ, i)
  mbWrite(5490, 0, ASCIIcharAsByte1)
end
mbWrite(5450, 0, 1) --ASYNCH_TX_GO

--To actually speed up the position fix you must also send one of the position fix rate commands
strLen2 = string.len(PMTK_API_SET_FIX_CTL_1HZ)
mbWrite(5440, 0, strLen2)--ASYNCH_NUM_BYTES_TX
for i=1, strLen2 do
  ASCIIcharAsByte2 = string.byte(PMTK_API_SET_FIX_CTL_1HZ, i)
  mbWrite(5490, 0, ASCIIcharAsByte2)
end
mbWrite(5450, 0, 1) --ASYNCH_TX_GO



LJ.IntervalConfig(0, 1000)       
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then           --interval completed
    local numBytesRX = mbRead(5435, 0)
    print ("numBytesRX ", numBytesRX)
    for i=1, (numBytesRX) do
      data[i] = " "
    end
    for j=1, (numBytesRX) do
      temp = mbRead(5495, 0)
      temp2 = string.char(temp)
      data[j] = temp2
    end
    stringResult = table.concat(data)
    print (stringResult)
  end
end