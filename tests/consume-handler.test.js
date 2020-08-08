/* eslint-disable */
require('dotenv').config();
const assert = require('assert');

const { ServiceCreator } = require('amqp-rpc-node-client');
const { SocketServiceCreator } = require('../socket-service-creator');
const bridgeService = require('./bridge-service');

// const wait = (ms) => new Promise((resolve) => {
//   setTimeout(() => {
//     resolve();
//   }, ms);
// });

describe('consume-handler test', async () => {
  const { RABBITMQ_EXCHANGE, RABBITMQ_HOST, SOCKET_IO_PORT, SOCKET_IO_HOST } = process.env;
  let serviceConsumer;
  let listener;

  before(async () => {
    serviceConsumer = await ServiceCreator(RABBITMQ_HOST, RABBITMQ_EXCHANGE);
    listener = await bridgeService(serviceConsumer,SOCKET_IO_PORT);

  });

  after(async () => {
    await serviceConsumer.close();
    listener.close();
  });

  it('should client fire and forget', async () => {
    const socketService = SocketServiceCreator(SOCKET_IO_HOST, SOCKET_IO_PORT, 'hebele-hubele-exchange');
    await socketService.consume('notifyxx', '', async (msg) => {
      const received = JSON.parse(msg);
      console.log('message successfully received ', received);
      assert.deepStrictEqual(received, { value: 13 });
    });

    await serviceConsumer.fireAndForget('bridge.notifyxx', JSON.stringify({ value: 13 }));
  });

  it('should client rpc', async () => {

    const socketService = SocketServiceCreator(SOCKET_IO_HOST, SOCKET_IO_PORT, RABBITMQ_EXCHANGE);
    await socketService.consume('command', '', async (msg) => {
      const received = JSON.parse(msg);
      console.log('message successfully received ', received);

      assert.deepStrictEqual(received, { value: 13 });

      return JSON.stringify({ don: 'client consumer response' });
    });

    //client service 1
    let res = await serviceConsumer.rpcRequest('bridge.command', JSON.stringify({ value: 13 }));
    res = JSON.parse(res.content.toString());
    // bridge response 5
    assert.deepStrictEqual(res, { don: 'client consumer response' });

  });

});
