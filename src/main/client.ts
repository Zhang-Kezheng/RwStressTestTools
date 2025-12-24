import dgram from 'node:dgram'

export interface Client {
  address: string
  port: number
  send(data: Uint8Array, callback: () => void): void
  stop(): void
}



export class UdpClient implements Client {
  socket = dgram.createSocket('udp4')
  send(data: Uint8Array, callback: () => void): void {
    this.socket.send(data, this.port, this.address, callback)
  }

  stop(): void {
    /* empty */
  }
  constructor(address: string, port: number) {
    this.address = address
    this.port = port
  }

  address: string
  port: number
}

import * as net from 'net'
export class TcpClient implements Client {
  client: net.Socket
  constructor(address: string, port: number) {
    this.address = address
    this.port = port

    this.client = net.createConnection(port, address, () => {})
    this.client.on('error', (err:{errno:number,code:string}) => {
      switch (err.code){
        case 'ECONNREFUSED':
          throw new Error("连接被拒绝")
        default:
          console.error(err)
          throw new Error('出现未知异常')
      }
    })
  }

  address: string
  port: number

  send(data: Uint8Array, callback: () => void): void {
    this.client.write(data,callback)
  }

  stop(): void {
    this.client.end()
  }
}
