/* eslint-disable no-undef,no-console */
require('dotenv').config();
const assert = require('assert');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const { range } = require('lodash');

const { socketRequest, socketConsume } = require('../socket-lib');

// eslint-disable-next-line no-unused-vars
const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
});

describe('socket-lib test', async () => {
  const {
    SOCKET_IO_PORT, SOCKET_IO_HOST,
  } = process.env;
  let listener;

  before(async () => {

    const app = express();
    const httpServer = http.Server(app);
    const io = socketIO(httpServer);

    io.on('connection', async (socket) => {
      socketConsume(socket, 'hello-motherfucker', async (body) => {
        // await wait(10);
        const { value } = JSON.parse(body);
        return { response: value * value };
      });

      socketConsume(socket, 'one', async (body) => {
        // await wait(10);
        const { value } = JSON.parse(body);
        console.log(value);

        assert.deepStrictEqual(value, 10);
        return { response: value * value };
      });
    });

    await new Promise((resolve) => {
      listener = httpServer.listen(SOCKET_IO_PORT, () => {
        console.log(`listening on *:${SOCKET_IO_PORT}`);
        resolve();
      });
    });
  });

  after(async () => {
    listener.close();
  });

  it('should standalone', async () => {
    const res = await socketRequest(SOCKET_IO_HOST, SOCKET_IO_PORT, 'hello-motherfucker', JSON.stringify({ value: 10 }));
    // console.log(res);
    assert.deepStrictEqual(res, { response: 100 });
  });

  it('should standalone fire and forget', async () => {
    await socketRequest(SOCKET_IO_HOST, SOCKET_IO_PORT, 'one', JSON.stringify({ value: 10 }), { noReply: true });
  });

  it('should standalone parallel', async () => {
    const res = await Promise.all(range(20).map((i) => socketRequest(SOCKET_IO_HOST, SOCKET_IO_PORT, 'hello-motherfucker', JSON.stringify({ value: i * 10 }))));
    // console.log(res);
    assert.deepStrictEqual(res, [
      { response: 0 }, { response: 100 },
      { response: 400 }, { response: 900 },
      { response: 1600 }, { response: 2500 },
      { response: 3600 }, { response: 4900 },
      { response: 6400 }, { response: 8100 },
      { response: 10000 }, { response: 12100 },
      { response: 14400 }, { response: 16900 },
      { response: 19600 }, { response: 22500 },
      { response: 25600 }, { response: 28900 },
      { response: 32400 }, { response: 36100 },
    ]);
  });
});
