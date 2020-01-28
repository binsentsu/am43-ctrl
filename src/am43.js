const EventEmitter = require('events');

const serviceUUID = '0000fe5000001000800000805f9b34fb';
const am43CharUUID = '0000fe5100001000800000805f9b34fb';

const NOBLE_SERVICE_UID = "fe50";
const NOBLE_BAT_CHAR_UID = "fe51";

const AM43HANDLE = 0x000e;

const HEX_KEY_OPEN_BLINDS = "00ff00009a0d010096";
const HEX_KEY_CLOSE_BLINDS = "00ff00009a0d0164f2";
const HEX_KEY_STOP_BLINDS = "00ff00009a0a01cc5d";

const HEX_KEY_BATTERY_REQUEST = "00ff00009aa2010138";

class am43 extends EventEmitter {
    static busyDevice = null;

    constructor(id, peripheral, noble) {
        super();
        this.log = require('debug')(`am43:${id}`);
        this.id = id;
        this.peripheral = peripheral;
        this.noble = noble;
        this.connecttime = null;
        this.lastaction = null;
        this.state = null;
        this.currentRetry = 0;
        this.maxRetries = 30;
        this.success = false;
        this.batterysuccess = false;
        this.batterypercentage = null;

        Object.defineProperty(this, '_init', {
            set: function (state) {
                this.emit('initPerformed', this.getState());
            }
        });
    }

    writeLog(pLogLine) {
        this.log(pLogLine);
    }

    readBattery() {
        if (am43.busyDevice != null && am43.busyDevice.id !== this.id) {
            this.writeLog('Connection busy for other device, delaying battery read...');
            setTimeout(() => {
                this.readBattery()
            }, 1000);
            return;
        }
        this.batterysuccess = false;
        am43.busyDevice = this;

        this.peripheral.connect();
        this.peripheral.once('connect', handleDeviceConnected);
        this.peripheral.once('disconnect', disconnectMe);
        const self = this;

        function handleDeviceConnected() {
            self.connecttime = new Date();
            self.writeLog('AM43 connected for battery reading');
            var characteristicUUIDs = [NOBLE_BAT_CHAR_UID];
            var serviceUID = [NOBLE_SERVICE_UID];
            self.peripheral.removeAllListeners('servicesDiscover');
            self.peripheral.discoverSomeServicesAndCharacteristics(serviceUID, characteristicUUIDs, discoveryResult);
        }

        function disconnectMe() {
            self.writeLog('disconnected for battery reading');

            if (self.batterysuccess === false) {
                if (self.currentRetry < self.maxRetries) {
                    self.writeLog("Reading battery unsuccessful, retrying in 1 second...");
                    self.currentRetry = self.currentRetry + 1;
                    setTimeout(() => {
                        self.readBattery()
                    }, 1000);
                } else {
                    self.writeLog("Reading battery unsuccessful, giving up...");
                    am43.busyDevice = null;
                    self.currentRetry = 0;
                }
            } else {
                self.writeLog("Reading battery was successful");
                am43.busyDevice = null;
                self.currentRetry = 0;
                self.emit('stateChanged', self.getState());
            }
        }

        function discoveryResult(error, services, characteristics) {
            if (error) {
                self.writeLog("ERROR retrieving characteristic");
                self.peripheral.disconnect();
            } else {
                self.writeLog('discovered battery char');
                let characteristic = characteristics[0];
                characteristic.on('data', function (data, isNotification) {
                    self.writeLog('received characteristic update');
                    //read data to buffer
                    let bfr = Buffer.from(data, "hex");
                    //convert to hex string
                    let strBfr = bfr.toString("hex", 0, bfr.length);
                    //battery is hexadecimal on position 14, 2 bytes
                    let batteryHex = strBfr.substr(14, 2);
                    //convert hex number to integer
                    let batteryPercentage = parseInt(batteryHex, 16);
                    self.writeLog('Bat %: ' + batteryPercentage);
                    self.batterypercentage = batteryPercentage;

                    self.batterysuccess = true;
                    setTimeout(() => {
                        self.peripheral.disconnect();
                    }, 1000);
                });
                //subscribe to notifications on the char
                characteristic.subscribe();
                //write cmd to enable notifications
                characteristic.write(Buffer.from(HEX_KEY_BATTERY_REQUEST, "hex"), true);
            }
        }
    }

    writeKey(handle, key) {
        if (am43.busyDevice != null && am43.busyDevice.id !== this.id) {
            this.writeLog('Connection busy for other device, waiting...');
            setTimeout(() => {
                this.writeKey(handle, key)
            }, 1000);
            return;
        }
        this.success = false;
        am43.busyDevice = this;
        this.peripheral.connect();
        this.peripheral.once('connect', handleDeviceConnected);
        this.peripheral.once('disconnect', disconnectMe);
        const self = this;

        function handleDeviceConnected() {
            self.connecttime = new Date();
            self.writeLog('AM43 connected');
            self.peripheral.writeHandle(handle, Buffer.from(key, "hex"), true, handleWriteDone);
        }

        function disconnectMe() {
            self.writeLog('disconnected');
            if (self.success === false) {
                if (self.currentRetry < self.maxRetries) {
                    self.writeLog("Writing unsuccessful, retrying in 1 second...");
                    self.currentRetry = self.currentRetry + 1;
                    setTimeout(() => {
                        self.writeKey(handle, key)
                    }, 1000);
                } else {
                    self.writeLog("Writing unsuccessful, giving up...");
                    am43.busyDevice = null;
                    self.currentRetry = 0;
                }
            } else {
                self.writeLog("Writing was successful");
                am43.busyDevice = null;
                self.currentRetry = 0;
                self.emit('stateChanged', self.getState());
            }
        }

        function handleWriteDone(error) {
            if (error) {
                self.writeLog('ERROR' + error);
            } else {
                self.writeLog('key written');
                self.success = true;
            }

            setTimeout(() => {
                self.peripheral.disconnect();
            }, 1000);
        }
    }

    am43Init() {
        this._init = true;
        const self = this;

        setTimeout(() => {
            self.readBattery()
        }, 5000);

        const interval = this.randomIntMinutes(10, 20);
        this.writeLog("interval: " + interval);
        setInterval(() => {
            self.readBattery();
        }, interval);
    }

    randomIntMinutes(min, max) {
        return 1000 * 60 * (Math.floor(Math.random() * (max - min + 1) + min));
    }

    am43Open() {
        this.writeKey(AM43HANDLE, HEX_KEY_OPEN_BLINDS);
        this.lastaction = 'OPEN';
        this.state = 'OPEN';
    }

    am43Close() {
        this.writeKey(AM43HANDLE, HEX_KEY_CLOSE_BLINDS);
        this.lastaction = 'CLOSE';
        this.state = 'CLOSED';
    }

    am43Stop() {
        this.writeKey(AM43HANDLE, HEX_KEY_STOP_BLINDS);
        this.lastaction = 'STOP';
        this.state = 'OPEN';
    }

    getState() {
        return {
            id: this.id,
            lastconnect: this.connecttime,
            lastaction: this.lastaction,
            state: this.state,
            battery: this.batterypercentage
        };
    }
}

module.exports = am43;
