const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { socketConsume } = require('../socket-lib.js');

const service = async (ampqService, port) => {
  const app = express();
  const httpServer = http.Server(app);
  const io = socketIO(httpServer);

  // server amqp socket consumer 4
  io.on('connection', async (socket) => {
    // console.log('connected');
    socket.on('disconnect', () => {

    });
    socketConsume(socket, 'rpcRequest', async (body) => {
      const {
        topic, msgStr, timeout,
      } = JSON.parse(body);

      const ret = await ampqService.rpcRequest(topic, msgStr, timeout);

      return ret.content.toString();
    });

    socketConsume(socket, 'fireAndForget', async (body) => {
      const {
        host, topic, exchange, msgStr,
      } = JSON.parse(body);

      await ampqService.fireAndForgetStandAlone(host, exchange, topic, msgStr);
    });

    socketConsume(socket, 'sendToQueue', async (body) => {
      const {
        queue, msgStr, options,
      } = JSON.parse(body);
      if (options) {
        await ampqService.sendToQueue(queue, msgStr, options);
      } else {
        await ampqService.sendToQueue(queue, msgStr);
      }
    });
    socket.on('client-response', async (msg, ack) => {
      ack();
      const { headers, body } = JSON.parse(msg);
      const { replyTo, correlationId } = headers;
      if (replyTo) {
        await ampqService.sendToQueue(replyTo, body, { correlationId });
      }
    });
  });

  const listener = await new Promise((resolve) => {
    const l = httpServer.listen(port, () => {
      console.log(`listening on *:${port}`);
      resolve(l);
    });
  });

  // server amqp consumer 2
  await ampqService.consume('bridge.#', 'bridge-consume', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const targetTopic = msg.fields.routingKey.replace('bridge.', '');

    const emitString = JSON.stringify({
      headers: {
        replyTo,
        correlationId,
      },
      body: msg.content.toString(),
    });

    io.emit(targetTopic, emitString);
  });

  return listener;
};

module.exports = service;
