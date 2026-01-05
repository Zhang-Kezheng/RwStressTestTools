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
  packageId = 0x04
  command = 0x09
  userData = new Uint8Array([0x40, 0x01, 0x5d])
  crc = 0x00
  dFField = new Uint8Array([
    0x2f, 0x61, 0xac, 0xcc, 0x27, 0x45, 0x67, 0xf7, 0xdb, 0x34, 0xc4, 0x03, 0x8e, 0x5c, 0x0b, 0xaa,
    0x97, 0x30, 0x56, 0xe6
  ])
  static getInstance(data: ArrayBuffer): IotBoxTagProtocol {
    const buf = ByteBuffer.wrap(data)
    const aoaTag = new IotBoxTagProtocol()
    aoaTag.packageId = buf.readUint8()
    aoaTag.command = buf.readUint8()
    aoaTag.userData = new Uint8Array(buf.readBytes(3).toArrayBuffer())
    aoaTag.crc = buf.readShort()
    aoaTag.dFField = new Uint8Array(buf.readBytes(20).toArrayBuffer())
    return aoaTag
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    const buffer = ByteBuffer.allocate()
    buffer.writeUint8(this.packageId)
    buffer.writeUint8(this.command)
    writeBytes(buffer, this.userData)
    buffer.writeShort(this.crc)
    writeBytes(buffer, this.dFField)
    buffer.flip()
    return new Uint8Array(buffer.toArrayBuffer())
  }
}

