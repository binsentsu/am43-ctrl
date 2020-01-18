const EventEmitter = require('events');

const serviceUUID = '0000fe5000001000800000805f9b34fb';
const am43CharUUID = '0000fe5100001000800000805f9b34fb';

const AM43HANDLE = 0x000e;

const HEX_KEY_OPEN_BLINDS = "00ff00009a0d010096";
const HEX_KEY_CLOSE_BLINDS = "00ff00009a0d0164f2";
const HEX_KEY_STOP_BLINDS = "00ff00009a0a01cc5d";


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

        Object.defineProperty(this, '_init', {
            set: function (state) {
                this.emit('initPerformed', this.getState());
            }
        });
    }

    writeLog(pLogLine) {
        this.log(pLogLine);
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
                }
                else
                {
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
            state: this.state
        };
    }
}

module.exports = am43;
