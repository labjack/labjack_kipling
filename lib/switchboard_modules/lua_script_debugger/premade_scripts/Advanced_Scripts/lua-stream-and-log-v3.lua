print("Stream and log AIN0 at 4kS/s to file, nominal cal constants")
dateStr = ""

table = {}
table[1] = 0    
table[2] = 0   
table[3] = 0    
table[4] = 0   
table[5] = 0    
table[6] = 0    

table, error = MB.RA(61510, 0, 6)
dateStr = string.format("%04d-%02d-%02d %02d-%02d-%02d", table[1], table[2], table[3], table[4], table[5], table[6])

fileNameInitial = "/stream-data-"
fileCount = 0
numFilesToMake = 10
fileNameEnding = ".csv"
fileName = dateStr .. fileNameEnding

newDataStr = ""
numDataWritten = 0
dataPerFile = 100

data = {}

file = io.open(fileName, "w")
-- Make sure that the file was opened properly.
if file then
  print("Opened File on uSD Card", fileName)
else
  -- If the file was not opened properly we probably have a bad SD card.
  print("!! Failed to open file on uSD Card !!", fileName)
  MB.W(6000, 1, 0)
end

curStreamRead = 0
maxStreamReads = 1000
printInterval = 100

-- Configure FIO0 and FIO1 as low
MB.W(2000, 0, 0)
MB.W(2001, 0, 0)

MB.W(48005, 0, 1)                       --ensure analog is on

-- make sure streaming is not running
isStreamRunning = MB.R(4990, 1)
if isStreamRunning == 1 then
  MB.W(4990, 1, 0)
end

-- Configure AIN range
MB.W(43900, 3, 10)

--Configure Stream: https://labjack.com/support/datasheets/t7/communication/stream-mode/low-level-streaming
MB.W(4002, 3, 4000) -- Scanrate=4000Hz
print(string.format("Scanrate %.8f",MB.R(4002, 3)))
MB.W(4004, 1, 1) -- 1 channels
MB.W(4008, 3, 0) -- force settling to 1uS
MB.W(4010, 1, 0) -- Force res index 1
MB.W(4012, 1, 2^11) -- buffer size = 1024 bytes
MB.W(4016, 1, 16) -- CR mode aka 0b10000=16
MB.W(4018, 1, 0)
MB.W(4020, 1, 0) -- Run continuously, can be limited..
MB.W(4100, 1, 0) -- Add AIN0

-- Start the stream
MB.W(4990, 1, 1)

-- Function that applies nominal cal constants.
function applyCal(b)
  local v = 0
  local p = 0.000315805780
  local n = -0.000315805800
  local c = 33523.0
  local o = -10.586956522
  if b < c then
    v = (c - b) * n
  else
    v = (b - c) * p
  end
  return v
end

LJ.IntervalConfig(0, 5)--set interval to 1000 for 1000ms
runScript = true
numInBuffer = 1
while runScript do
  if LJ.CheckInterval(0) then
  -- if true then
    MB.W(2001, 0, 1)
    numToRead = 4 + numInBuffer -- 4 (header)  + 1 (num channels)
    data = MB.RA(4500, 0, numToRead)
    
    -- calculate num samples remaining in buffer
    numInBuffer = data[2]
    -- numInBuffer = bit.rshift(data[2],0) -- num/2 (num bytes in uint) /1 (num channels)
    
    -- Make sure the number of samples read the next iteration is a manageable amount.
    if numInBuffer > 100 then
      numInBuffer = 100
    end

    -- Save read data to the open file.
    for i=5,numToRead do
      -- Notify user of a stream error.
      if data[i] == 0xFFFF then
        print("Bad Val", data[3],data[4])
      end
      file:write(string.format("%.4f\n",applyCal(data[i])))
    end
    MB.W(2001, 0, 0)
    
    MB.W(2000, 0, 1)
    curStreamRead = curStreamRead + 1
    if curStreamRead%printInterval == 0 then
      print(curStreamRead/maxStreamReads, numInBuffer, data[2])
    end
    MB.W(2000, 0, 0)
  end
  if (curStreamRead > maxStreamReads) then
     -- Stop the stream
    MB.W(4990, 1, 0)
    
    runScript = false
  end
end

-- Configure FIO0 and FIO1 as low
MB.W(2000, 0, 0)
MB.W(2001, 0, 0)

file:close()
print("Finishing Script", numDataWritten, fileCount, fileName)
MB.W(6000, 1, 0)
    
