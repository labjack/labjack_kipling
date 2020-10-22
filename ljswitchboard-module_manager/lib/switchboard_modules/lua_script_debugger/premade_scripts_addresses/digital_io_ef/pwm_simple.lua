--[[
    Name: pwm_simple.lua
    Desc: This example shows how to set up a pwm output on FIO0
    Note: This script avoids truncation errors in lua by writing 32-bit registers as two 
  		  	16-bit values. Some 32-bit registers such as DIO#_EF_ENABLE could never have
  		  	truncation errors; we still write them as two 16-bit values for consistency
  		  	See the discussion on writing 32-bit registers here:
  		  		https://labjack.com/support/datasheets/t-series/lua-scripting#32-bit
--]]

-- Constants
local U16_TYPE_CONSTANT = 0
local NUM_U16_PER_U32 = 2
local CORE_FREQ = 80000000

-------------------------------------------------
--  Desc: Takes a U32 and returns an equivalent 
-- 				two value U16 array
-------------------------------------------------
local function u32_to_u16_array(myU16)
	local MSB = myU16/256
	local LSB = myU16 - MSB*256
	return {MSB, LSB}
end


local divisor = 1
local freq = 1000
local dutycycle = 50
-- Core clock is 80MHz --> 80MHz/(freq*divisor) = rollval
local rollval = CORE_FREQ/(freq*divisor)
local configa = rollval*dutycycle/100

print(string.format("Configuring PWM with %dHz frequency and %d%% duty cycle...\n", freq, dutycycle))
-- Disable the clock 0 source before configuring
MB.W(44900,U16_TYPE_CONSTANT, 0)
-- Use a clock divisor of 1
MB.W(44901, U16_TYPE_CONSTANT, divisor)
-- Set the roll value
MB.WA(44904, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(rollval))
-- Re-enable the clock 0 source
MB.W(44900, U16_TYPE_CONSTANT, 1)

-- Disable the DIO_EF before configuring
MB.WA(44000, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(0))
-- Set index to 0 for PWM
MB.WA(44100, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(0))
-- Set options to 0 for using clock source 0
MB.WA(44200, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(0))
-- Set the high to low transition point
MB.WA(44300, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(configa))
-- Enable the feature to start outputting the PWM
MB.WA(44000, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(1))

-- Configure an interval of 2000ms
-- After 2000ms change the PWM frequency
LJ.IntervalConfig(0, 2000)
local running = true
local numupdates = 0
local maxupdates = 2


print ("Starting loop...\n")
while running do
	if LJ.CheckInterval(0) then
		-- Update the frequency a set number of times then exit
		if numupdates >= maxupdates then
			running = false
			break
		end
		print("Halved the PWM frequency...")
		-- Halve the PWM frequency
		rollval = rollval*2
		MB.WA(44904, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(rollval))
		-- update the configa value according to the new rollval
		-- Below will maintain the same initial duty cycle
		configa = rollval*dutycycle/100
		MB.WA(44300, U16_TYPE_CONSTANT, NUM_U16_PER_U32, u32_to_u16_array(configa))
		numupdates = numupdates + 1
	end
end


print("\nScript finished")
-- Stop the script
MB.W(6000, 1, 0)
