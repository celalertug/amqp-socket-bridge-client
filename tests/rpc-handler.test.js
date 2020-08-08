/* eslint-disable no-undef,no-console */
require('dotenv').config();
const assert = require('assert');

const { ServiceCreator } = require('amqp-rpc-node-client');

const { SocketServiceCreator } = require('../socket-service-creator');
const bridgeService = require('./bridge-service');

// eslint-disable-next-line no-unused-vars
const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
});

describe('rpc-handler test', async () => {
  const {
    RABBITMQ_EXCHANGE, RABBITMQ_HOST, SOCKET_IO_PORT, SOCKET_IO_HOST,
  } = process.env;

  let listener;
  let serviceConsumer;
  let socketService;

  before(async () => {
    serviceConsumer = await ServiceCreator(RABBITMQ_HOST, RABBITMQ_EXCHANGE);
    socketService = SocketServiceCreator(SOCKET_IO_HOST, SOCKET_IO_PORT, RABBITMQ_EXCHANGE);

    await serviceConsumer.consume('mock.service', 'mock-service', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const res = serviceConsumer.responseBuilder(200, true, 'ok', JSON.parse(msg.content.toString()));

      if (replyTo) {
        await serviceConsumer.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
      }
    });

    await serviceConsumer.consume('mock.log.service', 'mock-log-service', async (msg) => {
      console.log(JSON.parse(msg.content.toString()));

      assert.deepStrictEqual(JSON.parse(msg.content.toString()), { message: 'this is a log message' });
    });

    await serviceConsumer.consume('mock.log.service2', '', async (msg) => {
      console.log(JSON.parse(msg.content.toString()));

      assert.deepStrictEqual(JSON.parse(msg.content.toString()), { message: 'this is a log message fire and forget' });
    });

    listener = await bridgeService(serviceConsumer, SOCKET_IO_PORT);
  });

  after(async () => {
    await serviceConsumer.close();
    listener.close();
  });

  it('should socket rpc request', async () => {
    let res = await socketService.rpcRequest('mock.service', JSON.stringify({ value: 123 }));
    res = JSON.parse(res);
    assert.deepStrictEqual(res, {
      code: 200, success: true, message: 'ok', data: { value: 123 },
    });
  });

  it('should socket fire and forget', async () => {
    await socketService.fireAndForget('mock.log.service2', JSON.stringify({ message: 'this is a log message fire and forget' }));
    await wait(100);
  });

  it('should socket send to queue', async () => {
    await socketService.sendToQueue('mock-log-service', JSON.stringify({ message: 'this is a log message' }), { durable: true });
    await wait(100);
  });
});
