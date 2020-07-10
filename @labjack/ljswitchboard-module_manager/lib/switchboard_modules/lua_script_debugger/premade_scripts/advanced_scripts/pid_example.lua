--[[
    Name: 13_pid_example.lua
    Desc: This is a PID example script that sets a DAC0 output using AIN2 for
          feedback
    Note: Gets a setpoint from a host computer.  Host computer writes the new
          setpoint to modbus address 46000 (USER_RAM0_F32)

          Requires FW 1.0282 or greater on the T7
--]]

print("This is a PID example script that sets a DAC0 output using AIN2 for feedback.")
print("Write a non-zero value to USER_RAM0_F32 to change the set point.")
-- Timestep of the loop in ms. Change according to your process
-- (see theory on sampling rate in PID control)
local timestep = 100
local setpoint = 0
local vin = 0
local vout = 0
-- Change the PID terms according to your process
local kp = 0.1
local ki = 0.1
local kd = 0.01
-- Bounds for the output value
local minout = 0
local maxout = 5
local lastin = 0
local intterm = 0
local difterm = 0
-- Configure the timestep interval
LJ.IntervalConfig(0, timestep)
setpoint = MB.readName("USER_RAM0_F32")
if setpoint > maxout then
    setpoint = maxout
    MB.writeName("USER_RAM0_F32", setpoint)
elseif setpoint < minout then
    setpoint = minout
    MB.writeName("USER_RAM0_F32", setpoint)
end
-- First set the output on the DAC to +3V
-- This will allow a user to see the PID loop in action
-- on first-run.  This needs to be deleted for most
-- use cases of a PID loop.
MB.writeName("DAC0", 3)
local i = 0
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    i = i + 1
    -- Get a new setpoint from USER_RAM0_F32
    setpoint = MB.readName("USER_RAM0_F32")
    if setpoint > maxout then
        setpoint = maxout
        MB.writeName("USER_RAM0_F32", setpoint)
    elseif setpoint < minout then
        setpoint = minout
        MB.writeName("USER_RAM0_F32", setpoint)
    end
    print("Setpoint: ", setpoint)
    -- Read AIN2 as the feedback source
    vin = MB.readName("AIN2")
    print("AIN2 =", vin, "V")
    err = setpoint - vin
    print("The error is ", err)
    intterm = intterm + ki * err
    -- Limit the integral term
    if intterm > maxout then
      intterm = maxout
    elseif intterm < minout then
      intterm = minout
    end
    print("The Int term is ", intterm)
    difterm = vin - lastin
    print("The Diff term is ", difterm)
    vout = kp * err + intterm - kd * difterm
    -- Limit the maximum output voltage
    if vout > maxout then
      vout = maxout
    elseif vout < minout then
      vout = minout
    end
    print("The output is ", vout)
    -- Write the output voltage to DAC0
    MB.writeName("DAC0", vout)
    lastin = vin
    print("")
  end
end