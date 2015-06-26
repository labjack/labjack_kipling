--This example will output a pulse on FIO1 a specified amout of time after a 
-- rising edge is detected on FIO0. The delay between detection of a crossing 
-- and the beginning of the pulse is controlled by the F32 value in USER_RAM at 
-- modbus address 46000-46001. 
print("Begin")
state = "pulseUpdate"
dio_LS = MB.R(2000, 0)                 --Read FIO0
LJ.IntervalConfig(1, 500)
while true do
  dio_S = MB.R(2000, 0)                --Read FIO0
  if state == "waitingForZero" then
    if dio_LS == 0 and dio_S == 1 then --Rising edge detected?
      LJ.IntervalConfig(0, pulseDelay) --Start delay before starting pulse
      state = "pulseStart"
    end
  elseif state == "pulseStart" then    --
    if LJ.CheckInterval(0) then
      MB.W(2001, 0, 1)                 --Start pulse on FIO1
      LJ.IntervalConfig(0, 1)          --Set delay for the pulse width 
      state = "pulseEnd"
    end
  elseif state == "pulseEnd" then
    if LJ.CheckInterval(0) then
      MB.W(2001, 0, 0)                 --End pulse on FIO1
      state = "pulseUpdate"
    end
  elseif state == "pulseUpdate" then   --Read new pulse low time from user RAM
    pulseDelay = MB.R(46000, 3)        --Read 2 registers, interpret as a float.
    state = "waitingForZero"
    --Enforce constraints on pulse low time. (This is the amount of time between the 
    -- zero crossing and the activation pulse.)
    --print("new pulse", pulseLen)
  end
  dio_LS = dio_S
end