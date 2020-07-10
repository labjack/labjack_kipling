--[[
    Name: pwm_library.lua
    Desc: This script can be used as a library of functions to configure the
          PWM registers for output and write new duty cycles to the PWM channel
    Note: PWM is available on FIO0 and FIO5 if using the T7, or FIO6 and FIO7
          if using the T4

          Details about compatible DIO channels (tables 13.2-1 and -2):
            https://labjack.com/support/datasheets/t-series/digital-io/extended-features

          PWM specific details:
            https://labjack.com/support/datasheets/t-series/digital-io/extended-features/pwm-out
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read=MB.R
local modbus_write=MB.W
local check_interval = LJ.CheckInterval

-- Create PWM library.
pwm = {}--add local variables here

--duty should be in %, not decimal
-------------------------------------------------------------------------------
--  Desc: This function initializes the registers necessary to start the PWM
--        feature
-------------------------------------------------------------------------------
function pwm.init (self, ichan, ifreq, iduty, iclk, idivisor)
  irollvalue = (80000000/ifreq)/idivisor
  -- Store the local values for future use
  self.rollvalue = irollvalue
  self.chan = ichan
  self.freq = ifreq
  self.duty = iduty
  self.clk = iclk
  self.divisor = idivisor
  -- Write 0 to DIO_EF_CLOCK#_ENABLE to disable the clock source
  modbus_write(44900+iclk*10, 0, 0)
  -- Set DIO_EF_CLOCK#_DIVISOR
  modbus_write(44901+iclk*10, 0, idivisor)
  -- Set DIO_EF_CLOCK#_ROLL_VALUE
  modbus_write(44904+iclk*10, 1, irollvalue)
  -- Re-enable the clock source
  modbus_write(44900+iclk*10, 0, 1)

  -- Write 0 to DIO#_EF_ENABLE to disable the EF system for configuration
  modbus_write(44000+ichan*2, 1, 0)
  -- Set DIO#_EF_INDEX to 0 to use the PWM-Out feature
  modbus_write(44100+ichan*2, 1, 0)
  -- Write the clock channel to DIO#_EF_OPTIONS to set which clock to use
  modbus_write(44200+ichan*2, 1, iclk)
  -- Write the duty cycle value to DIO#_EF_CONFIG_A
  modbus_write(44300+ichan*2, 1, irollvalue*iduty/100)
end

-------------------------------------------------------------------------------
--  Desc: Writes 1 to DIO#_EF_ENABLE in order to enable the EF system for PWM
-------------------------------------------------------------------------------
function pwm.enable (self)
  modbus_write(44000+self.chan*2, 1, 1)
end

-------------------------------------------------------------------------------
--  Desc: Writes 0 to DIO#_EF_ENABLE in order to disable the EF system for PWM
-------------------------------------------------------------------------------
function pwm.disable (self)
  -- Write 0 to DIO#_EF_ENABLE to disable the EF system
  modbus_write(44000+self.chan*2, 1, 0)
end

-------------------------------------------------------------------------------
--  Desc: Changes the frequency of the PWM waveform
-------------------------------------------------------------------------------
function pwm.change_frequency (self, ifreq)
  irollvalue = (80000000/ifreq)/self.divisor
  -- Store the new local PWM values
  self.rollvalue = irollvalue
  self.freq = ifreq
  -- Set DIO_EF_CLOCK#_ROLL_VALUE with its new value
  modbus_write(44904+self.clk*10, 1, self.rollvalue)
  -- Write the new duty cycle value to DIO#_EF_CONFIG_A
  modbus_write(44300+self.chan*2, 1, self.rollvalue*self.duty/100)
end

-------------------------------------------------------------------------------
--  Desc: Changes the duty cycle of the PWM waveform
-------------------------------------------------------------------------------
function pwm.change_duty_cycle (self, iduty)
  -- Store the new duty cycle percentage
  self.duty = iduty
  -- Write the new duty cycle value to DIO#_EF_CONFIG_A
  modbus_write(44300+self.chan*2, 1, self.rollvalue*self.duty/100)
end


-- Use a 50 Hz frequency
local pwmfrequency = 50
-- Use a 5% duty cycle
local dutycycle = 5
-- Read the PRODUCT_ID register to get the device type
local devtype = modbus_read(60000, 3)
-- Assume that the device being used is a T7, use FIO0 for PWM
local outpin = 0
-- If the device is actually a T4
if devtype == 4 then
  -- Use FIO6 for PWM
  outpin = 6
end
local mypwm = pwm
-- Initialize PWM on outpin with a 50Hz frequency (20ms period) and 50% duty cycle
mypwm.init(mypwm, outpin, pwmfrequency, dutycycle, 0, 1)
mypwm.enable(mypwm)
-- Store the duty cycle in USER_RAM0_F32 and the frequency in USER_RAM1_F32
modbus_write(46002, 3, pwmfrequency)
modbus_write(46000, 3, dutycycle)
-- Configure a 1000ms interval
LJ.IntervalConfig(1, 1000)

-- You can test this program using an LED or oscilloscope connected to outpin
while true do
  -- If an interval is done
  if check_interval(0) then
    -- Read USER_RAM0_F32 to get a duty cycle for the PWM output
    newdc = modbus_read(46000, 3)
    -- Read USER_RAM1_F32 to get a frequency for the PWM output
    newfrequency = modbus_read(46002, 3)
    -- If the new duty cycle is different
    if mypwm.duty ~= newdc then
      mypwm.change_duty_cycle(mypwm, newdc)
    end
    -- If the new frequency is different
    if (mypwm.freq ~= newfrequency and newfrequency ~= 0) then
      mypwm.change_frequency(mypwm, newfrequency)
    end
    print(
      string.format(
        "On FIO%d, a %fHz signal with a %d%s",
         outpin,
         mypwm.freq,
         mypwm.duty,
         "% duty cycle has been generated"
      )
    )
  end
end