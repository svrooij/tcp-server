import net, { Server, Socket } from 'net';


import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import TcpServerOptions from './tcp-server-options';
import TcpServerEvents from './tcp-server-events';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createStrictEventEmitterClass<T>() {
  const TypedEmitter: {
    new (): StrictEventEmitter<EventEmitter, T>;
  } = EventEmitter as never;

  return TypedEmitter;
}

export default class TcpServer extends createStrictEventEmitterClass<TcpServerEvents>() {
  private readonly options: TcpServerOptions;

  private readonly server: Server;

  private readonly sockets: Array<Socket> = [];

  constructor(options: Partial<TcpServerOptions> = {}) {
    super();
    // Merge defaults with settings from constructor.
    this.options = { ...TcpServer.defaultOptions(), ...options };

    // Setup server
    this.server = net.createServer((_socket) => {
      if (this.sockets.length >= this.options.maxConnections) {
        this.emit('log', 'New connection denied, exceeding limit');
        _socket.write('Too many connections');
        _socket.end();
        return;
      }

      this.sockets.push(_socket);
      _socket.setEncoding('ascii');

      _socket.on('close', () => {
        this.removeSocket(_socket);
        _socket.destroy();
      });

      _socket.on('data', (data) => {
        if (data.toString().charCodeAt(0) === 127 || data.toString().startsWith('exit')) {
          this.removeSocket(_socket);
        } else {
          this.emit('textReceived', data.toString(), _socket.remoteAddress);
        }
      });

      this.emit('onConnect', _socket);
      this.emit('log', `New connection established from ${_socket.remoteAddress}`);
    });
    this.server.setMaxListeners(this.options.maxConnections);
  }

  private removeSocket(socket: Socket): void {
    const index = this.sockets.findIndex((s) => s.remoteAddress === socket.remoteAddress
      && s.remotePort === socket.remotePort);
    if (index !== -1) this.sockets.splice(index, 1);
    this.emit('onDisconnect', socket.remoteAddress);

    socket.end();
  }

  start(): void {
    this.server.listen(this.options.port, this.options.host);
    this.emit('log', `TCP Server listening on ${this.options.host}:${this.options.port}`);
  }


  stop(): void {
    this.sockets.forEach((s) => s.destroy());
    this.sockets.length = 0; // Clears array
    this.server.close();
  }

  async publish(text: string): Promise<boolean> {
    if (this.sockets.length === 0) {
      return Promise.resolve(false);
    }

    // Convert each socket in write promise
    const publishTasks = this.sockets.map((s) => new Promise<boolean>((resolve, reject) => {
      s.write(text, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    }));
    const results = await Promise.all(publishTasks);
    return results.every((r) => r === true);
  }

  async publishAsJson(data: object, delimiter = '\r\n'): Promise<boolean> {
    const text = JSON.stringify(data) + delimiter;
    return this.publish(text);
  }

  private static defaultOptions(): TcpServerOptions {
    return {
      maxConnections: 10,
      port: 2807,
    };
  }
}
