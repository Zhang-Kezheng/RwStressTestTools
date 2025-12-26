import { IotBoxTagProtocol, SotoaTagProtocol } from './protocol'
import ByteBuffer from 'bytebuffer'

export class IotBoxGatewayVo {
  mac: string
  tags: Array<IotBoxTagVo | SotoaTagVo>
  tagMap: Map<string, IotBoxTagVo | SotoaTagVo> = new Map<string, IotBoxTagVo | SotoaTagVo>()
  update_time: number = Date.now()
  raw_data: Uint8Array<ArrayBuffer>
  constructor(
    mac: string,
    tags: Array<IotBoxTagVo | SotoaTagVo>,
    raw_data: Uint8Array<ArrayBuffer>
  ) {
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
  tag_map: Map<string, IotBoxTagVo | SotoaTagVo>
  tag_list: Array<IotBoxTagVo | SotoaTagVo>
  constructor(
    mac: string,
    total: number,
    packet_receive_rate: number,
    tag_map: Map<string, IotBoxTagVo | SotoaTagVo>,
    tag_list: Array<IotBoxTagVo | SotoaTagVo>
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
  constructor(mac: string, raw_data: string) {
    this.mac = mac
    this.raw_data = raw_data
  }
}

export function transform(
  tag_protocol: IotBoxTagProtocol | SotoaTagProtocol
): IotBoxTagVo | SotoaTagVo {
  if (tag_protocol instanceof IotBoxTagProtocol) {
    const iotBoxTagVo = new IotBoxTagVo(
      parseMac(tag_protocol.mac),
      toHexString(tag_protocol.toBytes())
    )
    const bytebuffer = ByteBuffer.wrap(tag_protocol.userData)
    iotBoxTagVo.rssi = tag_protocol.rssi
    switch (tag_protocol.command) {
      case 0x09:
        iotBoxTagVo.voltage = Number(((tag_protocol.userData[2] * 6.6) / 255).toFixed(2))
        iotBoxTagVo.tamper = ((tag_protocol.userData[0] >> 5) & 0x01) == 1
        iotBoxTagVo.button = ((tag_protocol.userData[0] >> 4) & 0x01) == 1
        iotBoxTagVo.shock = ((tag_protocol.userData[0] >> 3) & 0x01) == 1
        break
      case 0x0a:
        iotBoxTagVo.heart_rate = tag_protocol.userData[0]
        iotBoxTagVo.blood_pressure_h = tag_protocol.userData[1]
        iotBoxTagVo.blood_pressure_l = tag_protocol.userData[2]
        break
      case 0x0b:
        iotBoxTagVo.blood_oxygen = tag_protocol.userData[0]
        break
      case 0x0c:
        iotBoxTagVo.body_temperature = bytebuffer.readByte()
        iotBoxTagVo.step_count = bytebuffer.readUint16()
        break
      case 0x0d:
        iotBoxTagVo.sleep_state = tag_protocol.userData[0]
        iotBoxTagVo.light_sleep_time = tag_protocol.userData[1]
        iotBoxTagVo.deep_sleep_time = tag_protocol.userData[2]
        break
      default:
        break
    }
    return iotBoxTagVo
  } else {
    const bytebuffer = ByteBuffer.wrap(tag_protocol.data)
    const mac = parseMac(tag_protocol.mac)
    const firmware = bytebuffer.readByte()
    const hardware = bytebuffer.readByte()
    const battery_level = bytebuffer.readByte()
    const body_temperature = bytebuffer.readByte()
    const status = bytebuffer.readByte()
    const raw = toHexString(tag_protocol.toBytes())
    if (tag_protocol.type == 0x00) {
      bytebuffer.skip(6)
      const sn = bytebuffer.readByte()
      return new SotoaTagVo(
        mac,
        firmware,
        hardware,
        battery_level,
        body_temperature,
        status == 0x00,
        sn,
        raw
      )
    } else {
      const heart_rate = bytebuffer.readUint8()
      const blood_pressure_h = bytebuffer.readUint8()
      const blood_pressure_l = bytebuffer.readUint8()
      const blood_oxygen = bytebuffer.readUint8()
      const step_count = bytebuffer.readUint16()
      const sleep_state = bytebuffer.readByte()
      const deep_sleep_time = bytebuffer.readByte()
      const light_sleep_time = bytebuffer.readByte()
      const sn = bytebuffer.readByte()
      const tag = new SotoaTagVo(
        mac,
        firmware,
        hardware,
        battery_level,
        body_temperature,
        status == 0x00,
        sn,
        raw
      )
      tag.heart_rate = heart_rate
      tag.blood_pressure_h = blood_pressure_h
      tag.blood_pressure_l = blood_pressure_l
      tag.blood_oxygen = blood_oxygen
      tag.step_count = step_count
      tag.sleep_state = sleep_state
      tag.deep_sleep_time = deep_sleep_time
      tag.light_sleep_time = light_sleep_time
      return tag
    }
  }
}
export class SotoaTagVo {
  mac: string
  firmware: number
  hardware: number
  battery_level: number
  body_temperature: number
  tamper: boolean
  heart_rate?: number
  blood_pressure_h?: number
  blood_pressure_l?: number
  blood_oxygen?: number
  step_count?: number
  sleep_state?: number
  deep_sleep_time?: number
  light_sleep_time?: number
  sn: number
  last_time: number = Date.now()
  first_time?: number
  packet_count: number = 1
  raw_data: string
  constructor(
    mac: string,
    firmware: number,
    hardware: number,
    battery_level: number,
    body_temperature: number,
    tamper: boolean,
    sn: number,
    raw_data: string
  ) {
    this.mac = mac
    this.firmware = firmware
    this.hardware = hardware
    this.battery_level = battery_level
    this.body_temperature = body_temperature
    this.tamper = tamper
    this.sn = sn
    this.raw_data = raw_data
  }
}

export function parseMac(dev_id: Uint8Array<ArrayBuffer>): string {
  return Array.from(dev_id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}
export function toHexString(uint8Array: Uint8Array): string {
  return Array.prototype.map.call(uint8Array, (x) => ('00' + x.toString(16)).slice(-2)).join('')
}
