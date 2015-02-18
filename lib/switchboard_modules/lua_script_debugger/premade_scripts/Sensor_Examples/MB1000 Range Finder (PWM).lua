print("Communicate with a MaxBotix MB1000 ultrasonic range sensor using PWM.")
--The PWM capable DIO on the T7 are FIO0 and FIO1, so this example uses FIO0 (DIO0)
--Alternatively, you could poll a DIO line, but the PWM feature of the T7 makes it 
--more accurate, and the script is simple when using the PWM feature.
--The distance can be calculated using the scale factor of 147uS per inch
--http://www.maxbotix.com/documents/MB1000_Datasheet.pdf
--http://labjack.com/support/datasheets/t7/digital-io/extended-features/pulse-width

Range = 0
PulseWidth = 0

--THESE SETTINGS COULD ALTERNATIVELY BE CONFIGURED OUTSIDE OF SCRIPT, AND SAVED AS DEFAULTS---------
--Configure the clock to provide the maximum measurable period, 
MB.W(44900, 0, 0)			--DIO_EF_CLOCK0_ENABLE, disable clock during config
--configure the clock
MB.W(44901, 0, 1)			--DIO_EF_CLOCK0_DIVISOR, set to 1, PWM resolution is 12.5ns
MB.W(44904, 1, 0)			--DIO_EF_CLOCK0_ROLL_VALUE,
MB.W(44900, 0, 1)			--DIO_EF_CLOCK0_ENABLE, re-enable the clock

--configure the extended feature
MB.W(44000, 1, 0)     --DIO0_EF_ENABLE, disable the extended feature during config
MB.W(44100, 1, 5)			--DIO0_EF_INDEX, index 5 corresponds with the PWM input mode
MB.W(44200, 1, 0)     --DIO0_EF_OPTIONS, configure what clock source to use, use clock0.

MB.W(44000, 1, 1)			--DIO0_EF_ENABLE enable PWM input
--END CONFIG SETTINGS--------------------------------------------------------------------------------

LJ.IntervalConfig(0, 333)      --set interval to 333 for 333ms

while true do
  if LJ.CheckInterval(0) then		    --interval completed
    PulseWidth = MB.R(3600, 3)	    --DIO0_EF_READ_A_F_AND_RESET gets the measured high time in seconds
    Range = PulseWidth / 0.000147   --apply scale factor
    print("Range: ", Range, "inches")
  end
end