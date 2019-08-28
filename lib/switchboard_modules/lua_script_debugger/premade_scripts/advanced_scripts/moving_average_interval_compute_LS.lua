-- Implement a moving-average script by saving values & computing a sum in the end.
--
-- The number of values currently cached & used for averaging
-- can be read through the USER_RAM0_U32 register.

local sampleIntervalHZ = 10 -- Sampling interval in HZ
local sampleIntervalMS = math.floor(1/sampleIntervalHZ * 1000)
local numSamplesToAverage = 10
local userRAMUpdateRateMS = 1000 -- Update rate in ms
local channels = {0, 2}
local numChs = table.getn(channels)

local statusIONum = 0
if MB.R(60000, 3) == 4 then
  statusIONum = 4 -- On T4s, DIO0 -> 3 are analog only
end

-- Print program information
print("Calculate analog input moving averages for channels AIN0 and AIN2")
print("Saving average values to USER_RAM0_F32 and USER_RAM2_F32")
print()
print("Collecting data at rates:")
print(string.format(" -- %d Hz",sampleIntervalHZ))
print(string.format(" -- %d ms",sampleIntervalMS))
print(string.format("User RAM registers are updated every %d", userRAMUpdateRateMS))

-- Initialize sum calculation variables
local numAveraged = 0
local curIndex = 1 -- Init to an invalid array index
local tVal = 0
local oVal = 0
local avgVal = 0
local printAverage = true
local dbg = false
local ioState = 0

local vals = {}
local sums = {}
for i=1,table.getn(channels) do
  sums[i] = 0
  vals[i] = {}
  for j=1,numSamplesToAverage do
    vals[i][j]=0
  end
end

-- Save function references
local mbR=MB.R
local mbW = MB.W
local checkInterval=LJ.CheckInterval

local dioSW = LJ.DIO_S_W
LJ.DIO_D_W(statusIONum, 1)

-- Initialize interval timers
LJ.IntervalConfig(0, sampleIntervalMS)
LJ.IntervalConfig(1, userRAMUpdateRateMS)

-- Begin loop
while true do
  if checkInterval(0) then --interval completed, collect AIN values
    for i=1,numChs do
      tVal = mbR(channels[i], 3) -- Read AIN channel
      if dbg then
        print(string.format("Read %d, %.4f, %d",channels[i], tVal, curIndex))
      end
      oVal = vals[i][curIndex] -- Get the previously cached value
      vals[i][curIndex] = tVal -- Add tVal to cache, replacing the old value.
    end

    -- Toggle I/O to enable debugging
    if ioState == 0 then
      ioState = 1
    else
      ioState = 0
    end
    dioSW(statusIONum, ioState)

    -- Increment & reset curIndex to fill ch. value buffer.
    if(curIndex < numSamplesToAverage) then
      curIndex = curIndex + 1
    else
      curIndex = 1
    end

    -- Increment & save number of averaged samples to USER_RAM0_U32
    if(numAveraged < numSamplesToAverage) then
      numAveraged = numAveraged + 1
      if dbg then
        print(string.format("Saving: %d, %d",46100,numAveraged))
      end
      mbW(46100, 1, numAveraged)
    end
  end

  if checkInterval(1) then -- calculate & save averages
    for i=1,numChs do
      sums[i] = 0
      for j=1,numSamplesToAverage do
        sums[i] = sums[i] + vals[i][j]
      end
      avgVal = sums[i]/numAveraged
      mbW(46000 + channels[i], 3, avgVal)
      if printAverage then
        print(string.format("The average AIN%d reading is: %.5f, (%d samples)",channels[i], avgVal, numAveraged))
      end
    end
  end
end

print('Finished')
mbWrite(6000, 1, 0) -- Exit Lua Script