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
import {ModbusRegisterRead} from '../shared/modbus-register-read';
import {ModbusRegisterReadValue} from '../shared/modbus-register-read-value';
import {ModbusRegisterConfguration} from '../shared/modbus-register-confguration';
import {HttpReadValue} from '../http-read-value/http-read-value';
import {MeterValueName} from './meter-value-name';
import {HttpRead} from '../http-read/http-read';

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
      if (meter.type === ModbusElectricityMeter.TYPE) {
        this.toJSONModbusElectricityMeter(meter.modbusElectricityMeter);
      }
      if (meter.type === HttpElectricityMeter.TYPE) {
        this.toJSONHttpElectricityMeter(meter.httpElectricityMeter);
      }
      meterRaw = JSON.stringify(meterUsed);
    }
    this.logger.debug('Meter (JSON): ' + meterRaw);
    return meterRaw;
  }

  toJSONModbusElectricityMeter(modbusElectricityMeter: ModbusElectricityMeter) {
    // const powerRegisterRead = this.toJSONModbusRegisterRead(
    //   'Power', modbusElectricityMeter.powerConfiguration);
    // const energyRegisterRead = this.toJSONModbusRegisterRead(
    //   'Energy', modbusElectricityMeter.energyConfiguration);
    // modbusElectricityMeter.registerReads = [powerRegisterRead, energyRegisterRead];
  }

  toJSONModbusRegisterRead(registerReadValueName: string, configuration: ModbusRegisterConfguration): ModbusRegisterRead {
    return new ModbusRegisterRead({
      address: configuration.address,
      bytes: configuration.bytes,
      byteOrder: configuration.byteOrder,
      type: configuration.type,
      factorToValue: configuration.factorToValue,
      registerReadValues: [new ModbusRegisterReadValue({name: registerReadValueName})]
    });
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
    const modbusElectricityMeter: ModbusElectricityMeter = {...rawMeter};
    // if (!!rawMeter.modbusReads) {
    //   rawMeter.modbusReads.forEach((rawModbusRead) => {
    //     if (!!rawModbusRead.readValues && rawModbusRead.readValues.length > 0) {
    //       if (rawModbusRead.readValues[0].name === MeterValueName.Power) {
    //         modbusElectricityMeter.powerModbusRead = {...rawModbusRead};
    //       }
    //       if (rawModbusRead.readValues[0].name === MeterValueName.Energy) {
    //         modbusElectricityMeter.energyModbusRead = {...rawModbusRead};
    //       }
    //     }
    //   });
    // }
    return modbusElectricityMeter;
  }

  createHttpElectricityMeter(rawMeter: any): HttpElectricityMeter {
    const httpElectricityMeter: HttpElectricityMeter = {...rawMeter};
    // if (!!rawMeter.httpReads) {
    //   rawMeter.httpReads.forEach((rawHttpRead) => {
    //     if (!!rawHttpRead.readValues && rawHttpRead.readValues.length > 0) {
    //       if (rawHttpRead.readValues[0].name === MeterValueName.Power) {
    //         httpElectricityMeter.powerHttpRead = {...rawHttpRead};
    //       }
    //       if (rawHttpRead.readValues[0].name === MeterValueName.Energy) {
    //         httpElectricityMeter.energyHttpRead = {...rawHttpRead};
    //       }
    //     }
    //   });
    // }
    return httpElectricityMeter;
  }

  toJSONHttpElectricityMeter(httpElectricityMeter: HttpElectricityMeter) {
    const rawMeter = httpElectricityMeter as any;
    rawMeter.httpReads = [];
    // if (httpElectricityMeter.powerHttpRead) {
    //   rawMeter.httpReads.push(httpElectricityMeter.powerHttpRead);
    // }
    // if (httpElectricityMeter.powerHttpRead) {
    //   rawMeter.httpReads.push(httpElectricityMeter.energyHttpRead);
    // }
    return rawMeter;
  }
}
