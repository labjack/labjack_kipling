--[[
    Name: moving_average_interval_compute_HS.lua
    Desc: Implements a moving-average script by keeping track of a moving sum
    Note: Alternate methods of implementing a moving-average are also available

          The number of values currently cached & used for averaging
          can be read through the USER_RAM0_U32 register

          AIN values are saved as floating-point numbers and not binary values
          so the accuracy of the value may slowly drift. Run the
          "moving_average_interval_compute_LS" example if this is required
--]]

-- Sampling interval in Hz
local intervalhz = 100
local intervalms = math.floor(1/intervalhz * 1000)
local numsamples = 10
-- Update rate in ms
local updateratems = 1000
local channels = {0, 2}
local numchannels = table.getn(channels)
local statusio = 0
-- If using a T4
if MB.R(60000, 3) == 4 then
  -- DIO0-3 are analog only, use DIO4 for status
  statusio = 4
end

-- Print program information
print("Calculate analog input moving averages for channels AIN0 and AIN2")
print("Saving average values to USER_RAM0_F32 and USER_RAM2_F32")
print()
print("Collecting data at rates:")
print(string.format(" -- %d Hz",intervalhz))
print(string.format(" -- %d ms",intervalms))
print(string.format("User RAM registers are updated every %d", updateratems))
print()
print("NOTE: This averaging method is faster, but an accuracy issue occurs due to")
print("  saving calibrated values as float32 values instead of un-calibrated")
print("  binary values and then calibrated upon saving values to the appropriate")
print("  user ram register.  This example is published purely for educational purposes.")

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

-- Initialize interval timers
LJ.IntervalConfig(0, intervalms)
LJ.IntervalConfig(1, updateratems)

-- Begin loop
while true do
  -- If a sampling interval is done
  if LJ.CheckInterval(0) then
    -- Read the AIN channels
    for i=1,numchannels do
      tval = MB.R(channels[i], 3)
      if dbg then
        print(string.format("Read %d, %.4f, %d",channels[i], tval, index))
      end
      -- Get the previously cached value
      oval = vals[i][index]
      -- Add tval to total sum & subtract the value being removed
      sums[i] = sums[i] + tval - oval
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
    -- Increment & reset index to fill the channel value buffer
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
  end
  -- If a update interval is done calculate & save averages
  if LJ.CheckInterval(1) then
    for i=1,numchannels do
      avgval = sums[i]/numaveraged
      MB.W(46000 + channels[i], 3, avgval)
      if printavg then
        print(string.format("The average AIN%d reading is: %.5f, (%d samples)",channels[i], avgval, numaveraged))
      end
    end
  end
end