print("This is a PID example script that sets a DAC0 output.")
--Requires FW 1.0166 or greater
--Gets a setpoint from a host computer.  Host computer writes new setpoint to modbus address 46000

timeStep = 2000 --timestep of the loop in ms, change according to your process (see theory on sampling rate in PID control)
inputV = 0
setpoint = 0
outputV = 0

kp = 1    --change the PID terms according to your process
ki = 0.05
kd = 0.5

polOut = 1  --output polarity +1 or -1, i.e. for a positive error, negative output: -1

outputMin = 0  --bounds for the output value
outputMax = 5

outputCheck = 0
lastInput = 0
intterm = 0
difterm = 0

print("Running PID control on AIN2 with setpoint out at DAC0")

LJ.IntervalConfig(0, timeStep)              --set interval to 100 for 100ms

--First set the output on the DAC to +5V
MB.W(1000, 3, 5.0) --Set DAC0

i = 0
while true do
  if LJ.CheckInterval(0) then               --interval completed
    i = i + 1
    inputV = MB.R(4, 3)             --read AIN2 as the feedback source
    outputCheck = MB.R(0, 3)        --DAC0 connected to AIN0 as well
    setpoint = MB.R(46000, 3)       --get new setpoint from USER_RAM0_F32, address 46000
    print("AIN0 = DAC0 = ", outputCheck, "V")
    print("AIN2 =", inputV, "V")
    
    intterm = setpoint
    err = setpoint - inputV
    print("The error is ", err)
    
    intterm = intterm + ki * err
    intterm = intterm * polOut
    if intterm > outputMax then
      intterm = outputMax
    elseif intterm < outputMin then
      intterm = outputMin
    end
    print("The Int term is ", intterm)
    
    difterm = inputV - lastInput
    difterm = polOut * difterm 
    print("The Diff term is ", difterm * kd)
    
    outputV = polOut* kp * err + intterm + kd * difterm
    if outputV > outputMax then
      outputV = outputMax
    elseif outputV < outputMin then
      outputV = outputMin
    end
    print("The output is ", outputV)
    
    MB.W(1000, 3, outputV) --Set DAC0
    lastInput = inputV
    
    print("")
  end
end