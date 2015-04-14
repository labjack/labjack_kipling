print("Benchmarking Test: Read AIN0 as fast as possible, and configure Duty Cycle.")
--Users must first configure a digital I/O for PWM out, and save those settings as defaults
--After PWM output is enabled, the duty cycle can be updated easily by changing DIO0_EF_CONFIG_A
--http://labjack.com/support/datasheets/t7/digital-io/extended-features/pwm-out
--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 35    --Default throttle setting is 10 instructions

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

--For fastest AIN speeds, T7-PROs must use the 16-bit 
--high speed converter, instead of the slower 24-bit converter
MB.W(48005, 0, 1)     --Ensure analog is on
MB.W(43903, 0, 1)     --set AIN_ALL_RESOLUTION_INDEX to 1(fastest)

AIN0 = 0
NewDC=0

while true do
  AIN0 = MB.R(0, 3)   --Address of AIN0 is 0, type is 3
  --Insert logic for determining the new duty cycle
  NewDC=4000;
  --end Logic
  MB.W(44300, 1, NewDC)  --Change duty cycle to 50% DIO0_EF_CONFIG_A
end