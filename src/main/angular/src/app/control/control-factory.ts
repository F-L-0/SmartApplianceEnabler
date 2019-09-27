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

import {Control} from './control';
import {StartingCurrentSwitch} from '../control-startingcurrent/starting-current-switch';
import {Switch} from '../control-switch/switch';
import {ModbusSwitch} from '../control-modbus/modbus-switch';
import {HttpSwitch} from '../control-http/http-switch';
import {AlwaysOnSwitch} from '../control-alwayson/always-on-switch';
import {ControlDefaults} from './control-defaults';
import {MockSwitch} from './mock-switch';
import {Logger} from '../log/logger';
import {ModbusRegisterWrite} from '../shared/modbus-register-write';
import {EvCharger} from '../control-evcharger/ev-charger';
import {EvModbusControl} from '../control-evcharger-modbus/ev-modbus-control';
import {ModbusRegisterRead} from '../shared/modbus-register-read';
import {ElectricVehicle} from '../control-evcharger/electric-vehicle';
import {EvHttpControl} from '../control-evcharger-http/ev-http-control';

export class ControlFactory {

  constructor(private logger: Logger) {
  }

  defaultsFromJSON(rawControlDefaults: any): ControlDefaults {
    this.logger.debug('ControlDefaults (JSON): ' + JSON.stringify(rawControlDefaults));
    const controlDefaults = new ControlDefaults();
    controlDefaults.startingCurrentSwitchDefaults_powerThreshold
      = rawControlDefaults.startingCurrentSwitchDefaults.powerThreshold;
    controlDefaults.startingCurrentSwitchDefaults_startingCurrentDetectionDuration
      = rawControlDefaults.startingCurrentSwitchDefaults.startingCurrentDetectionDuration;
    controlDefaults.startingCurrentSwitchDefaults_finishedCurrentDetectionDuration
      = rawControlDefaults.startingCurrentSwitchDefaults.finishedCurrentDetectionDuration;
    controlDefaults.startingCurrentSwitchDefaults_minRunningTime
      = rawControlDefaults.startingCurrentSwitchDefaults.minRunningTime;
    const electricVehicleChargerDefaults = rawControlDefaults.electricVehicleChargerDefaults;
    controlDefaults.electricVehicleChargerDefaults_voltage = electricVehicleChargerDefaults.voltage;
    controlDefaults.electricVehicleChargerDefaults_phases = electricVehicleChargerDefaults.phases;
    controlDefaults.electricVehicleChargerDefaults_chargeLoss = electricVehicleChargerDefaults.chargeLoss;
    controlDefaults.electricVehicleChargerDefaults_pollInterval = electricVehicleChargerDefaults.pollInterval;
    controlDefaults.electricVehicleChargerDefaults_startChargingStateDetectionDelay =
      electricVehicleChargerDefaults.startChargingStateDetectionDelay;
    controlDefaults.electricVehicleChargerDefaults_forceInitialCharging =
      electricVehicleChargerDefaults.forceInitialCharging;


    this.logger.debug('ControlDefaults (TYPE): ' + JSON.stringify(controlDefaults));
    return controlDefaults;
  }

  createEmptyControl(): Control {
    return new Control();
  }

  fromJSON(rawControl: any): Control {
    this.logger.debug('Control (JSON): ' + JSON.stringify(rawControl));
    const control = new Control();
    if (rawControl['@class'] === StartingCurrentSwitch.TYPE) {
      control.startingCurrentDetection = true;
      control.startingCurrentSwitch = this.createStartingCurrentSwitch(rawControl);
      this.fromJSONbyType(control, rawControl.modbusControl);
    } else {
      this.fromJSONbyType(control, rawControl);
    }
    this.logger.debug('Control (TYPE): ' + JSON.stringify(control));
    return control;
  }

  fromJSONbyType(control: Control, rawControl: any) {
    if (rawControl != null) {
      this.initializeByType(control, rawControl, rawControl['@class']);
    }
  }

  initializeByType(control: Control, rawControl: any, type: string) {
    control.type = type;
    if (control.type === AlwaysOnSwitch.TYPE) {
      control.alwaysOnSwitch = this.createAlwaysOnSwitch(rawControl);
    } else if (control.type === MockSwitch.TYPE) {
      control.mockSwitch = this.createMockSwitch(rawControl);
    } else if (control.type === Switch.TYPE) {
      control.switch_ = this.createSwitch(rawControl);
    } else if (control.type === ModbusSwitch.TYPE) {
      control.modbusSwitch = this.createModbusSwitch(rawControl);
    } else if (control.type === EvCharger.TYPE) {
      control.evCharger = this.createEvCharger(rawControl);
    } else if (control.type === HttpSwitch.TYPE) {
      control.httpSwitch = this.createHttpSwitch(rawControl);
    }
  }

