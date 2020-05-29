--[[
    Name: lua-stream-and-log-v3.lua
    Desc: This example shows how to stream data to AIN0 and log to file
    Note: Streams at 4KS/s, using nominal cal constants

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)

          T-Series datasheet on streaming:
            https://labjack.com/support/datasheets/t7/communication/stream-mode/low-level-streaming
--]]

-- Function that applies nominal cal constants (+-10V range)
function applycal(b)
  local v = 0
  local pslope = 0.000315805780
  local nslope = -0.000315805800
  local bincenter = 33523.0
  local offset = -10.586956522
  if b < bincenter then
    v = (bincenter - b) * nslope
  else
    v = (b - bincenter) * pslope
  end
  return v
end

print("Stream and log AIN0 at 4kS/s to file, nominal cal constants")
-- Disable truncation warnings (truncation is not a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
strdate = ""
-- Check what hardware is installed
local hardware = MB.readName("HARDWARE_INSTALLED")
local passed = 1
if(bit.band(hardware, 8) ~= 8) then
  print("uSD card not detected")
  passed = 0
end
if(bit.band(hardware, 4) ~= 4) then
  print("RTC module not detected")
  passed = 0
end
if(passed == 0) then
  print("This Lua script requires an RTC module and a microSD card, but one or both are not detected. These features are only preinstalled on the T7-Pro. Script Stopping")
  -- Writing 0 to LUA_RUN stops the script
  MB.writeName("LUA_RUN", 0)
end
local table = {}
table[1] = 0
table[2] = 0
table[3] = 0
table[4] = 0
table[5] = 0
table[6] = 0
local table, error = MB.readNameArray("RTC_TIME_CALENDAR", 6, 0)
local strdate = string.format("%04d-%02d-%02d %02d-%02d-%02d",table[1],table[2],table[3],table[4],table[5],table[6])
local filecount = 0
local numfiles = 10
local extension = ".csv"
local filename = strdate .. extension
local datawritten = 0
local dataperfile = 100
local data = {}
-- Create or open and overwrite the file
local file = io.open(filename, "w")
-- Make sure that the file was opened properly.
if file then
  print("Opened File on uSD Card", filename)
else
  -- If the file was not opened properly we probably have a bad SD card.
  print("!! Failed to open file on uSD Card !!", filename)
  MB.writeName("LUA_RUN", 0)
end
local streamread = 0
local maxreads = 1000
local interval = 100
-- Configure FIO0 and FIO1 as low
MB.writeName("FIO0", 0)
MB.writeName("FIO1", 0)
-- Make sure analog is on
MB.writeName("POWER_AIN", 1)
-- Make sure streaming is not enabled
local streamrunning = MB.readName("STREAM_ENABLE")
if streamrunning == 1 then
  MB.writeName("STREAM_ENABLE", 0)
end
-- Use +-10V for the AIN range
MB.writeName("AIN_ALL_RANGE", 10)
-- Use a 4000Hz scanrate
MB.writeName("STREAM_SCANRATE_HZ", 4000)
print(string.format("Scanrate %.8f",MB.readName("STREAM_SCANRATE_HZ")))
-- Use 1 channel for streaming
MB.writeName("STREAM_NUM_ADDRESSES", 1)
-- Enforce a 1uS settling time
MB.writeName("STREAM_SETTLING_US", 1)
-- Use the default stream resolution
MB.writeName("STREAM_RESOLUTION_INDEX", 0)
-- Use a 1024 byte buffer size (must be a power of 2)
MB.writeName("STREAM_BUFFER_SIZE_BYTES", 2^11)
-- Use command-response mode (0b10000=16)
MB.writeName("STREAM_AUTO_TARGET", 16)
-- Run continuously (can be limited)
MB.writeName("STREAM_NUM_SCANS", 0)
-- Scan AIN0
MB.writeName("STREAM_SCANLIST_ADDRESS0", 0)
-- Start the stream
MB.writeName("STREAM_ENABLE", 1)
-- configure a 5ms interval
LJ.IntervalConfig(0, 5)
local running = true
local numinbuffer = 1
while running do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    MB.writeName("FIO1", 1)
    -- 4 (header)  + 1 (num channels)
    local numtoread = 4 + numinbuffer
    data = MB.readNameArray("STREAM_DATA_CR", numtoread, 0)
    -- Calculate the number of samples remaining in the buffer
    numinbuffer = data[2]
    -- numinbuffer = bit.rshift(data[2],0) -- num/2 (num bytes in uint) /1 (num channels)
    -- Make sure the number of samples read the next iteration is a manageable amount.
    if numinbuffer > 100 then
      numinbuffer = 100
    end
    -- Save read data to the open file.
    for i=5,numtoread do
      -- Notify user of a stream error.
      if data[i] == 0xFFFF then
        print("Bad Val", data[3],data[4])
      end
      file:write(string.format("%.4f\n",applycal(data[i])))
    end
    MB.writeName("FIO0", 0)
    MB.writeName("FIO1", 1)
    streamread = streamread + 1
    if streamread%interval == 0 then
      print(streamread/maxreads, numinbuffer, data[2])
    end
    MB.writeName("FIO0", 0)
  end
  if (streamread > maxreads) then
     -- Stop the stream
    MB.writeName("STREAM_ENABLE", 0)
    running = false
  end
end
-- Configure FIO0 and FIO1 as low
MB.writeName("FIO0", 0)
MB.writeName("FIO1", 0)
file:close()
print("Finishing Script", datawritten, filecount, filename)
MB.writeName("LUA_RUN", 0)

