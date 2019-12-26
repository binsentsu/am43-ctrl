const mqtt = require('mqtt');

const coverTopic = 'cover/';

class MQTTConnector {
    constructor(device, mqttUrl, baseTopic, username, password) {
        const mqttClient = mqtt.connect(mqttUrl, {
            will: {
                topic: `${baseTopic}${coverTopic}${device.id}/connection`,
                payload: 'Offline',
                retain: true
            },
            username: username,
            password: password
        });

        let deviceTopic = `${baseTopic}${coverTopic}${device.id}`;
        mqttClient.subscribe([`${deviceTopic}/set`]);

        mqttClient.on('message', (topic, message) => {
            device.log('mqtt message received %o, %o', topic, message.toString());
            if (topic.endsWith('set') && message.length !== 0) {
                if (message.toString().toLowerCase() === 'open') {
                    device.log('requesting cover open');
                    device.am43Open();
                } else  if (message.toString().toLowerCase() === 'close'){
                    device.log('requesting cover close');
                    device.am43Close();
                }
                else  if (message.toString().toLowerCase() === 'stop'){
                    device.log('requesting cover stop');
                    device.am43Stop();
                }
            }
        });

        let deviceInfo = {
            identifiers: `am43_${device.id}`,
            name: device.id,
            manufacturer: 'Generic AM43'
        };

        let coverConfig = {
            name: device.id,
            command_topic: `${deviceTopic}/set`,
            // state_topic: `${deviceTopic}/state`,
            // state_open: 'OPEN',
            // state_closed: 'CLOSED',
            availability_topic: `${deviceTopic}/connection`,
            payload_available: 'Online',
            payload_not_available: 'Offline',
            payload_open: 'OPEN',
            payload_close: 'CLOSE',
            payload_stop: 'STOP',
            unique_id: `am43_${device.id}_cover`,
            device: deviceInfo
        };

        device.log(`mqtt topic ${deviceTopic}`);

        device.on('initPerformed', (data) => {
            coverConfig.name = data.id;
            coverConfig.device.name = data.id;
            mqttClient.publish(`${deviceTopic}/config`, JSON.stringify(coverConfig), {retain: true});
            mqttClient.publish(`${deviceTopic}/connection`, 'Online', {retain:true});
        });

        device.on('stateChanged', (data) => {
            device.log(`state changed received to ${data.state}`);
            // mqttClient.publish(`${deviceTopic}/state`, data.state, {retain:true});
        });

        mqttClient.on('connect', () => device.log('mqtt connected'));
        mqttClient.on('end', () => device.log('mqtt ended'));
        mqttClient.on('error', (e) => device.log('mqtt error %o', e));
    }
}

module.exports = MQTTConnector;
