print("Benchmarking Test: Low-Level AIN voltage reading. ..unimplemented")
--If you need this benchmarking test, let us know.  support@labjack.com
--Modbus reads of AIN values are pretty fast if you set the resolution index to 1
--i.e. 
--MB.W(41500, 0, 1) --sets resolution index of AIN0 to 1 (fastest)
--Voltage = MB.R(0, 3) --Read the votlage on AIN0