--This is an example that uses the SDP611 differential pressure sensor.

-- Check for device type and firmware version.
fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.W(6000, 1, 0)
end

-- This function will convert the binary values from the SDP611 to a pressure. The binary
-- data consists of two bytes which must be joined and interpreted as 2''s complement. The
-- resulting signed binary value is then converted to pascals.
function binToPa(a,b)
  -- Join the two bytes
  rawValue = a*256+b  
  
  -- Interpret as 2''s complement
  if rawValue >0x8000 then
    value = bit.band(bit.bnot(rawValue), 0xFFFF) +1
    value = value*-1
  else
    value=rawValue
  end
  
  -- Convert to pascals
  value = value / 60  
  
  return value
end

-- 64 or h40, is default for SDP611 differential pressure sensor
SLAVE_ADDRESS = 0x40

-- Configure the I2C Bus... SCL=12(EIO4) SDA=13(EIO5)
--NOTE: The T7 will not allow more than 1000 clock cycles of clock stretching. The SDP611 datasheet calls clock 
--stretching "master hold." The sensor needs to clock stretch for ~4.5ms. The clock needs to be ~20kHz or slower.
I2C.config(12, 13, 65216, 0, SLAVE_ADDRESS, 0)

-- Sets timing interval to get pressure reading once per second.
LJ.IntervalConfig(0, 1000)
  while true do
    if LJ.CheckInterval(0) then
      rawT = {}
      rawT = I2C.writeRead({0xF1},3)--
      pressure = binToPa(rawT[1],rawT[2])
      print("pressure = ", pressure,"Pa")
    end
end
