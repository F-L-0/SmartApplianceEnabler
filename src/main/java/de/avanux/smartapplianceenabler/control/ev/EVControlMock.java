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

import de.avanux.smartapplianceenabler.meter.Meter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Timer;
import java.util.TimerTask;

public class EVControlMock implements EVControl, Meter {

    private Logger logger = LoggerFactory.getLogger(EVControlMock.class);
    private boolean charging;
    private boolean chargingCompleted;
    private boolean energyMeterStarted;
    private Timer timer = new Timer();
    private float energyCounter = 0.0f;
    private TimerTask energyCounterTimerTask = new TimerTask() {
        @Override
        public void run() {
            if(energyMeterStarted) {
                energyCounter += 0.01f;
                logDebug("energyCounter=" + energyCounter);
            }
        }
    };
    private TimerTask chargingCompletedTimerTask = new TimerTask() {
        @Override
        public void run() {
            logDebug("chargingCompleted");
            charging = false;
            chargingCompleted = true;
            energyCounterTimerTask.cancel();
        }
    };

    public EVControlMock() {
        logDebug("using EvControl Mock");
    }

    @Override
    public void setApplianceId(String applianceId) {
        logDebug("setApplianceId=" + applianceId);
    }

    @Override
    public void setPollInterval(Integer pollInterval) {
        logDebug("setPollInterval=" + pollInterval);
    }

    @Override
    public void init() {
        logDebug("init");
    }

    @Override
    public void validate() {
        logDebug("validate");
    }

    @Override
    public boolean isVehicleNotConnected() {
        boolean notConnected = false;
        logDebug("isVehicleNotConnected=" + notConnected);
        return notConnected;
    }

    @Override
    public boolean isVehicleConnected() {
        boolean connected = true;
        logDebug("isVehicleNotConnected=" + connected);
        return connected;
    }

    @Override
    public boolean isCharging() {
        logDebug("isCharging=" + this.charging);
        return this.charging;
    }

    @Override
    public boolean isInErrorState() {
        boolean errorState = false;
        logDebug("isInErrorState=" + errorState);
        return errorState;
    }

    @Override
    public void setChargeCurrent(int current) {
        logDebug("setChargeCurrent=" + current);
    }

    @Override
    public void startCharging() {
        logDebug("startCharging");
        this.charging = true;
    }

    @Override
    public void stopCharging() {
        logDebug("stopCharging");
        this.charging = false;
    }

    // --------- Meter ------------------------------------------------------

    @Override
    public void start(Timer timer) {
        logDebug("start");
    }

    @Override
    public void stop() {
        logDebug("stop");
    }

    @Override
    public boolean isOn() {
        return false;
    }

    @Override
    public int getAveragePower() {
        return 6800;
    }

    @Override
    public int getMinPower() {
        return 0;
    }

    @Override
    public int getMaxPower() {
        return 0;
    }

    @Override
    public Integer getMeasurementInterval() {
        return null;
    }

    @Override
    public float getEnergy() {
        return energyCounter;
    }

    @Override
    public void startEnergyMeter() {
        logDebug("startEnergyMeter");
        energyMeterStarted = true;
        if(energyCounterTimerTask.scheduledExecutionTime() == 0) {
            this.timer.schedule(energyCounterTimerTask, 0, 1000);
        }
        if(chargingCompletedTimerTask.scheduledExecutionTime() == 0) {
            this.timer.schedule(chargingCompletedTimerTask, 600000);
        }
    }

    @Override
    public void stopEnergyMeter() {
        logDebug("stopEnergyMeter");
        energyMeterStarted = false;
    }

    @Override
    public void resetEnergyMeter() {
        logDebug("resetEnergyMeter");
        energyCounter = 0.0f;
    }

    private void logDebug(String message) {
        logger.debug("##### " + message);
    }
}
