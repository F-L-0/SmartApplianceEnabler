/*
Copyright (C) 2017 Axel Müller <axel.mueller@avanux.de>

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import {Meter} from './meter';
import {S0ElectricityMeter} from '../meter-s0/s0-electricity-meter';
import {ModbusElectricityMeter} from '../meter-modbus/modbus-electricity-meter';
import {HttpElectricityMeter} from '../meter-http/http-electricity-meter';
import {MeterDefaults} from './meter-defaults';
import {Logger} from '../log/logger';

export class MeterFactory {

  constructor(private logger: Logger) {
  }

  defaultsFromJSON(rawMeterDefaults: any): MeterDefaults {
    this.logger.debug('MeterDefaults (JSON): ' + JSON.stringify(rawMeterDefaults));
    const meterDefaults = new MeterDefaults();
    meterDefaults.s0ElectricityMeter_measurementInterval
      = rawMeterDefaults.s0ElectricityMeter.measurementInterval;
    meterDefaults.httpElectricityMeter_factorToWatt = rawMeterDefaults.httpElectricityMeter.factorToWatt;
    meterDefaults.httpElectricityMeter_pollInterval = rawMeterDefaults.httpElectricityMeter.pollInterval;
    meterDefaults.httpElectricityMeter_measurementInterval = rawMeterDefaults.httpElectricityMeter.measurementInterval;
    meterDefaults.modbusElectricityMeter_pollInterval = rawMeterDefaults.modbusElectricityMeter.pollInterval;
    meterDefaults.modbusElectricityMeter_measurementInterval = rawMeterDefaults.modbusElectricityMeter.measurementInterval;
    this.logger.debug('MeterDefaults (TYPE): ' + JSON.stringify(meterDefaults));
    return meterDefaults;
  }

  createEmptyMeter(): Meter {
    return new Meter();
  }

  fromJSON(rawMeter: any): Meter {
    this.logger.debug('Meter (JSON): ', rawMeter);
    const meter = new Meter();
    meter.type = rawMeter['@class'];
    if (meter.type === S0ElectricityMeter.TYPE) {
      meter.s0ElectricityMeter = this.createS0ElectricityMeter(rawMeter);
    } else if (meter.type === ModbusElectricityMeter.TYPE) {
      meter.modbusElectricityMeter = this.createModbusElectricityMeter(rawMeter);
    } else if (meter.type === HttpElectricityMeter.TYPE) {
      meter.httpElectricityMeter = this.createHttpElectricityMeter(rawMeter);
    }
    this.logger.debug('Meter (TYPE): ', meter);
    return meter;
  }

  toJSON(meter: Meter): string {
    this.logger.debug('Meter (TYPE): ' + JSON.stringify(meter));
    let meterUsed: any;
    if (meter.type === S0ElectricityMeter.TYPE) {
      meterUsed = meter.s0ElectricityMeter;
    } else if (meter.type === ModbusElectricityMeter.TYPE) {
      meterUsed = meter.modbusElectricityMeter;
    } else if (meter.type === HttpElectricityMeter.TYPE) {
      meterUsed = meter.httpElectricityMeter;
    }
    let meterRaw: string;
    if (meterUsed != null) {
      meterRaw = JSON.stringify(meterUsed);
    }
    this.logger.debug('Meter (JSON): ' + meterRaw);
    return meterRaw;
  }

  createS0ElectricityMeter(rawMeter: any): S0ElectricityMeter {
    const s0ElectricityMeter = new S0ElectricityMeter();
    s0ElectricityMeter.gpio = rawMeter.gpio;
    s0ElectricityMeter.pinPullResistance = rawMeter.pinPullResistance;
    s0ElectricityMeter.impulsesPerKwh = rawMeter.impulsesPerKwh;
    s0ElectricityMeter.measurementInterval = rawMeter.measurementInterval;
    return s0ElectricityMeter;
  }

  createModbusElectricityMeter(rawMeter: any): ModbusElectricityMeter {
    return new ModbusElectricityMeter(...rawMeter);
  }

  createHttpElectricityMeter(rawMeter: any): HttpElectricityMeter {
    return new HttpElectricityMeter(...rawMeter);
  }
}
