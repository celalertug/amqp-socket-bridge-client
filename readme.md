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

#### mobile to service 2

```js
const assert = require('assert');

const { ServiceCreator } = require('amqp-rpc-node-client');
const { SocketServiceCreator } = require('amqp-socket-bridge-client');

(async () => {   
    const socketService = SocketServiceCreator(SOCKET_IO_HOST, SOCKET_IO_PORT, RABBITMQ_EXCHANGE);
               
    let headerMessage;
    await socketService.consumeOnly('message', '', async (msg, headers) => {

     const received = JSON.parse(msg);
     assert.deepStrictEqual(received, { value: 13 });
     headerMessage = headers;

    });
    
    // send response seperate process
    setTimeout(async () => {
     await socketService.sendResponse(JSON.stringify({ user: 'hayri' }), headerMessage);
    }, 500);
    
    //client service request
     const serviceConsumer = await ServiceCreator('localhost', 'hebele-hubele-exchange');
    let res = await serviceConsumer.rpcRequest('bridge.message', JSON.stringify({ value: 13 }));
    res = JSON.parse(res.content.toString());
    assert.deepStrictEqual(res,{ user: 'hayri' });
 })() 
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
