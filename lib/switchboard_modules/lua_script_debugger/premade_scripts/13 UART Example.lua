print("Basic UART example.")
print("Please connect a jumper wire between FIO0 and FIO1")
print("")
--UART part of the T7 datasheet http://labjack.com/support/datasheets/t7/digital-io/asynchronous-serial

MB.W(5400, 0, 0)      --disable ASYNCH during config

-- Baud Example Options: 4800,9600,14400,19200,38400,57600,115200
MB.W(5420, 1, 9600)   --baud, 9600 is default of FGPMMOPA6H

MB.W(5405, 0, 1)      --RX set to FIO1
MB.W(5410, 0, 0)      --TX set to FIO0
MB.W(5460, 0, 0)      --ASYNCH_PARITY set to 0=none
MB.W(5430, 0, 600)    --ASYNCH_RX_BUFFER_SIZE_BYTES set to 600

MB.W(5400, 0, 1)      --enable ASYNCH

-- Various variables
UART_TEST_STRING = "Hello World!"
strLen = 0
strData = {}

-- Set the baud rate
strLen = string.len(UART_TEST_STRING)
print("Sending String of length:", strLen)

-- Allocate space for the string
MB.W(5440, 0, strLen) --ASYNCH_NUM_BYTES_TX, UINT16 (0)
--Convert and write string to the allocated UART TX buffer
for i=1, strLen do
  -- COnvert ASCII character to number
  local ASCIIcharAsByte = string.byte(UART_TEST_STRING, i)
  -- Write data to TX buffer
  MB.W(5490, 0, ASCIIcharAsByte) --ASYNCH_DATA_TX, UINT16 (0)
end
-- Send data saved in TX buffer
MB.W(5450, 0, 1) --ASYNCH_TX_GO, UINT16(0)



-- Configure the interval timer for once per second.
LJ.IntervalConfig(0, 1000)

-- Variables used to end the program
maxNumIterations = 3
currentIteration = 0
runApp = true

-- Enter while loop.
while runApp do
  -- Check to see if the interval is completed.
  if LJ.CheckInterval(0) then
    -- Read the number of bytes in RX buffer
    local numBytesRX = MB.R(5435, 0) --ASYNCH_NUM_BYTES_RX, UINT16(0)
    
    -- If there are more than zero bytes...
    if numBytesRX > 0 then
      print ("numBytesRX ", numBytesRX)
      
      -- Allocate a string to save data to
      local dataStr = ""
      
      -- Read data from the T7 and conver to a string
      for i=1, numBytesRX do
        local dataByte = MB.R(5495, 0) --ASYNCH_DATA_RX, UINT16(0)
        local dataChar = string.char(dataByte)
        dataStr = dataStr .. dataChar
      end
      
      print('Data:',dataStr)
    end
    
    -- Decide when to exit
    if currentIteration < maxNumIterations then
      currentIteration = currentIteration + 1
    else
      runApp = false
    end
  end
end

print('Script Finished')
MB.W(6000, 1, 0)
