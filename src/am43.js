const EventEmitter = require('events');

const serviceUUID = '0000fe5000001000800000805f9b34fb';
const am43CharUUID = '0000fe5100001000800000805f9b34fb';

const AM43HANDLE = 0x000e;

const HEX_KEY_OPEN_BLINDS = "00ff00009a0d010096";
const HEX_KEY_CLOSE_BLINDS = "00ff00009a0d0164f2";
const HEX_KEY_STOP_BLINDS = "00ff00009a0a01cc5d";


class am43 extends EventEmitter {
    constructor(id, peripheral, noble) {
        super();
        this.log = require('debug')(`am43:${id}`);
        this.id = id;
        this.peripheral = peripheral;
        this.noble = noble;
        this.connecttime = null;
        this.lastaction = null;
        this.state = null;

        Object.defineProperty(this, '_init', {set: function(state) {
                this.emit('initPerformed', this.getState());
            }});
    }

    writeKey(handle, key) {
        this.peripheral.connect((error) => {
            if (error) {
                this.log('ERROR' + error);
                this.disconnect();
                return;
            }
            this.connecttime = new Date();
            this.log('AM43 connected');
            this.peripheral.writeHandle(handle, Buffer.from(key, "hex"), true, (error) => {
                if(error)
                {
                  this.log('ERROR' + error);
                }
                this.log('key written');
                setTimeout(() => {
                    this.disconnect();
                    this.emit('stateChanged', this.getState());
                }, 1000);

            });
        });
    }

    disconnect()
    {
        this.peripheral.disconnect(() => {
            this.log('disconnected');
        });
    }

    am43Init()
    {
        this._init = true;
    }

    am43Open() {
        this.writeKey(AM43HANDLE, HEX_KEY_OPEN_BLINDS);
        this.lastaction='OPEN';
        this.state = 'OPEN';
    }

    am43Close() {
        this.writeKey(AM43HANDLE, HEX_KEY_CLOSE_BLINDS);
        this.lastaction='CLOSE';
        this.state = 'CLOSED';
    }

    am43Stop() {
        this.writeKey(AM43HANDLE, HEX_KEY_STOP_BLINDS);
        this.lastaction='STOP';
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
