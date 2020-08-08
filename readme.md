## amqp socket bridge client

Communicates RabbitMQ over socket.io.

!Need RabbitMQ to work.


```bash
yarn add amqp-socket-bridge-client 
```

### example

#### mobile to service

```js
const assert = require('assert');

const { ServiceCreator } = require('amqp-rpc-node-client');
const { SocketServiceCreator } = require('amqp-socket-bridge-client');

(async () => {
  const amqpService = await ServiceCreator('localhost', 'hebele-hubele-exchange');
  await amqpService.consume('mock.echo', 'mock-service', async (msg) => {
    const { replyTo, correlationId } = msg.properties;
    const res = amqpService.responseBuilder(200, true, 'ok', JSON.parse(msg.content.toString()));

    if (replyTo) {
      await amqpService.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  const socketService = SocketServiceCreator('localhost', 6000, 'hebele-hubele-exchange');

  let res = await socketService.rpcRequest('mock.echo', JSON.stringify({ hello: 'cat' }));
  // unlike the amqp rpc requester, res is a string
  res = JSON.parse(res);
  console.log(res);
  assert.deepStrictEqual(res, {
    code: 200,
    success: true,
    message: 'ok',
    data: { hello: 'cat' },
  });

  await amqpService.close();
})();
```


#### service to mobile

```js
const assert = require('assert');

const { ServiceCreator } = require('amqp-rpc-node-client');
const { SocketServiceCreator } = require('amqp-socket-bridge-client');

(async () => {
  const socketService = SocketServiceCreator('localhost', 6000, 'hebele-hubele-exchange');
  await socketService.consume('mock.echo', 'mock-echo', async (msg) => {
    const r = JSON.parse(msg);
    console.log(r);
    assert.deepStrictEqual(r, { hello: 'cat' });

    return JSON.stringify({ echo: r });
  });

  const s = await ServiceCreator('localhost', 'hebele-hubele-exchange');
  let res = await s.rpcRequest('bridge.mock.echo', JSON.stringify({ hello: 'cat' }));
  res = JSON.parse(res.content.toString());
  assert.deepStrictEqual(res, { echo: { hello: 'cat' } });
  console.log(res);

  s.close();
})();
```
