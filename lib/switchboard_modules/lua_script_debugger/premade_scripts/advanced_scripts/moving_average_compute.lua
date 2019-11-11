--[[
    Name: moving_average_compute.lua
    Desc: Implements a moving-average script. After collecting each
          new value, compute the moving average
    Note: Alternate methods of implementing a moving-average are also available

          The number of values currently cached & used for averaging
          can be read through the USER_RAM0_U32 register

          Performance of this script is highly dependent on what other
          functions a T-Series device is performing and how frequently the
          device is being read. A rough max is hit on the T4 when sampling data
          at 20Hz and 500 samples

          Testing was performed with a T4, FW 1.0022,
          and Kipling 3.1.17 open to the Lua Script Debugger tab
--]]

-- Sampling interval in Hz
local intervalhz = 10
local intervalms = math.floor(1/intervalhz * 1000)
-- Number of samples to cache & average
local numsamples = 100
-- The analog inputs/registers to read & average
local channels = {0, 2}
local numchannels = table.getn(channels)
-- Pin for blinking LED at the rate of data collection
local statusio = 0
-- Pin for turning an LED on during analog DAQ & summing equation
local busyio = 1
-- If using a T4
if MB.R(60000, 3) == 4 then
  -- DIO0-3 are analog only, use DIO4 and DIO5
  statusio = 4
  busyio = 5
end

-- Print program information
print("Calculate analog input moving averages for channels AIN0 and AIN2")
print("Saving average values to USER_RAM0_F32 and USER_RAM2_F32")
print()
print("Collecting data at rates:")
print(string.format(" -- %d Hz",intervalhz))
print(string.format(" -- %d ms",intervalms))

-- Initialize sum calculation variables
local numaveraged = 0
local index = 1
local tval = 0
local oval = 0
local avgval = 0
local printavg = true
local dbg = false
local iostate = 0

local vals = {}
local sums = {}
for i=1,table.getn(channels) do
  sums[i] = 0
  vals[i] = {}
  for j=1,numsamples do
    vals[i][j]=0
  end
end

LJ.DIO_D_W(statusio, 1)
LJ.DIO_D_W(busyio, 1)

-- Configure an interval
LJ.IntervalConfig(0, intervalms)

-- Begin loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Turn on LED to indicate processing is active
    LJ.DIO_S_W(busyio, 1)
    -- Read the AIN channels
    for i=1,numchannels do
      tval = MB.R(channels[i], 3)
      if dbg then
        print(string.format("Read %d, %.4f, %d",channels[i], tval, index))
      end
      -- Get the previously cached value
      oval = vals[i][index]
      -- Add tval to cache, replacing the old value
      vals[i][index] = tval
    end

    -- Toggle I/O to enable debugging
    if iostate == 0 then
      iostate = 1
    else
      iostate = 0
    end
    LJ.DIO_S_W(statusio, iostate)
    -- Increment & reset index to fill ch. value buffer.
    if(index < numsamples) then
      index = index + 1
    else
      index = 1
    end

    -- Increment & save number of averaged samples to USER_RAM0_U32
    if(numaveraged < numsamples) then
      numaveraged = numaveraged + 1
      if dbg then
        print(string.format("Saving: %d, %d",46100,numaveraged))
      end
      MB.W(46100, 1, numaveraged)
    end

    -- Compute the average value for each channel
    for i=1,numchannels do
      sums[i] = 0
      for j=1,numaveraged do
        sums[i] = sums[i] + vals[i][j]
      end
      avgval = sums[i] / numaveraged
      -- Save result to USER_RAMx_F32 register
      MB.W(46000 + channels[i], 3, avgval)
      if printavg then
        print(string.format("The average AIN%d reading is: %.5f, (%d samples)",channels[i], avgval, numaveraged))
        print(string.format("Cosine: %.5f",math.cos(avgval)))
        print(string.format("Cosine: %.5f",math.sin(avgval)))
        print(string.format("Cosine: %.5f",math.tan(avgval)))
      end
    end
    -- Turn off the LED to indicate processing has been completed.
    LJ.DIO_S_W(busyio, 0)
  end
end
print('Finished')
-- Write 0 to LUA_RUN to stop the script
MB.Write(6000, 1, 0)