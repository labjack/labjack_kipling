--[[
    Name: 14_zerocrossing_pulse_response.lua
    Desc: This example will output a pulse on FIO1 (FIO4 for T4) a specified
          amount of time after a rising edge is detected on FIO0 (FIO5 for T4)
    Note: The delay between detection of a crossing and the beginning of the
          pulse is controlled by the F32 value in USER_RAM at
          modbus address 46000-46001

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Begin")
-- Assume that a T7 is being used, use FIO0 and FIO1 for I/O
local inpin = "FIO0"
local outpin = "FIO1"
local devtype = MB.readName("PRODUCT_ID")
-- If actually using a T4, use FIO4 and FIO5 for I/O
if devtype == 4 then
	inpin = "FIO4"
	outpin = "FIO5"
end
-- Set a 20ms pulse width
local pulsewidth = 20
-- Set the pulse low time to be 40ms by writing to USER_RAM
MB.writeName("USER_RAM0_F32",40)
local state = "pulseUpdate"
-- Get an initial state of inpin
lastval = MB.readName(inpin)
while true do
  -- Get the current state of inpin
  inval = MB.readName(inpin)
  if state == "pulseUpdate" then
    -- Read a new pulse low time from USER_RAM
    delay = MB.readName("USER_RAM0_F32")
    state = "waitingForZero"
    -- Enforce constraints on pulse low time. (This is the amount of time
    -- between the zero crossing and the activation pulse)
    print("new pulse", pulsewidth)
  elseif state == "waitingForZero" then
    -- If there was a rising edge
    if lastval == 0 and inval == 1 then
      -- Start the pulse low time delay
      LJ.IntervalConfig(0, delay)
      state = "pulseStart"
    end
  elseif state == "pulseStart" then
    -- If the pulse low time delay is finished
    if LJ.CheckInterval(0) then
      -- Start the outpin pulse
      MB.writeName(outpin, 1)
      -- Set a delay for the pulse width
      LJ.IntervalConfig(0, pulsewidth)
      state = "pulseEnd"
    end
  elseif state == "pulseEnd" then
    -- If the pulse width delay is done
    if LJ.CheckInterval(0) then
      -- End the outpin pulse
      MB.writeName(outpin, 0)
      state = "pulseUpdate"
    end
  end
  lastval = inval
end