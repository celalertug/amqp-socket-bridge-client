const clientIO = require('socket.io-client');
const { socketRequest } = require('./socket-lib.js');

const SocketServiceCreator = (host, port, exchange) => {
  const rpcRequest = async (topic, msgStr, timeout = 0) => socketRequest(
    host,
    port,
    'rpcRequest',
    JSON.stringify({
      exchange,
      msgStr,
      timeout,
      topic,
    }),
    {
      timeout,
      noReply: false,
    },
  );
  const sendToQueue = async (queue, msgStr, options) => socketRequest(
    host,
    port,
    'sendToQueue',
    JSON.stringify({
      host,
      exchange,
      queue,
      msgStr,
      options,
    }),
  );
  const fireAndForget = async (topic, msgStr) => socketRequest(
    host,
    port,
    'fireAndForget',
    JSON.stringify({
      host,
      topic,
      exchange,
      msgStr,
    }),
  );

  const consume = (topic, queue, cb = async () => {}) => new Promise((resolve) => {
    const socket = clientIO(`http://${host}:${port}`);
    socket.on('connect', () => {
      socket.on(topic, async (msg) => {
        const { headers, body } = JSON.parse(msg);

        // const res = await cb(body);
        const res = await cb(body);
        if (typeof res !== 'string' && res) {
          throw new Error('callback response must be a string');
        }

        const { replyTo, correlationId } = headers;
        if (replyTo) {
          socket.emit('client-response', JSON.stringify({
            headers: {
              replyTo,
              correlationId,
            },
            body: res, // should be string
          }), () => {

          });
        }
      });
      resolve();
    });
  });

  return {
    rpcRequest,
    sendToQueue,
    fireAndForget,
    consume,
  };
};

module.exports = { SocketServiceCreator };
