import { IotBoxTagProtocol } from './protocol'
import ByteBuffer from 'bytebuffer'
export class IotBoxGatewayVo {
  mac: string
  tags: Array<IotBoxTagVo>
  tagMap: Map<string, IotBoxTagVo> = new Map<string, IotBoxTagVo>()
  update_time: number = Date.now()
  raw_data: Uint8Array<ArrayBuffer>
  constructor(mac: string, tags: Array<IotBoxTagVo>, raw_data: Uint8Array<ArrayBuffer>) {
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
  tag_map: Map<string, IotBoxTagVo>
  tag_list: IotBoxTagVo[]
  constructor(
    mac: string,
    total: number,
    packet_receive_rate: number,
    tag_map: Map<string, IotBoxTagVo>,
    tag_list: IotBoxTagVo[]
  ) {
    this.mac = mac
    this.total = total
    this.packet_receive_rate = packet_receive_rate
    this.tag_map = tag_map
    this.tag_list = tag_list
  }
}
export class IotBoxTagVo {
  mac: string
  gateway_mac: string
  voltage?: number
  tamper?: boolean
  button?: boolean
  shock?: boolean
  heart_rate?: number
  blood_pressure_h?: number
  blood_pressure_l?: number
  blood_oxygen?: number
  body_temperature?: number
  step_count?: number
  sleep_state?: number
  deep_sleep_time?: number
  light_sleep_time?: number
  rssi?: number
  last_time: number = Date.now()
  first_time?: number
  packet_count: number = 1
  raw_data: string
  constructor(mac: string, raw_data: string, gateway_mac: string) {
    this.mac = mac
    this.raw_data = raw_data
    this.gateway_mac = gateway_mac
  }

  static transform(tag: IotBoxTagProtocol, gateway_mac: string): IotBoxTagVo {
    const iotBoxTagVo = new IotBoxTagVo(parseMac(tag.mac), toHexString(tag.toBytes()), gateway_mac)
    const bytebuffer = ByteBuffer.wrap(tag.userData)
    iotBoxTagVo.rssi = tag.rssi
    switch (tag.command) {
      case 0x09:
        iotBoxTagVo.voltage = Number(((tag.userData[2] * 6.6) / 255).toFixed(2))
        iotBoxTagVo.tamper = ((tag.userData[0] >> 5) & 0x01) == 1
        iotBoxTagVo.button = ((tag.userData[0] >> 4) & 0x01) == 1
        iotBoxTagVo.shock = ((tag.userData[0] >> 3) & 0x01) == 1
        break
      case 0x0a:
        iotBoxTagVo.heart_rate = tag.userData[0]
        iotBoxTagVo.blood_pressure_h = tag.userData[1]
        iotBoxTagVo.blood_pressure_l = tag.userData[2]
        break
      case 0x0b:
        iotBoxTagVo.blood_oxygen = tag.userData[0]
        break
      case 0x0c:
        iotBoxTagVo.body_temperature = bytebuffer.readByte()
        iotBoxTagVo.step_count = bytebuffer.readUint16()
        break
      case 0x0d:
        iotBoxTagVo.sleep_state = tag.userData[0]
        iotBoxTagVo.light_sleep_time = tag.userData[1]
        iotBoxTagVo.deep_sleep_time = tag.userData[2]
        break
      default:
        break
    }
    return iotBoxTagVo
  }
}

export function parseMac(dev_id: Uint8Array<ArrayBuffer>): string {
  return Array.from(dev_id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}
export function toHexString(uint8Array:Uint8Array):string {
  return Array.prototype.map.call(uint8Array, (x) => ('00' + x.toString(16)).slice(-2)).join('')
}
