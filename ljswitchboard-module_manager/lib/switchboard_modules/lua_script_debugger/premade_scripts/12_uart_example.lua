--[[
    Name: 12_uart_example.lua
    Desc: Example showing how to use a UART
    Note: This example requires you to connect a jumper between the RX and TX pins

          See the UART section of the T7 datasheet:
            https://labjack.com/support/datasheets/t7/digital-io/asynchronous-serial

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Basic UART example.")
print("Please connect a jumper wire between FIO0 and FIO1 (FIO4 and FIO5 on T4)")
print("")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Assume the device being used is a T7, use FIO1 for the RX pin
local rxpin = 1
-- Use FIO0 for the TX pin
local txpin = 0
local devtype = MB.readName("PRODUCT_ID")
-- If actually using a T4
if devtype == 4 then
  -- Change the RX pin to FIO5
  rxpin = 5
  -- Change the TX pin to FIO4
  txpin = 4
end

--disable ASYNCH during configuration
MB.writeName("ASYNCH_ENABLE", 0)
-- Baud Example Options: 4800,9600,14400,19200,38400,57600,115200
MB.writeName("ASYNCH_BAUD", 9600)
-- Set the RX pin
MB.writeName("ASYNCH_RX_DIONUM", rxpin)
-- Set the TX pin
MB.writeName("ASYNCH_TX_DIONUM", txpin)
-- Set 0 parity
MB.writeName("ASYNCH_PARITY", 0)
-- Set the buffer size to be 600 bytes
MB.writeName("ASYNCH_RX_BUFFER_SIZE_BYTES", 600)
-- Enable ASYNCH
MB.writeName("ASYNCH_ENABLE", 1)
-- Variables used to stop the program
local maxiterations = 3
local currentiteration = 0
local running = true
local teststring = "Hello World!"
local strlen = string.len(teststring)
print("Sending String of length:", strlen)
-- Configure an interval of 1000ms
LJ.IntervalConfig(0, 1000)

while running do
  -- Check to see if the interval is completed.
  if LJ.CheckInterval(0) then
    -- Allocate space for the string
    MB.writeName("ASYNCH_NUM_BYTES_TX", strlen)
    -- Convert and write the string to the UART TX buffer
    for i=1, strlen do
      -- Convert ASCII character to number
      local charbyte = string.byte(teststring, i)
      -- Write data to the TX buffer
      MB.writeName("ASYNCH_DATA_TX", charbyte)
    end
    -- Send data saved in the TX buffer
    MB.writeName("ASYNCH_TX_GO", 1)

    -- Read the number of bytes in RX buffer
    local rxbytes = MB.readName("ASYNCH_NUM_BYTES_RX")
    -- If there are more than zero bytes...
    if rxbytes > 0 then
      print ("RX bytes ", rxbytes)
      -- Allocate a string to save data to
      local datastr = ""
      -- Read data from the T7 and convert it to a string
      for i=1, rxbytes do
        local databyte = MB.readName("ASYNCH_DATA_RX")
        local datachar = string.char(databyte)
        -- Concatenate the data string with the data char
        datastr = datastr .. datachar
      end
      print("Data:",datastr)
      print("")
    end

    -- Exit after 3 iterations
    if currentiteration < maxiterations then
      currentiteration = currentiteration + 1
    else
      running = false
    end
  end
end
print("Script Finished")
-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)
