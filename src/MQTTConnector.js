const mqtt = require('mqtt');

const coverTopic = 'cover/';
const sensorTopic = 'sensor/';

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
        let deviceBatterySensorConfigTopic = `${baseTopic}${sensorTopic}${device.id}_battery`;
        let deviceLightSensorConfigTopic = `${baseTopic}${sensorTopic}${device.id}_light`;
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
            position_topic: `${deviceTopic}/state`,
            position_open: 0,
            position_closed: 100,
            availability_topic: `${deviceTopic}/connection`,
            payload_available: 'Online',
            payload_not_available: 'Offline',
            payload_open: 'OPEN',
            payload_close: 'CLOSE',
            payload_stop: 'STOP',
            value_template: '{{value_json[\'position\']}}',
            unique_id: `am43_${device.id}_cover`,
            device: deviceInfo
        };

        let batterySensorConfig = {
            name: device.id + ' Battery',
            state_topic: `${deviceTopic}/state`,
            availability_topic: `${deviceTopic}/connection`,
            payload_available: 'Online',
            payload_not_available: 'Offline',
            unique_id: `am43_${device.id}_battery_sensor`,
            device: deviceInfo,
            value_template: '{{value_json[\'battery\']}}',
            device_class: 'battery',
            unit_of_measurement: '%'
        };

        let lightSensorConfig = {
            name: device.id + ' Light',
            state_topic: `${deviceTopic}/state`,
            availability_topic: `${deviceTopic}/connection`,
            payload_available: 'Online',
            payload_not_available: 'Offline',
            unique_id: `am43_${device.id}_light_sensor`,
            device: deviceInfo,
            value_template: '{{value_json[\'light\']}}',
            unit_of_measurement: '%'
        };

        device.log(`mqtt topic ${deviceTopic}`);

        device.on('initPerformed', (data) => {
            coverConfig.name = data.id;
            coverConfig.device.name = data.id;
            mqttClient.publish(`${deviceTopic}/config`, JSON.stringify(coverConfig), {retain: true});
            mqttClient.publish(`${deviceBatterySensorConfigTopic}/config`, JSON.stringify(batterySensorConfig), {retain: true});
            mqttClient.publish(`${deviceLightSensorConfigTopic}/config`, JSON.stringify(lightSensorConfig), {retain: true});
            mqttClient.publish(`${deviceTopic}/connection`, 'Online', {retain:true});
        });

        device.on('stateChanged', (data) => {
            device.log(`state changed received: ${JSON.stringify(data)}`);
            mqttClient.publish(`${deviceTopic}/state`, JSON.stringify(data), {retain:true});
        });

        mqttClient.on('connect', () => device.log('mqtt connected'));
        mqttClient.on('end', () => device.log('mqtt ended'));
        mqttClient.on('error', (e) => device.log('mqtt error %o', e));
    }
}

module.exports = MQTTConnector;
