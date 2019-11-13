--[[
    Name: 13_pid_example.lua
    Desc: This script sets a DAC0 output according to a PID controller
    Note: Requires FW 1.0282 or greater on the T7
    Gets a setpoint from a host computer.  Host computer writes new setpoint
    to modbus address 46000
--]]

print("This is a PID example script that sets a DAC0 output.")
-- timestep of the loop in ms, change according to your process (see theory on
-- sampling rate in PID control)
local timestep = 2000
local vin = 0
local setpoint = 0
local vout = 0
-- Change the PID terms according to your process
local kp = 1
local ki = 0.05
local kd = 0.5
-- Output polarity +1 or -1, i.e. for a positive error, negative output: -1
local polout = 1
-- Bounds for the output value
local minout = 0
local maxout = 5
local outputcheck = 0
local lastin = 0
local intterm = 0
local difterm = 0
print("Running PID control on AIN2 with setpoint out at DAC0")
-- Configure an interval for the timestep
LJ.IntervalConfig(0, timestep)
-- First, set the output on the DAC to +5V
MB.writeName("DAC0", 5.0)
i = 0
while true do
  -- If a timestep interval is done
  if LJ.CheckInterval(0) then
    i = i + 1
    -- Read AIN2 as the feedback source
    vin = MB.readName("AIN2")
    -- DAC0 connected to AIN0 as well
    outputcheck = MB.readName("AIN0")
    -- Get a new setpoint from USER_RAM0_F32
    setpoint = MB.readName("USER_RAM0_F32")
    print("AIN0 = DAC0 = ", outputcheck, "V")
    print("AIN2 =", vin, "V")
    intterm = setpoint
    err = setpoint - vin
    print("The error is ", err)
    intterm = intterm + ki * err
    intterm = intterm * polout
    if intterm > maxout then
      intterm = maxout
    elseif intterm < minout then
      intterm = minout
    end
    print("The Int term is ", intterm)
    difterm = vin - lastin
    difterm = polout * difterm
    print("The Diff term is ", difterm * kd)
    vout = polout* kp * err + intterm + kd * difterm
    if vout > maxout then
      vout = maxout
    elseif vout < minout then
      vout = minout
    end
    print("The output is ", vout)
    -- Write vout to DAC0
    MB.writeName("DAC0", vout)
    lastin = vin
    print("")
  end
end