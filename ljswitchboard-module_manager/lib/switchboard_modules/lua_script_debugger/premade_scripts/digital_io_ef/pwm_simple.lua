--[[
    Name: pwm_simple.lua
    Desc: This example shows how to set up a pwm output on FIO0
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
    	  	This script avoids truncation errors in lua by writing 32-bit registers as two 
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
	local MSB = math.floor(myU16/256)
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
MB.writeName("DIO_EF_CLOCK0_ENABLE", 0)
-- Use a clock divisor of 1
MB.writeName("DIO_EF_CLOCK0_DIVISOR", divisor)
-- Set the roll value
MB.writeNameArray("DIO_EF_CLOCK0_ROLL_VALUE", NUM_U16_PER_U32, u32_to_u16_array(rollval), U16_TYPE_CONSTANT)
-- Re-enable the clock 0 source
MB.writeName("DIO_EF_CLOCK0_ENABLE", 1)

-- Disable the DIO_EF before configuring
MB.writeNameArray("DIO0_EF_ENABLE", NUM_U16_PER_U32, u32_to_u16_array(0), U16_TYPE_CONSTANT)
-- Set index to 0 for PWM
MB.writeNameArray("DIO0_EF_INDEX", NUM_U16_PER_U32, u32_to_u16_array(0), U16_TYPE_CONSTANT)
-- Set options to 0 for using clock source 0
MB.writeNameArray("DIO0_EF_OPTIONS", NUM_U16_PER_U32, u32_to_u16_array(0), U16_TYPE_CONSTANT)
-- Set the high to low transition point
MB.writeNameArray("DIO0_EF_CONFIG_A", NUM_U16_PER_U32, u32_to_u16_array(configa), U16_TYPE_CONSTANT)
-- Enable the feature to start outputting the PWM
MB.writeNameArray("DIO0_EF_ENABLE", NUM_U16_PER_U32, u32_to_u16_array(1), U16_TYPE_CONSTANT)

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
		MB.writeNameArray("DIO_EF_CLOCK0_ROLL_VALUE", NUM_U16_PER_U32, u32_to_u16_array(rollval), U16_TYPE_CONSTANT)
		-- update the configa value according to the new rollval
		-- Below will maintain the same initial duty cycle
		configa = rollval*dutycycle/100
		MB.writeNameArray("DIO0_EF_CONFIG_A", NUM_U16_PER_U32, u32_to_u16_array(configa), U16_TYPE_CONSTANT)
		numupdates = numupdates + 1
	end
end


print("\nScript finished")
MB.writeNameArray("DIO0_EF_ENABLE", NUM_U16_PER_U32, u32_to_u16_array(0), U16_TYPE_CONSTANT)
-- Stop the script
MB.writeNameArray("LUA_RUN", NUM_U16_PER_U32, u32_to_u16_array(0), U16_TYPE_CONSTANT)
