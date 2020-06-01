--[[
    Name: fgpmmopa6h_adafruit_gps_(uart).lua
    Desc: This is an example that shows how to use an FGPMMOPA6H GPS Module
          utilizing UART
    Note: UART part of the T7 datasheet:
            https://labjack.com/support/datasheets/t7/digital-io/asynchronous-serial

          GPS module datasheets:
            http://www.adafruit.com/datasheets/GlobalTop-FGPMMOPA6H-Datasheet-V0A.pdf
            http://www.adafruit.com/datasheets/PMTK_A11.pdf
          Other helpful resources:
            https://github.com/adafruit/Adafruit-GPS-Library/blob/master/Adafruit_GPS.h
            https://github.com/adafruit/Adafruit-GPS-Library/blob/master/Adafruit_GPS.cpp
--]]

print("Get the GPS latitude & longitude from a FGPMMOPA6H Adafruit GPS Module.")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
local data = {}
local temp = 0
local temp2 = ""
local i = 0
local j = 0
local stringresult = ""
-- Disable asynch during configuration
MB.writeName("ASYNCH_ENABLE", 0)
-- 4800,9600,14400,19200,38400,57600,115200
-- BAUD 9600 is the default of FGPMMOPA6H
MB.writeName("ASYNCH_BAUD", 9600)
local devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then
  -- Use FIO0 for TX
  MB.writeName("ASYNCH_TX_DIONUM", 0)
  -- Use FIO1 for RX
	MB.writeName("ASYNCH_RX_DIONUM", 1)
-- If using a T4
elseif devtype == 4 then
  -- Use FIO4 for TX
  MB.writeName("ASYNCH_TX_DIONUM", 4)
  -- Use FIO5 for RX
  MB.writeName("ASYNCH_RX_DIONUM", 5)
end
-- Set asynch parity to none
MB.writeName("ASYNCH_PARITY", 0)
MB.writeName("ASYNCH_RX_BUFFER_SIZE_BYTES", 600)
-- Enable asynch
MB.writeName("ASYNCH_ENABLE", 1)
PMTK_SET_NMEA_UPDATE_1HZ = "$PMTK220,1000*1F"
PMTK_API_SET_FIX_CTL_1HZ ="$PMTK300,1000,0,0,0,0*1C"
PMTK_SET_BAUD_9600 = "$PMTK251,9600*17"
-- Lua seems to respond better when variables are not defined on-the-fly (reused?)
-- in any case, it was working better when these were all explicit and globals
local strlen = 0
local strlen1 = 0
local strlen2 = 0
local charbyte = 0
local charbyte1 = 0
local charbyte2 = 0
-- Set the baud rate
strlen = string.len(PMTK_SET_BAUD_9600)
MB.writeName("ASYNCH_NUM_BYTES_TX", strlen)
for i=1, strlen do
  charbyte = string.byte(PMTK_SET_BAUD_9600, i)
  MB.writeName("ASYNCH_DATA_TX", charbyte)
end
MB.writeName("ASYNCH_TX_GO", 1)
--Set the update rate. i.e. the rate at which the signal is echoed.
strlen1 = string.len(PMTK_SET_NMEA_UPDATE_1HZ)
MB.writeName("ASYNCH_NUM_BYTES_TX", strlen1)
for i=1, strlen1 do
  charbyte1 = string.byte(PMTK_SET_NMEA_UPDATE_1HZ, i)
  MB.writeName("ASYNCH_DATA_TX", charbyte1)
end
MB.writeName("ASYNCH_TX_GO", 1)
-- To speed up the position fix you must also send one of the position fix rate commands
strlen2 = string.len(PMTK_API_SET_FIX_CTL_1HZ)
MB.writeName("ASYNCH_NUM_BYTES_TX", strlen2)
for i=1, strlen2 do
  charbyte2 = string.byte(PMTK_API_SET_FIX_CTL_1HZ, i)
  MB.writeName("ASYNCH_DATA_TX", charbyte2)
end
MB.writeName("ASYNCH_TX_GO", 1)
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    local numbytesrx = MB.readName("ASYNCH_NUM_BYTES_RX")
    print ("numbytesrx ", numbytesrx)
    for i=1, (numbytesrx) do
      data[i] = " "
    end
    for j=1, (numbytesrx) do
      local temp = MB.readName("ASYNCH_DATA_RX")
      local temp2 = string.char(temp)
      data[j] = temp2
    end
    stringresult = table.concat(data)
    print (stringresult)
  end
end