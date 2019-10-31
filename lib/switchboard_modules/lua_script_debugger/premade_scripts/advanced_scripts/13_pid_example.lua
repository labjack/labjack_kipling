print("This is a PID example script that sets a DAC0 output using AIN2 for feedback.")
print("Write a non-zero value to USER_RAM0_F32 to change the set point.")
--Requires FW 1.0166 or greater on the T7
--Gets a setpoint from a host computer.  Host computer writes new setpoint to modbus address 46000

local timeStep = 100 --timestep of the loop in ms, change according to your process (see theory on sampling rate in PID control)
local setpoint = 0
local inputV = 0
local outputV = 0

local kp = 0.1    --change the PID terms according to your process
local ki = 0.1
local kd = 0.01

local outputMin = 0  --bounds for the output value
local outputMax = 5

local lastInput = 0
local intterm = 0
local difterm = 0

LJ.IntervalConfig(0, timeStep)              --set interval to 100 for 100ms

local checkInterval = LJ.CheckInterval      --create local functions
local mbRead=MB.R
local mbWrite=MB.W

setpoint = mbRead(46000, 3)
if setpoint > outputMax then
    setpoint = outputMax
    mbWrite(46000, 3, setpoint)
elseif setpoint < outputMin then
    setpoint = outputMin
    mbWrite(46000, 3, setpoint)
end

--First set the output on the DAC to +3V
-- This will allow a user to see the PID loop in action
-- on first-run.  This needs to be deleted for most
-- use cases of a PID loop.
mbWrite(1000, 3, 3) --Set DAC0

i = 0
while true do
  if checkInterval(0) then               --interval completed
    i = i + 1
    
    setpoint = mbRead(46000, 3)       --get new setpoint from USER_RAM0_F32, address 46000
    if setpoint > outputMax then
        setpoint = outputMax
        mbWrite(46000, 3, setpoint)
    elseif setpoint < outputMin then
        setpoint = outputMin
        mbWrite(46000, 3, setpoint)
    end
    print("Setpoint: ", setpoint)
    inputV = mbRead(4, 3)             --read AIN2 as the feedback source
    print("AIN2 =", inputV, "V")
    err = setpoint - inputV
    print("The error is ", err)
    
    intterm = intterm + ki * err
    if intterm > outputMax then
      intterm = outputMax
    elseif intterm < outputMin then
      intterm = outputMin
    end
    print("The Int term is ", intterm)
    
    difterm = inputV - lastInput
    print("The Diff term is ", difterm)
    
    outputV = kp * err + intterm - kd * difterm
    if outputV > outputMax then
      outputV = outputMax
    elseif outputV < outputMin then
      outputV = outputMin
    end
    print("The output is ", outputV)
    
    mbWrite(1000, 3, outputV) --Set DAC0
    lastInput = inputV
    
    print("")
  end
end