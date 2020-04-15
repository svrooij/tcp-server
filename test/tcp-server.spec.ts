import * as chai from 'chai';
const expect = chai.expect;

import TcpServer from '../src/tcp-server'
import { Socket } from 'net';

describe('TcpServer', () => {
  describe('constructor()', () => {
    it('uses default options when no options are specified', () => {
      const tcpServer = new TcpServer()
      expect(tcpServer).to.have.nested.property('options.maxConnections', 10)
      expect(tcpServer).to.have.nested.property('options.port', 2807)
    })

    it('uses options when specified', () => {
      const tcpServer = new TcpServer({host:'test', port: 3000, maxConnections: 3})
      expect(tcpServer).to.have.nested.property('options.maxConnections', 3)
      expect(tcpServer).to.have.nested.property('options.port', 3000)
      expect(tcpServer).to.have.nested.property('options.host', 'test')
    })
  })

  describe('start()', () => {
    let server: TcpServer | undefined
    beforeAll(() => {
      server = new TcpServer({port: 40002})
    })
    afterAll(() => {
      server?.stop();
    })
    it('starts the server', () => {
      server?.start()
      expect(server).to.have.nested.property('server.listening', true);
    })
  })

  describe('publish()', () => {
    let server: TcpServer | undefined;
    const port = 40001;
    const host = '127.0.0.1'
    beforeEach(() => {
      server = new TcpServer({port: port, host: host, maxConnections: 2})
      server.start();
    })
    afterEach(() => {
      server?.stop()
    })

    it('sends text to client', done => {
      const testMessage = 'Test message'
      const socket = new Socket();
      socket.setEncoding('ascii')
      socket.connect(port,host, async () => {
        server.publish(testMessage);
      });
      socket.on('data', (data) => {
        expect(data.toString()).to.be.eq(testMessage);
        socket.destroy();
        done();
      })
    })

    it('returns false when no clients', ()=> {
      return server.publish('TEST')
        .then(result => {
          expect(result).to.be.false;
        });
    })
  })

  describe('publishAsJson()',() => {
    let server: TcpServer | undefined;
    const port = 40004;
    const host = '127.0.0.1'
    beforeEach(() => {
      server = new TcpServer({port: port, host: host, maxConnections: 2})
      server.start();
    })
    afterEach(() => {
      server?.stop()
    })
    it('sends json to client', done => {
      const testObject = {
        test: true,
        message: 'Test message'
      }
      const delimiter = ';'
      const testMessage = JSON.stringify(testObject) + delimiter;
      const socket = new Socket();
      socket.setEncoding('ascii')
      socket.connect(port,host, () => {
        server.publishAsJson(testObject, delimiter)
      });
      socket.on('data', (data) => {
        const result = data.toString();
        expect(result).to.be.eq(testMessage);
        const json = result.split(delimiter)[0]
        const resultObject = JSON.parse(json)
        expect(resultObject).to.have.property('test', testObject.test)
        expect(resultObject).to.have.property('message', testObject.message)
        socket.destroy()
        done();
      })
    })
  })

  describe('- connections', () => {
    let server: TcpServer | undefined;
    const port = 40000;
    const host = '127.0.0.1'
    beforeEach(() => {
      server = new TcpServer({port: port, host: host, maxConnections: 1})
      server.start();
    })
    afterEach(() => {
      server?.stop()
      jest.clearAllTimers();
    })

    it('denies second connection', done => {
      const socket = new Socket();
      const socket2 = new Socket();
      socket.connect(port,host, () => {
        socket2.connect(port, host);
      });

      setTimeout(()=>{
        expect(server).to.have.nested.property('sockets.length', 1)
        socket.destroy();
        socket2.destroy();
        done();
      }, 50)

    },100)

    it('client disconnect handled', done =>{
      const socket = new Socket();
      socket.setEncoding('ascii')
      socket.connect(port,host, () => {
        socket.destroy()
      });
      setTimeout(() => {
        expect(server).to.have.nested.property('sockets.length', 0)
        done();
      }, 60)
    }, 100)
  })

  describe('- server',() => {
    let server: TcpServer | undefined;
    const port = 4001;
    const host = '127.0.0.1'
    beforeEach(() => {
      server = new TcpServer({port: port, host: host, maxConnections: 1})
      server.start();
    })
    afterEach(() => {
      server?.stop()
    })

    it('receives data from client', done => {
      const testMessage = 'Dit is een test bericht\r\n'
      const socket = new Socket();
      socket.setEncoding('ascii')
      server.on('textReceived',(text, remoteAddrress) => {
        expect(text).to.be.eq(testMessage);
        expect(remoteAddrress).to.be.eq(host)
        socket.destroy()
        done()
      })
      socket.connect(port, host, () => {
        socket.write(testMessage, (err) => {
          if(err) throw err
        })
      })
    })

    it('disconnects on receiving CTRL+C', done => {
      const controlC = String.fromCharCode(127)
      const socket = new Socket();
      socket.setEncoding('ascii')
      server.on('onDisconnect',(remoteAddrress) => {
        expect(remoteAddrress).to.be.eq(host)
        socket.destroy()
        done()
      })
      socket.connect(port, host, () => {
        socket.write(controlC, (err) => {
          if(err) throw err
        })
      })
    })
  })
})
