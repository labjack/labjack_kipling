--[[
    Name: waveform-generator.lua
    Desc: This script will output a waveform on DAC0
    Note: User memory is used to set the scan frequency, wave frequency, wave
          shape, amplitude and offset. Once the script is running switch to the
          "Register Matrix" tab and add registers 46000, 46002, 46004, 46006,
          and 46008. See below for which register affects which attribute.
          Updating those values will update the output wave.
--]]

print("LabJack Lua Waveform Generator Example. Version 1.0")
local buffsize = 1024      -- number of bytes to allocate to the buffer
-- How often the DACs value will be updated
local scanfreq = 10000
-- Frequency of the sine wave
local wavefreq = 100
-- 0=sine, 1=square, 2=triangle
local waveshape = 0
-- Wave amplitude
local waveamp = 1.0
-- Wave offset
local waveoff = 1.0
local lastssf = 0
local lastwf = 0
local lastws = 0
local lastwa = 0
local lastwo = 0
-- Initialize IO memory
MB.writeName("USER_RAM0_F32", scanfreq)
MB.writeName("USER_RAM1_F32", wavefreq)
MB.writeName("USER_RAM2_F32", waveshape)
MB.writeName("USER_RAM3_F32", waveamp)
MB.writeName("USER_RAM4_F32", waveoff)
-- Ensure stream out is off
MB.writeName("STREAM_OUT0_ENABLE", 0)
-- Set the stream out target to DAC0
MB.writeName("STREAM_OUT0_TARGET", 1000)
-- Set the buffer size
MB.writeName("STREAM_OUT0_BUFFER_ALLOCATE_NUM_BYTES", buffsize)
-- Enable stream out
MB.writeName("STREAM_OUT0_ENABLE", 1)
-- Configure an interval for how often to check for updates
LJ.IntervalConfig(0, 1000)
-- Configure an interval to limit debugging output rates
LJ.IntervalConfig(1, 50)
while true do
  -- If there should be a check for updates
  if LJ.CheckInterval(0) then
    -- Read IO memory
    scanfreq = MB.readName("USER_RAM0_F32")
    wavefreq = MB.readName("USER_RAM1_F32")
    waveshape = MB.readName("USER_RAM2_F32")
    waveamp = MB.readName("USER_RAM3_F32")
    waveoff = MB.readName("USER_RAM4_F32")
    -- If updating the scan frequency
    if scanfreq ~= lastssf then
      -- Disable the stream if it is on
      -- Always disabling stream is an option, but will it throw an error
      if MB.readName("STREAM_ENABLE") ~= 0 then
        MB.writeName("STREAM_ENABLE", 0)
        print("Updating scan rate")
      end
    end
    -- If a new waveform has been specified
    if wavefreq ~= lastwf or
       waveshape ~= lastws or
       waveamp ~= lastwa or
       waveoff ~= lastwo then
      print("Updating wave")
      print(wavefreq, waveshape, waveamp, waveoff)
      -- Compute new wave
      local npoints = scanfreq / wavefreq
      if npoints > (buffsize / 2) then
        print("Too many points for the buffer specified.")
      end
      local dataset = {}
      local i = 1
      for i=1, npoints, 1 do
        -- Sine wave
        if waveshape == 0 then
          dataset[i] = math.sin(6.283185 * i / npoints)
        -- Square wave
        elseif waveshape == 1 then
          if i < (npoints / 2) then
            dataset[i] = -1
          else
            dataset[i] = 1
          end
        -- Triangle wave
        elseif waveshape == 2 then
          local step = 4 / npoints
          if i < (npoints / 2) then
            dataset[i] = step*i - 1
          else
            dataset[i] = 1 - step * (i - npoints / 2)
          end
        end
        dataset[i] = dataset[i] * waveamp
        dataset[i] = dataset[i] + waveoff
--        print(i, dataset[i])                  -- Print out the dataset
--        while LJ.LJ.CheckInterval(1) == nil do   -- limit the rate that the debug buffer is filled
--        end
      end

      -- Load the new wave form
      -- This could improved to load more quickly, but the benefit will be
      -- smaller than when using C-R
      for i=1, npoints, 1 do
        MB.writeName("STREAM_OUT0_BUFFER_F32", dataset[i])
      end
      -- Set the number of points to loop
      MB.writeName("STREAM_OUT0_LOOP_NUM_VALUES", npoints)
      -- Begin using the recently loaded data set.
      MB.writeName("STREAM_OUT0_SET_LOOP", 1)
    end
    -- If stream is off because this is the first run or changing scanFreq
    if MB.readName("STREAM_ENABLE") == 0 then
      -- Set scan rate
      MB.writeName("STREAM_SCANRATE_HZ", scanfreq)
      -- 1 Channel per scan
      MB.writeName("STREAM_NUM_ADDRESSES", 1)
      -- Automatic Settling
      MB.writeName("STREAM_SETTLING_US", 0)
      -- Automatic Resolution
      MB.writeName("STREAM_RESOLUTION_INDEX", 0)
      -- Use a small buffer, because we do not care about any data.
      MB.writeName("STREAM_BUFFER_SIZE_BYTES", 256)
        -- No advanced clocking options
      MB.writeName("STREAM_CLOCK_SOURCE", 0)
      -- No advanced targets
      MB.writeName("STREAM_AUTO_TARGET", 0)
      -- Continuous operation; disable burst.
      MB.writeName("STREAM_NUM_SCANS", 0)
      -- Add channel 4800 (StreamOut 0)
      MB.writeName("STREAM_SCANLIST_ADDRESS0", 4800)
      -- Start stream
      MB.writeName("STREAM_ENABLE", 1)
    end
    lastssf = scanfreq
    lastwf = wavefreq
    lastws = waveshape
    lastwa = waveamp
    lastwo = waveoff
  end
end