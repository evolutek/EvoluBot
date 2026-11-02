MV-280 Environmental Sensor Breakout — Quick Reference (fictitious part)

Overview
The MV-280 breakout combines a barometric pressure sensor and a temperature sensor on a 20 × 15 mm board. It is intended for weather stations, altimeters and CanSat payloads.

Electrical characteristics
- Supply voltage: 1.8 V to 3.6 V. The on-board regulator is not populated, so do not feed 5 V directly.
- Current draw: 3.6 µA in normal mode at 1 Hz sampling, 0.1 µA in sleep mode.
- Pressure range: 300 to 1100 hPa, absolute accuracy ±1 hPa.
- Temperature range: −40 °C to +85 °C.

Interface
- The board speaks I²C (up to 3.4 MHz) and SPI (up to 10 MHz). Tie the CSB pin high to select I²C.
- The I²C address is 0x76 when SDO is pulled to ground and 0x77 when SDO is pulled up to VDDIO.
- 4.7 kΩ pull-up resistors are fitted on SDA and SCL; remove them if the bus already has pull-ups.

Usage notes
- Allow 2 ms start-up time after power-on before the first read.
- Avoid placing the sensor next to heat sources such as voltage regulators: self-heating skews the temperature reading.
- Oversampling reduces noise at the cost of a longer conversion time.
