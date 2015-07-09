print("Example for servo motor using PWM output.")
--Users must first configure a digital I/O for PWM out
--After PWM output is enabled, the duty cycle can be updated easily by changing DIO0_EF_CONFIG_A
--http://labjack.com/support/datasheets/t7/digital-io/extended-features/pwm-out
--default for most servo motors is 50 Hz or one cycle every 20ms

roll=25000
dutyCycle=10--as a percentage
print("duty cycle:", dutyCycle)
--configure clock
MB.W(44900, 0, 0)     --turn off clk0 for config
MB.W(44901, 0, 8)    --Configure Clock0's divisor
MB.W(44904, 1, roll) --Configure Clock0's roll value
MB.W(44900, 0, 1)     --enable clock0

--configure FIO0
MB.W(44000, 1, 0)     --disable DIO0_EF_ENABLE for initial config
MB.W(44100, 1, 0)     --configure EF for PWM
MB.W(44200, 1, 0)     --Configure what clock source to use: Clock0

processing=0
LJ.IntervalConfig(0, 500)
while processing~=3 do
  if LJ.CheckInterval(0) then
    if processing==0 then
      MB.W(44300, 1, roll/((1/dutyCycle)*100)) --Configure duty cycle (DIO0_EF_CONFIG_A) to be: 50%
      MB.W(44000, 1, 1)         --Enable the EF system, PWM wave is now being outputted
      print("duty cycle:", dutyCycle+10)
      processing=1
    elseif processing==1 then   --'off' state. 
      MB.W(44000, 1, 0)         --disable FIO0 after 3 seconds to set the servo position
      dutyCycle=dutyCycle+10    --set NEW DUTY CYCLE TO 10% more than previous
      processing=0
      if (dutyCycle>=100) then  --check if over 100%
        processing=3            --break out of loop
      end
    end
  end
end