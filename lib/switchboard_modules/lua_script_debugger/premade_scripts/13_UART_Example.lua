print("Basic UART example.")
print("Please connect a jumper wire between FIO0 and FIO1")
print("")
--UART part of the T7 datasheet http://labjack.com/support/datasheets/t7/digital-io/asynchronous-serial

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

mbWrite(5400, 0, 0)      --disable ASYNCH during config

-- Baud Example Options: 4800,9600,14400,19200,38400,57600,115200
mbWrite(5420, 1, 9600)   --baud, 9600 is default of FGPMMOPA6H

mbWrite(5405, 0, 1)      --RX set to FIO1
mbWrite(5410, 0, 0)      --TX set to FIO0
mbWrite(5460, 0, 0)      --ASYNCH_PARITY set to 0=none
mbWrite(5430, 0, 600)    --ASYNCH_RX_BUFFER_SIZE_BYTES set to 600

mbWrite(5400, 0, 1)      --enable ASYNCH

-- Various variables
local UART_TEST_STRING = "Hello World!"
local strLen = 0
local strData = {}

-- Set the baud rate
local strLen = string.len(UART_TEST_STRING)
print("Sending String of length:", strLen)

-- Allocate space for the string
mbWrite(5440, 0, strLen) --ASYNCH_NUM_BYTES_TX, UINT16 (0)
--Convert and write string to the allocated UART TX buffer
for i=1, strLen do
  -- COnvert ASCII character to number
  local ASCIIcharAsByte = string.byte(UART_TEST_STRING, i)
  -- Write data to TX buffer
  mbWrite(5490, 0, ASCIIcharAsByte) --ASYNCH_DATA_TX, UINT16 (0)
end
-- Send data saved in TX buffer
mbWrite(5450, 0, 1) --ASYNCH_TX_GO, UINT16(0)



-- Configure the interval timer for once per second.
LJ.IntervalConfig(0, 1000)
local checkInterval=LJ.CheckInterval

-- Variables used to end the program
local maxNumIterations = 3
local currentIteration = 0
local runApp = true

-- Enter while loop.
while runApp do
  -- Check to see if the interval is completed.
  if checkInterval(0) then
    -- Read the number of bytes in RX buffer
    local numBytesRX = mbRead(5435, 0) --ASYNCH_NUM_BYTES_RX, UINT16(0)
    
    -- If there are more than zero bytes...
    if numBytesRX > 0 then
      print ("numBytesRX ", numBytesRX)
      
      -- Allocate a string to save data to
      local dataStr = ""
      
      -- Read data from the T7 and conver to a string
      for i=1, numBytesRX do
        local dataByte = mbRead(5495, 0) --ASYNCH_DATA_RX, UINT16(0)
        local dataChar = string.char(dataByte)
        dataStr = dataStr .. dataChar
      end
      
      print("Data:",dataStr)
    end
    
    -- Decide when to exit
    if currentIteration < maxNumIterations then
      currentIteration = currentIteration + 1
    else
      runApp = false
    end
  end
end

print("Script Finished")
mbWrite(6000, 1, 0)
