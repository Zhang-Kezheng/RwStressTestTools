import ByteBuffer from 'bytebuffer'

export class IotBoxGatewayProtocol {
  header = 0x02030405
  length: number
  dev_id: Uint8Array<ArrayBuffer>
  cmd: number
  sn: number
  jiami: number
  data: Uint8Array<ArrayBuffer>
  check_sum: number
  constructor(
    length: number,
    dev_id: Uint8Array<ArrayBuffer>,
    cmd: number,
    sn: number,
    jiami: number,
    data: Uint8Array<ArrayBuffer>,
    check_sum: number
  ) {
    this.length = length
    this.dev_id = dev_id
    this.cmd = cmd
    this.sn = sn
    this.jiami = jiami
    this.data = data
    this.check_sum = check_sum
  }
  static getInstance(
    dev_id: Uint8Array<ArrayBuffer>,
    data: Uint8Array<ArrayBuffer>
  ): IotBoxGatewayProtocol {
    const gateway = new IotBoxGatewayProtocol(data.length + 16, dev_id, 0x01, SN++, 0x01, data, 0)
    gateway.check_sum = gateway.check()
    return gateway
  }
  static new(data: ArrayBuffer): IotBoxGatewayProtocol | undefined {
    const bytebuffer = ByteBuffer.wrap(data)
    const header = bytebuffer.readInt()
    if (header != 0x02030405) {
      return undefined
    }
    const length = bytebuffer.readUint16()
    return new IotBoxGatewayProtocol(
      length,
      new Uint8Array(bytebuffer.readBytes(6).toArrayBuffer()),
      bytebuffer.readByte(),
      bytebuffer.readByte(),
      bytebuffer.readByte(),
      new Uint8Array(bytebuffer.readBytes(length - 16).toArrayBuffer()),
      bytebuffer.readByte()
    )
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    const buffer = ByteBuffer.allocate()
    buffer.writeInt(0x02030405)
    buffer.writeShort(this.length)
    writeBytes(buffer, this.dev_id)
    buffer.writeByte(this.cmd)
    buffer.writeByte(this.sn)
    buffer.writeByte(this.jiami)
    writeBytes(buffer, this.data)
    buffer.writeByte(this.check_sum)
    buffer.flip()
    return new Uint8Array(buffer.toArrayBuffer())
  }
  check(): number {
    const sum = this.toBytes().reduce((accumulator, currentValue) => accumulator + currentValue, 0)
    const last = this.toBytes()[this.toBytes().length - 1]
    return (sum - last) % 256
  }
}
export class IotBoxTagProtocol {
  mac = new Uint8Array([0xa6, 0x2b, 0x3c, 0x00, 0x1a, 0x63])
  length = 0x1e
  fix = 0xff
  manufacturerId = 0x0d00
  packageId = 0x04
  command = 0x09
  userData = new Uint8Array([0x40, 0x01, 0x5d])
  crc = 0x00
  dFField = new Uint8Array([
    0x2f, 0x61, 0xac, 0xcc, 0x27, 0x45, 0x67, 0xf7, 0xdb, 0x34, 0xc4, 0x03, 0x8e, 0x5c, 0x0b, 0xaa,
    0x97, 0x30, 0x56, 0xe6
  ])
  rssi = 0x04
  static getInstance(data: ArrayBuffer): IotBoxTagProtocol | null {
    if (data.byteLength != 38) {
      console.log('垃圾数据，丢弃')
      return null
    }
    const buf = ByteBuffer.wrap(data)
    const aoaTag = new IotBoxTagProtocol()
    aoaTag.mac = new Uint8Array(buf.readBytes(6).toArrayBuffer())
    aoaTag.length = buf.readUint8()
    aoaTag.fix = buf.readUint8()
    aoaTag.manufacturerId = buf.readShort()
    aoaTag.packageId = buf.readUint8()
    aoaTag.command = buf.readUint8()
    aoaTag.userData = new Uint8Array(buf.readBytes(3).toArrayBuffer())
    aoaTag.crc = buf.readShort()
    aoaTag.dFField = new Uint8Array(buf.readBytes(20).toArrayBuffer())
    aoaTag.rssi = buf.readInt8()
    return aoaTag
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    const buffer = ByteBuffer.allocate()
    writeBytes(buffer, this.mac)
    buffer.writeUint8(this.length)
    buffer.writeUint8(this.fix)
    buffer.writeShort(this.manufacturerId)
    buffer.writeUint8(this.packageId)
    buffer.writeUint8(this.command)
    writeBytes(buffer, this.userData)
    buffer.writeShort(this.crc)
    writeBytes(buffer, this.dFField)
    buffer.writeUint8(this.rssi)
    buffer.flip()
    return new Uint8Array(buffer.toArrayBuffer())
  }
}

let SN: number = 0

export function writeBytes(buffer: ByteBuffer, bytes: Uint8Array<ArrayBuffer>): void {
  bytes.forEach((byte) => {
    buffer.writeByte(byte)
  })
}
