import * as net from 'node:net'
import dgram from 'node:dgram'

export interface Server {
  address: string
  port: number
  listen(): void
  on(event: 'error' | 'listening' | 'close', listener: ((err: Error) => void) | (() => void)): void
  close():void
  message(listen: (msg: NonSharedBuffer) => void): void
}

export class UdpServer implements Server {
  server: dgram.Socket
  address: string
  port: number
  constructor(address: string, port: number) {
    this.server = dgram.createSocket('udp4')
    this.address = address
    this.port = port
  }
  message(listen: (msg: NonSharedBuffer) => void):void {
    this.server.on('message', (msg) => {
      listen(msg)
    })
  }

  listen(): void {
    this.server.bind(this.port, this.address, () => {})
  }
  on(
    event: 'error' | 'listening' | 'close',
    listener: ((err: Error) => void) | (() => void)
  ): void {
    this.server.on(event, listener)
  }
  close(): void {
    this.server.close()
  }
}

export class TcpServer implements Server {
  server: net.Server
  onMessage?: (message: NonSharedBuffer) => void
  constructor(address: string, port: number) {
    this.server = net.createServer((socket) => {
      console.log('有新的客户端接入')
      socket.on('data', (message: NonSharedBuffer) => {
        if (this.onMessage!=undefined){
          this.onMessage(message)
        }
      })
    })
    this.address = address
    this.port = port
  }
  listen(): void {
    this.server.listen(this.port, this.address, () => {})
  }
  message(listen: (msg: NonSharedBuffer) => void):void {
    this.onMessage = listen
  }

  address: string
  port: number

  on(
    event: 'error' | 'listening' | 'close' | 'message',
    listener: ((err: Error) => void) | (() => void)
  ): void {
    this.server.on(event, listener)
  }
  close(): void {
    this.server.close()
  }
}
