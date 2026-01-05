import { IotBoxTagProtocol, SotoaTagProtocol, TagProtocol } from './protocol'
import ByteBuffer from 'bytebuffer'

export class IotBoxGatewayVo {
  mac: string
  tags: Array<TagVo>
  tagMap: Map<string, TagVo> = new Map<string, TagVo>()
  update_time: number = Date.now()
  raw_data: Uint8Array<ArrayBuffer>
  constructor(mac: string, tags: Array<TagVo>, raw_data: Uint8Array<ArrayBuffer>) {
    this.mac = mac
    this.tags = tags
    this.tags.forEach((value) => {
      this.tagMap.set(value.mac, value)
    })
    this.raw_data = raw_data
  }
}
export type IotBoxGateway = {
  mac: string
  update_time: number
  raw_data: Uint8Array<ArrayBuffer>
}
export type IotBoxMiddlewareGateway = {
  mac: string
  total: number
  last_packet_receive_rate: number
  tag_count: number
}
export class IotBoxMiddlewareGatewayVo {
  mac: string
  total: number
  packet_receive_rate: number
  last_packet_receive_rate: number = 0
  tag_map: Map<string, TagVo>
  tag_list: Array<TagVo>
  constructor(
    mac: string,
    total: number,
    packet_receive_rate: number,
    tag_map: Map<string, TagVo>,
    tag_list: Array<TagVo>
  ) {
    this.mac = mac
    this.total = total
    this.packet_receive_rate = packet_receive_rate
    this.tag_map = tag_map
    this.tag_list = tag_list
  }
}

export class TagVo {
  mac: string
  firmware?: number
  hardware?: number
  voltage?: number
  body_temperature?: number
  tamper?: boolean
  button?: boolean
  shock?: boolean
  heart_rate?: number
  blood_pressure_h?: number
  blood_pressure_l?: number
  blood_oxygen?: number
  step_count?: number
  sleep_state?: number
  deep_sleep_time?: number
  light_sleep_time?: number
  rssi: number
  sn?: number
  last_time: number = Date.now()
  first_time?: number
  packet_count: number = 1
  raw_data: string
  constructor(mac: string, rssi: number, raw_data: string) {
    this.mac = mac
    this.rssi = rssi
    this.raw_data = raw_data
  }
}
export function transform(tag_protocol: TagProtocol): TagVo {
  const mac = parseMac(tag_protocol.mac)
  const tag_vo = new TagVo(mac, tag_protocol.rssi, toHexString(tag_protocol.toBytes()))
  switch (tag_protocol.manufacturerId) {
    case 0x0d00: {
      const iotBoxTagProtocol = tag_protocol.tag as IotBoxTagProtocol
      const bytebuffer = ByteBuffer.wrap(iotBoxTagProtocol.userData)
      switch (iotBoxTagProtocol.command) {
        case 0x09:
          tag_vo.voltage = Number(((iotBoxTagProtocol.userData[2] * 6.6) / 255).toFixed(2))
          tag_vo.tamper = ((iotBoxTagProtocol.userData[0] >> 5) & 0x01) == 1
          tag_vo.button = ((iotBoxTagProtocol.userData[0] >> 4) & 0x01) == 1
          tag_vo.shock = ((iotBoxTagProtocol.userData[0] >> 3) & 0x01) == 1
          break
        case 0x0a:
          tag_vo.heart_rate = iotBoxTagProtocol.userData[0]
          tag_vo.blood_pressure_h = iotBoxTagProtocol.userData[1]
          tag_vo.blood_pressure_l = iotBoxTagProtocol.userData[2]
          break
        case 0x0b:
          tag_vo.blood_oxygen = iotBoxTagProtocol.userData[0]
          break
        case 0x0c:
          tag_vo.body_temperature = bytebuffer.readByte()
          tag_vo.step_count = bytebuffer.readUint16()
          break
        case 0x0d:
          tag_vo.sleep_state = iotBoxTagProtocol.userData[0]
          tag_vo.light_sleep_time = iotBoxTagProtocol.userData[1]
          tag_vo.deep_sleep_time = iotBoxTagProtocol.userData[2]
          break
        default:
          break
      }
      break
    }
    case 0x0911: {
      const sotoaTagProtocol = tag_protocol.tag as SotoaTagProtocol
      const bytebuffer = ByteBuffer.wrap(sotoaTagProtocol.data)
      const firmware = bytebuffer.readByte()
      const hardware = bytebuffer.readByte()
      const voltage = bytebuffer.readByte()
      const body_temperature = bytebuffer.readByte()
      const status = bytebuffer.readByte()
      const tamper = ((status >> 5) & 0x01) == 1
      const button = ((status >> 4) & 0x01) == 1
      const shock = ((status >> 3) & 0x01) == 1
      tag_vo.firmware = firmware
      tag_vo.hardware = hardware
      tag_vo.voltage = voltage
      tag_vo.body_temperature = body_temperature
      tag_vo.tamper = tamper
      tag_vo.button = button
      tag_vo.shock = shock
      if (sotoaTagProtocol.type == 0x00) {
        bytebuffer.skip(6)
        tag_vo.sn = bytebuffer.readByte()
      } else {
        tag_vo.heart_rate = bytebuffer.readUint8()
        tag_vo.blood_pressure_h = bytebuffer.readUint8()
        tag_vo.blood_pressure_l = bytebuffer.readUint8()
        tag_vo.blood_oxygen = bytebuffer.readUint8()
        tag_vo.step_count = bytebuffer.readUint16()
        tag_vo.sleep_state = bytebuffer.readByte()
        tag_vo.deep_sleep_time = bytebuffer.readUint8()
        tag_vo.light_sleep_time = bytebuffer.readUint8()
        tag_vo.sn = bytebuffer.readByte()
      }
      break
    }
  }
  return tag_vo
}

export function parseMac(dev_id: Uint8Array<ArrayBuffer>): string {
  return Array.from(dev_id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}
export function toHexString(uint8Array: Uint8Array): string {
  return Array.prototype.map.call(uint8Array, (x) => ('00' + x.toString(16)).slice(-2)).join('')
}
