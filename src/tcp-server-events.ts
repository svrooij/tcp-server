import { Socket } from 'net';

export default interface TcpServerEvents {
  onConnect: (socket: Socket) => void;
  onDisconnect: (remoteAddrress?: string) => void;
  textReceived: (text: string, remoteAddress?: string) => void;
  log: (message?: any, ...optionalParams: any[]) => void;
}