let SN: number = 0
export class UnknowTagProtocol {
  raw_data: Uint8Array<ArrayBuffer>
  constructor(raw_data: ArrayBuffer) {
    this.raw_data = new Uint8Array<ArrayBuffer>(raw_data)
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    return new Uint8Array(this.raw_data)
  }
}
export class TagProtocol {
  mac: Uint8Array<ArrayBuffer>
  length: number
  fix: number
  manufacturerId: number
  tag: IotBoxTagProtocol | SotoaTagProtocol | UnknowTagProtocol
  rssi: number
  constructor(
    mac: Uint8Array<ArrayBuffer>,
    length: number,
    fix: number,
    manufacturerId: number,
    tag: IotBoxTagProtocol | SotoaTagProtocol | UnknowTagProtocol,
    rssi: number
  ) {
    this.mac = mac
    this.length = length
    this.fix = fix
    this.manufacturerId = manufacturerId
    this.tag = tag
    this.rssi = rssi
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    const buffer = ByteBuffer.allocate(38)
    writeBytes(buffer, this.mac)
    buffer.writeByte(this.length)
    buffer.writeByte(this.fix)
    buffer.writeShort(this.manufacturerId)
    writeBytes(buffer, this.tag.toBytes())
    buffer.writeByte(this.rssi)
    buffer.flip()
    return new Uint8Array(buffer.toArrayBuffer())
  }
  static getInstance(bytes: ArrayBuffer): TagProtocol | null {
    if (bytes.byteLength != 38) {
      console.log('垃圾数据，丢弃')
      return null
    }
    const buf = ByteBuffer.wrap(bytes)
    const mac = new Uint8Array(buf.readBytes(6).toArrayBuffer())
    const length = buf.readUint8()
    const fix = buf.readByte()
    const manufacturerId = buf.readShort()
    const data = buf.readBytes(27).toArrayBuffer()
    let tag: IotBoxTagProtocol | SotoaTagProtocol | UnknowTagProtocol
    switch (manufacturerId) {
      case 0x0d00:
        tag = IotBoxTagProtocol.getInstance(data)
        break
      case 0x0911:
        tag = SotoaTagProtocol.getInstance(length, data)
        break
      default:
        tag = new UnknowTagProtocol(data)
        break
    }
    const rssi = buf.readByte()
    return new TagProtocol(mac, length, fix, manufacturerId, tag, rssi)
  }
}
export function writeBytes(buffer: ByteBuffer, bytes: Uint8Array<ArrayBuffer> | number[]): void {
  bytes.forEach((byte: number) => {
    buffer.writeByte(byte)
  })
}
export class SotoaTagProtocol {
  privateNum: number
  event: number
  type: number
  data: Uint8Array<ArrayBuffer>
  constructor(privateNum: number, event: number, type: number, data: Uint8Array<ArrayBuffer>) {
    this.privateNum = privateNum
    this.event = event
    this.type = type
    this.data = data
  }
  static getInstance(length: number, bytes: ArrayBuffer): SotoaTagProtocol {
    const buf = ByteBuffer.wrap(bytes)
    const privateNum = buf.readShort()
    const event = buf.readUint8()
    const type = buf.readShort()
    const data = new Uint8Array(buf.readBytes(length - 8).toArrayBuffer())
    return new SotoaTagProtocol(privateNum, event, type, data)
  }
  toBytes(): Uint8Array<ArrayBuffer> {
    const buffer = ByteBuffer.allocate(27)
    buffer.writeShort(this.privateNum)
    buffer.writeUint8(this.event)
    buffer.writeShort(this.type)
    writeBytes(buffer, this.data)
    writeBytes(buffer, [0, 0, 0, 0, 0, 0, 0])
    buffer.flip()
    return new Uint8Array(buffer.toArrayBuffer())
  }
}
// 02 03 04 05
// 03 37
// 02 01 00 00 00 00
// 01
// 05
// 01
// 1A
// 02 01 00 00 00 00
// 17 FF 09 11 10 00 01 00 01 01 01 2A D4 E3 17 45 22 21 91 3B 02 E8 21 82 3C 02 01 00 00 00 01 17 FF 09 11 10 00 01 00 01 01 01 5B 86 D1 94 E2 6C CD 71 96 00 89 69 83 89 02 01 00 00 00 02 17 FF 09 11 10 00 01 00 01 01 01 5A 6A 3A 3B 3C 8F 5C A2 81 00 DA AA 84 B5 02 01 00 00 00 03 17 FF 09 11 10 00 01 00 01 01 01 08 8A 10 02 54 22 17 28 D4 01 4F 32 85 F2 02 01 00 00 00 04 17 FF 09 11 10 00 01 00 01 01 01 2C D2 66 A3 24 81 3E 12 85 02 76 6F 86 C8 02 01 00 00 00 05 17 FF 09 11 10 00 01 00 01 01 01 57 C0 A0 10 35 F7 62 2D 66 01 25 A5 87 9F 02 01 00 00 00 06 17 FF 09 11 10 00 01 00 01 01 01 1B A9 BD 2F 20 CE F8 82 AF 00 45 78 88 03 02 01 00 00 00 07 17 FF 09 11 10 00 01 00 01 01 01 08 82 6E D4 18 1B 5C 25 86 00 22 C2 89 17 02 01 00 00 00 08 17 FF 09 11 10 00 01 00 01 01 01 15 C0 AF D1 E4 E8 85 CB 87 02 89 64 8A 12 02 01 00 00 00 09 17 FF 09 11 10 00 01 00 01 01 01 64 AC 5A 38 FB CC 06 BE D4 01 32 63 8B E3 02 01 00 00 00 0A 17 FF 09 11 10 00 01 00 01 01 01 31 CE 19 E2 4C 80 7D 23 CB 01 0A A6 8C 57 02 01 00 00 00 0B 17 FF 09 11 10 00 01 00 01 01 01 2B 78 EE 7B 26 00 DB DA 33 02 CA B7 8D 64 02 01 00 00 00 0C 17 FF 09 11 10 00 01 00 01 01 01 3D 94 2E 72 09 F5 6E E8 44 00 73 08 8E 9B 02 01 00 00 00 0D 17 FF 09 11 10 00 01 00 01 01 01 00 8E 94 FE E2 7A 0A 22 0B 00 1D D8 8F E6 02 01 00 00 00 0E 17 FF 09 11 10 00 01 00 01 01 01 59 8F 8C 54 2B F0 C8 0D 87 02 AE D2 90 E6 02 01 00 00 00 0F 17 FF 09 11 10 00 01 00 01 01 01 53 78 C1 B9 7F 5B E1 ED C4 01 2C 23 91 7C 02 01 00 00 00 10 17 FF 09 11 10 00 01 00 01 01 01 45 67 F1 14 F9 43 DB DB 35 02 15 34 92 DA 02 01 00 00 00 11 17 FF 09 11 10 00 01 00 01 01 01 12 8B 83 9F 24 1A 13 41 87 02 8B E0 93 EE 02 01 00 00 00 12 17 FF 09 11 10 00 01 00 01 01 01 34 AD 84 EA D6 38 C4 47 BF 00 BB 27 94 0A 02 01 00 00 00 13 17 FF 09 11 10 00 01 00 01 01 01 02 E4 C5 92 5A DD 7F 45 E7 02 37 54 95 F0 02 01 00 00 00 14 17 FF 09 11 10 00 01 00 01 01 01 1A BC 41 4F 23 45 AB BA 44 01 41 45 96 8A 02 01 00 00 00 15 17 FF 09 11 10 00 01 00 01 01 01 54 A6 0D 27 BF 3C 55 F8 87 01 CF A6 97 A5 02 01 00 00 00 16 17 FF 09 11 10 00 01 00 01 01 01 1A D2 76 D3 AB DB 17 F0 B3 01 A1 74 98 CD 02 01 00 00 00 17 17 FF 09 11 10 00 01 00 01 01 01 5C 70 07 65 C4 E9 1E 9F 0E 02 C2 5C 99 EF 02 01 00 00 00 18 17 FF 09 11 10 00 01 00 01 01 01 1B E1 DA A5 CC 93 1B E4 B2 00 6F 79 9A 9D 02 01 00 00 00 19 17 FF 09 11 10 00 01 00 01 01 01 3A CD AA E6 84 2E C4 03 CE 01 81 AA 9B F0 5B
