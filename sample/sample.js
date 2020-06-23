const TcpServer = require('../dist/index').TcpServer

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