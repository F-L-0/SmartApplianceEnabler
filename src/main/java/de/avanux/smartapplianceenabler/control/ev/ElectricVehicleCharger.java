/*
 * Copyright (C) 2018 Axel Müller <axel.mueller@avanux.de>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

package de.avanux.smartapplianceenabler.control.ev;

import de.avanux.smartapplianceenabler.appliance.Appliance;
import de.avanux.smartapplianceenabler.appliance.ApplianceIdConsumer;
import de.avanux.smartapplianceenabler.appliance.ApplianceManager;
import de.avanux.smartapplianceenabler.appliance.RunningTimeMonitor;
import de.avanux.smartapplianceenabler.control.Control;
import de.avanux.smartapplianceenabler.control.ControlStateChangedListener;
import de.avanux.smartapplianceenabler.meter.Meter;
import de.avanux.smartapplianceenabler.semp.webservice.DeviceInfo;
import org.joda.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.bind.annotation.*;
import java.util.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class ElectricVehicleCharger implements Control, ApplianceIdConsumer {

    private transient Logger logger = LoggerFactory.getLogger(ElectricVehicleCharger.class);
    @XmlAttribute
    private Integer voltage = 230;
    @XmlAttribute
    private Integer phases = 1;
    @XmlAttribute
    private Integer pollInterval = 10; // seconds
    @XmlAttribute
    protected Integer startChargingStateDetectionDelay = 300;
    @XmlAttribute
    protected Boolean forceInitialCharging = false;
    @XmlElements({
        @XmlElement(name = "EVModbusControl", type = EVModbusControl.class),
    })
    private EVControl control;
    @XmlElements({
            @XmlElement(name = "ElectricVehicle", type = ElectricVehicle.class),
    })
    private List<ElectricVehicle> vehicles;
    private transient Integer chargingVehicleId;
    private transient Appliance appliance;
    private transient String applianceId;
    private transient Vector<State> stateHistory = new Vector<>();
    private static final float CHARGE_LOSS_FACTOR = 1.1f;
    private transient boolean useOptionalEnergy = true;
    private transient List<ControlStateChangedListener> controlStateChangedListeners = new ArrayList<>();
    private transient Long startChargingTimestamp;
    private transient Integer chargeAmount;
    private transient Integer chargePower;

    protected enum State {
        VEHICLE_NOT_CONNECTED,
        VEHICLE_CONNECTED,
        CHARGING,
        CHARGING_COMPLETED,
        ERROR
    }

    public void setAppliance(Appliance appliance) {
        this.appliance = appliance;
    }

    @Override
    public void setApplianceId(String applianceId) {
        this.applianceId = applianceId;
        control.setApplianceId(applianceId);
    }

    public EVControl getControl() {
        return control;
    }

    protected void setControl(EVControl control) {
        this.control = control;
    }

    public Integer getChargeAmount() {
        return chargeAmount;
    }

    public void setChargeAmount(Integer chargeAmount) {
        this.chargeAmount = chargeAmount;
    }

    public ElectricVehicle getChargingVehicle() {
        Integer evId = getChargingVehicleId();
        if(evId != null) {
            return getVehicle(evId);
        }
        return null;
    }

    public Integer getChargingVehicleId() {
        return chargingVehicleId;
    }

    public void setChargingVehicleId(Integer chargingVehicleId) {
        this.chargingVehicleId = chargingVehicleId;
    }

    public ElectricVehicle getVehicle(int evId) {
        for(ElectricVehicle electricVehicle : this.vehicles) {
            if(electricVehicle.getId() == evId) {
                return electricVehicle;
            }
        }
        return null;
    }

    public List<ElectricVehicle> getVehicles() {
        return vehicles;
    }

    protected void setVehicles(List<ElectricVehicle> vehicles) {
        this.vehicles = vehicles;
    }

    public void init() {
        boolean useEvControlMock = Boolean.parseBoolean(System.getProperty("sae.evcontrol.mock", "false"));
        if(useEvControlMock) {
            this.control= new EVControlMock();
            this.appliance.setMeter((Meter) this.control);
        }
        logger.debug("{}: voltage={} phases={} startChargingStateDetectionDelay={}",
                this.applianceId, this.voltage, this.phases, this.startChargingStateDetectionDelay);
        if(this.vehicles != null) {
            for(ElectricVehicle vehicle: this.vehicles) {
                logger.debug("{}: {}", this.applianceId, vehicle);
            }
        }
        initStateHistory();
        control.validate();
    }

    public void start(Timer timer) {
        stopCharging();
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                updateState();            }
        }, 0, this.pollInterval * 1000);
    }

    /**
     * Returns true, if the state update was performed. This does not necessarily mean that the state has changed!
     * @return
     */
    protected boolean updateState() {
        if(isWithinStartChargingStateDetectionDelay()) {
            logger.debug("{}: Skipping state detection for {}s after switched on.", applianceId, this.startChargingStateDetectionDelay);
            return false;
        }
        State previousState = getState();
        State currentState = getNewState(previousState);
        if(currentState != previousState) {
            logger.debug("{}: Vehicle state changed: previousState={} newState={}", applianceId, previousState, currentState);
            stateHistory.add(currentState);
            onStateChanged(previousState, currentState);
        }
        else {
            logger.debug("{}: Vehicle state={}", applianceId, currentState);
        }
        return true;
    }

    public State getState() {
        return stateHistory.lastElement();
    }

    protected void setState(State state) {
        this.stateHistory.add(state);
    }

    public boolean wasInState(State state) {
        return stateHistory.contains(state);
    }

    public boolean wasInStateOneTime(State state) {
        int times = 0;
        for (State historyState: stateHistory) {
            if(historyState == state) {
                times++;
            }
        }
        return times == 1;
    }

    private void initStateHistory() {
        this.stateHistory.clear();
        stateHistory.add(State.VEHICLE_NOT_CONNECTED);
    }

    protected State getNewState(State currenState) {
        State newState = currenState;
        if(control.isInErrorState()) {
            return State.ERROR;
        }
        if(currenState == State.ERROR) {
            if(control.isVehicleConnected()) {
                newState = State.VEHICLE_CONNECTED;
            }
            else if(control.isCharging()) {
                newState = State.CHARGING;
            }
            else if(control.isChargingCompleted()) {
                newState = State.CHARGING_COMPLETED;
            }
            else if(control.isVehicleNotConnected()) {
                newState = State.VEHICLE_NOT_CONNECTED;
            }
        }
        else if(currenState == State.VEHICLE_NOT_CONNECTED) {
            if (control.isVehicleConnected()) {
                newState = State.VEHICLE_CONNECTED;
            }
        }
        else if(currenState == State.VEHICLE_CONNECTED) {
            if(control.isCharging()) {
                newState = State.CHARGING;
            }
            else if(control.isChargingCompleted()) {
                newState = State.CHARGING_COMPLETED;
            }
            else if(control.isVehicleNotConnected()) {
                newState = State.VEHICLE_NOT_CONNECTED;
            }
        }
        else if(currenState == State.CHARGING) {
            if(! control.isCharging()) {
                if(control.isChargingCompleted()) {
                    newState = State.CHARGING_COMPLETED;
                }
                if(control.isVehicleConnected()) {
                    newState = State.VEHICLE_CONNECTED;
                }
                else if(control.isVehicleNotConnected()) {
                    newState = State.VEHICLE_NOT_CONNECTED;
                }
            }
        }
        else if(currenState == State.CHARGING_COMPLETED) {
            if (control.isVehicleNotConnected()) {
                newState = State.VEHICLE_NOT_CONNECTED;
            }
        }
        return newState;
    }

    @Override
    public boolean on(LocalDateTime now, boolean switchOn) {
        if(switchOn) {
            logger.info("{}: Switching on", applianceId);
            startCharging();
        }
        else {
            logger.info("{}: Switching off", applianceId);
            stopCharging();
        }
        for(ControlStateChangedListener listener : controlStateChangedListeners) {
            listener.controlStateChanged(now, switchOn);
        }
        return true;
    }

    @Override
    public boolean isOn() {
        return isOn(this.startChargingStateDetectionDelay,
                System.currentTimeMillis(), this.startChargingTimestamp);
    }

    protected boolean isOn(Integer startChargingStateDetectionDelay,
                        long currentMillis, Long startChargingTimestamp) {
        if(isWithinStartChargingStateDetectionDelay(startChargingStateDetectionDelay, currentMillis,
                startChargingTimestamp)) {
            return true;
        }
        return isCharging();
    }

    private void onStateChanged(State previousState, State newState) {
        if(newState == State.VEHICLE_CONNECTED) {
            if(this.forceInitialCharging && wasInStateOneTime(State.VEHICLE_CONNECTED)) {
                startCharging();
            }
            if(this.appliance != null) {
                this.appliance.activateSchedules();
            }
        }
        if(newState == State.CHARGING) {
            if(this.forceInitialCharging && wasInStateOneTime(State.CHARGING)) {
                stopCharging();
            }
        }
        if(newState == State.VEHICLE_NOT_CONNECTED) {
            if(this.appliance != null) {
                this.appliance.deactivateSchedules();
            }
            stopCharging();
            initStateHistory();
        }
    }

    @Override
    public void addControlStateChangedListener(ControlStateChangedListener listener) {
        this.controlStateChangedListeners.add(listener);
    }

    protected boolean isWithinStartChargingStateDetectionDelay() {
        return isWithinStartChargingStateDetectionDelay(this.startChargingStateDetectionDelay,
                System.currentTimeMillis(), this.startChargingTimestamp);
    }

    protected boolean isWithinStartChargingStateDetectionDelay(Integer startChargingStateDetectionDelay,
                                                               long currentMillis, Long startChargingTimestamp) {
        return (startChargingTimestamp != null
                && currentMillis - startChargingTimestamp < startChargingStateDetectionDelay * 1000);
    }

    public boolean isVehicleConnected() {
        return getState() == State.VEHICLE_CONNECTED;
    }

    public boolean isCharging() {
        return getState() == State.CHARGING;
    }

    public boolean isChargingCompleted() {
        return getState() == State.CHARGING_COMPLETED;
    }

    public boolean isInErrorState() {
        return getState() == State.ERROR;
    }

    public boolean isUseOptionalEnergy() {
        return useOptionalEnergy;
    }

    public  void setEnergyDemand(Integer evId, Integer socCurrent, Integer socRequested, LocalDateTime chargeEnd) {
        logger.debug("{}: Energy demand: evId={} socCurrent={} socCurrent={} chargeEnd={}",
                applianceId, evId, socCurrent, socRequested, chargeEnd);
        setChargingVehicleId(evId);

        DeviceInfo deviceInfo = ApplianceManager.getInstance().getDeviceInfo(appliance.getId());
        int maxChargePower = deviceInfo.getCharacteristics().getMaxPowerConsumption();

        int batteryCapacity = ElectricVehicle.DEFAULT_BATTERY_CAPACITY;
        ElectricVehicle vehicle = getVehicle(evId);
        if(vehicle != null) {
            batteryCapacity = vehicle.getBatteryCapacity();
            Integer maxVehicleChargePower = vehicle.getMaxChargePower();
            if(maxVehicleChargePower != null && maxVehicleChargePower < maxChargePower) {
                maxChargePower = maxVehicleChargePower;
            }
        }

        int resolvedSocRequested = (socRequested != null ? socRequested : 100);
        int resolvedSocCurrent = (socCurrent != null ? socCurrent : 0);
        int energy = Float.valueOf(((float) resolvedSocRequested - resolvedSocCurrent)/100.0f * batteryCapacity).intValue();
        setChargeAmount(energy);
        logger.debug("{}: Calculated energy={}Wh batteryCapacity={}Wh", applianceId, energy, batteryCapacity);

        if(chargeEnd == null) {
            int chargeMinutes = Float.valueOf((float) energy / maxChargePower * CHARGE_LOSS_FACTOR * 60).intValue();
            chargeEnd = new LocalDateTime().plusMinutes(chargeMinutes);
            logger.debug("{}: Calculated charge end={} chargeMinutes={} maxPowerConsumption={} chargeLossFactor={}",
                    applianceId, chargeEnd, chargeMinutes, maxChargePower, CHARGE_LOSS_FACTOR);
        }

        RunningTimeMonitor runningTimeMonitor = appliance.getRunningTimeMonitor();
        if (runningTimeMonitor != null) {
            runningTimeMonitor.activateTimeframeInterval(new LocalDateTime(), energy, chargeEnd);
        }
    }

    public void setChargePower(int power) {
        int phases = this.phases;
        ElectricVehicle chargingVehicle = getChargingVehicle();
        if(chargingVehicle != null && chargingVehicle.getPhases() != null) {
            phases = chargingVehicle.getPhases();
        }
        int current = Float.valueOf((float) power / this.voltage * phases).intValue();
        logger.debug("{}: Set charge power: {}W corresponds to {}A", applianceId, power, current);
        this.chargePower = power;
        control.setChargeCurrent(current);
    }

    public Integer getChargePower() {
        return chargePower;
    }

    public void startCharging() {
        logger.debug("{}: Start charging process", applianceId);
        control.startCharging();
        this.startChargingTimestamp = System.currentTimeMillis();
    }

    public void stopCharging() {
        logger.debug("{}: Stop charging process", applianceId);
        control.stopCharging();
        this.startChargingTimestamp = null;
        this.chargingVehicleId = null;
        this.chargeAmount = null;
        this.chargePower = null;
    }

}