  getControlByType(control: Control): any {
    if (control.type === AlwaysOnSwitch.TYPE) {
      return control.alwaysOnSwitch;
    } else if (control.type === MockSwitch.TYPE) {
      return control.mockSwitch;
    } else if (control.type === Switch.TYPE) {
      return control.switch_;
    } else if (control.type === ModbusSwitch.TYPE) {
      return control.modbusSwitch;
    } else if (control.type === EvCharger.TYPE) {
      return control.evCharger;
    } else if (control.type === HttpSwitch.TYPE) {
      return control.httpSwitch;
    }
    return null;
  }

  createAlwaysOnSwitch(rawAlwaysOnSwitch?: any): AlwaysOnSwitch {
    return new AlwaysOnSwitch();
  }

  createMockSwitch(rawMockSwitch?: any): MockSwitch {
    return new MockSwitch();
  }

  createStartingCurrentSwitch(rawStartingCurrentSwitch: any): StartingCurrentSwitch {
    const startingCurrentSwitch = new StartingCurrentSwitch();
    startingCurrentSwitch.powerThreshold = rawStartingCurrentSwitch.powerThreshold;
    startingCurrentSwitch.startingCurrentDetectionDuration = rawStartingCurrentSwitch.startingCurrentDetectionDuration;
    startingCurrentSwitch.finishedCurrentDetectionDuration = rawStartingCurrentSwitch.finishedCurrentDetectionDuration;
    startingCurrentSwitch.minRunningTime = rawStartingCurrentSwitch.minRunningTime;
    return startingCurrentSwitch;
  }

  createSwitch(rawSwitch: any): Switch {
    const switch_ = new Switch();
    if (rawSwitch) {
      switch_.gpio = rawSwitch.gpio;
      switch_.reverseStates = rawSwitch.reverseStates;
    }
    return switch_;
  }

  createModbusSwitch(rawModbusSwitch: any): ModbusSwitch {
    return {...rawModbusSwitch};
  }

  createHttpSwitch(rawControl: any): HttpSwitch {
    return {...rawControl};
  }

  createEvCharger(rawEvCharger: any): EvCharger {
    let evCharger = new EvCharger();
    if (rawEvCharger) {
      const evs: ElectricVehicle[] = [];
      if (rawEvCharger.vehicles) {
        (rawEvCharger.vehicles as any[]).map(rawEv => {
          const ev: ElectricVehicle = {...rawEv};
          evs.push(ev);
        });
      }

      evCharger = new EvCharger({
        voltage: rawEvCharger.voltage,
        phases: rawEvCharger.phases,
        pollInterval: rawEvCharger.pollInterval,
        startChargingStateDetectionDelay: rawEvCharger.startChargingStateDetectionDelay,
        forceInitialCharging: rawEvCharger.forceInitialCharging,
        vehicles: evs
      });

      if (rawEvCharger.control['@class'] === EvModbusControl.TYPE) {
        evCharger.modbusControl = this.createEvModbusControl(rawEvCharger.control);
      } else if (rawEvCharger.control['@class'] === EvHttpControl.TYPE) {
        evCharger.httpControl = this.createEvHttpControl(rawEvCharger.control);
      }
    }
    return evCharger;
  }

  createEvModbusControl(rawModbusControl: any): EvModbusControl {
    return new EvModbusControl(...rawModbusControl);
  }

  createEvHttpControl(rawHttpControl: any): EvHttpControl {
    return new EvHttpControl(...rawHttpControl);
  }

  toJSON(control: Control): string {
    this.logger.debug('Control (TYPE): ' + JSON.stringify(control));
    let controlUsed: any;
    if (control.startingCurrentDetection) {
      control.startingCurrentSwitch['control'] = this.getControlByType(control);
      controlUsed = control.startingCurrentSwitch;
      if (controlUsed.powerThreshold === '') {
        controlUsed.powerThreshold = null;
      }
      if (controlUsed.startingCurrentDetectionDuration === '') {
        controlUsed.startingCurrentDetectionDuration = null;
      }
      if (controlUsed.finishedCurrentDetectionDuration === '') {
        controlUsed.finishedCurrentDetectionDuration = null;
      }
      if (controlUsed.minRunningTime === '') {
        controlUsed.minRunningTime = null;
      }
    } else {
      controlUsed = this.getControlByType(control);
    }
    let rawControl: string;
    if (controlUsed) {
      if (control.type === EvCharger.TYPE) {
        this.toJSONEvCharger(control);
      }
      rawControl = JSON.stringify(controlUsed);
    }
    this.logger.debug('Control (JSON): ' + rawControl);
    return rawControl;
  }

  toJSONEvCharger(control: Control) {
    const evCharger = control.evCharger;
    if (evCharger.httpControl) {
      evCharger['control'] = evCharger.httpControl;
    }
    if (evCharger.modbusControl) {
      evCharger['control'] = evCharger.modbusControl;
    }
  }

  toElectricVehicle(rawEv: any): ElectricVehicle {
    this.logger.debug('ElectricVehicle (JSON): ' + JSON.stringify(rawEv));
    const ev = new ElectricVehicle(...rawEv);
    this.logger.debug('ElectricVehicle (TYPE): ' + JSON.stringify(ev));
    return ev;
  }
}
