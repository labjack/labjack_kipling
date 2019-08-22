print("Benchmarking Test: Read AIN0 as fast as possible, and configure Duty Cycle.")
--Users must first configure a digital I/O for PWM out, and save those settings as defaults
--After PWM output is enabled, the duty cycle can be updated easily by changing DIO0_EF_CONFIG_A
--http://labjack.com/support/datasheets/t7/digital-io/extended-features/pwm-out
--Script runs at about 9.5kHz
--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 50    --Default throttle setting is 10 instructions

devType = MB.R(60000, 3)
if devType == 7 then--if T7
	dio_ef_chan = 44300--FIO0 on the T7
elseif devType == 4 then--if T4
	dio_ef_chan = 44308--FIO4 on the T4
end

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

--For fastest AIN speeds, T7-PROs must use the 16-bit 
--high speed converter, instead of the slower 24-bit converter
MB.W(48005, 0, 1)     --Ensure analog is on
MB.W(43903, 0, 1)     --set AIN_ALL_RESOLUTION_INDEX to 1(fastest)

AIN0 = 0
NewDC=0

Print_interval_ms = 2000
c = 0
LJ.IntervalConfig(0, Print_interval_ms)

while true do
  AIN0 = MB.R(0, 3)   --Address of AIN0 is 0, type is 3
  --Insert logic for determining the new duty cycle
  NewDC=4000;
  --end Logic
  MB.W(dio_ef_chan, 1, NewDC)  --Change duty cycle to 50% DIO0_EF_CONFIG_A
  c = c + 1
  if LJ.CheckInterval(0) then
    c = c / (Print_interval_ms / 1000)
    print ("Frequency in Hz: ", c)
    c = 0
  end
end