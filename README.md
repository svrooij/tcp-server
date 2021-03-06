# tcp-server

This library is to make it a bit easier to host a TCP socket.

## Install

```bash
npm install --save @svrooij/tcp-server
```

## API

Create a server with this code.

```JS
const TcpServer = require('@svrooij/tcp-server').TcpServer

const server = new TcpServer({ port: 3000, host: '0.0.0.0' })
server.start()

server.on('textReceived', (text, remoteAddress) => {
  console.log('%s -> %s', remoteAddress, text)
  // Send something to everybody when receiving ping
  if(text.includes('ping')) {
    server.publish(`Pong, as response to message from ${remoteAddress}`);
  }
})

server.publish('Publish message').then(success => {
  console.log('Message send ', success ? ' successfully' : 'failed')
})

process.on('SIGINT', () => {
  server.stop()
})
```

Connect to the server.

```plain
> telnet 192.168.1.20 3000
Trying 192.168.1.20...
Connected to my-computer.localdomain.
Escape character is '^]'.
```
