const clientIO = require('socket.io-client');
const { v4 } = require('uuid');

const socketConsume = (socket, channel, cb = async () => {
}) => {
  socket.on(channel, async (msg, ack) => {
    ack(true);
    const { headers, body } = JSON.parse(msg);
    const res = await cb(body);

    const { replyTo, correlationId } = headers;
    if (replyTo) {
      socket.emit(replyTo, JSON.stringify({
        headers: {
          replyTo: '',
          correlationId,
        },
        body: res,
      }));
    }
  });
};

const socketRequestBase = (uri, channel, msg,
  config = {
    timeout: 0,
    noReply: false,
  }) => new Promise((resolve, reject) => {
  const { noReply, timeout } = config;
  const correlationId = v4();
  const replyTo = noReply === false ? v4() : '';

  const socket = clientIO(uri);
  // const socket = clientIO(`http://${host}:${port}`);
  socket.on('connect', () => {
    if (timeout > 0 && noReply === false) {
      setTimeout(() => {
        socket.close();
        reject(new Error('timeout'));
      }, timeout);
    }

    if (!noReply) {
      socket.on(replyTo, (received) => {
        const r = JSON.parse(received);
        if (r.headers.correlationId === correlationId) {
          socket.close();
          resolve(r.body);
        }
      });
    }

    socket.emit(channel, JSON.stringify({
      headers: {
        replyTo,
        correlationId,
      },
      body: msg,
    }), () => {
      // console.log('ack message');
      if (noReply) {
        socket.close();
        resolve();
      }
    });
  });
});

const socketRequest = (host, port, channel, msg,
  config = {
    timeout: 0,
    noReply: false,
  }) => {
  if (port) {
    return socketRequestBase(`http://${host}:${port}`, channel, msg, config);
  }
  return socketRequestBase(host, channel, msg, config);
};

module.exports = {
  socketRequest,
  socketConsume,
};
