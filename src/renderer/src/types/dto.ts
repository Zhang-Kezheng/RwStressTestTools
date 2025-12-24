import ByteBuffer from 'bytebuffer'
import { IotBoxTagProtocol } from '@renderer/types/protocol'

export class IotBoxGatewayDto {
  mac: string
  tags: Array<IotBoxTagDto>
  tagMap: Map<string, IotBoxTagDto> = new Map<string, IotBoxTagDto>()
  update_time: number = Date.now()
  raw_data: Uint8Array<ArrayBuffer>
  constructor(mac: string, tags: Array<IotBoxTagDto>, raw_data: Uint8Array<ArrayBuffer>) {
    this.mac = mac
    this.tags = tags
    this.tags.forEach((value) => {
      this.tagMap.set(value.mac, value)
    })
    this.raw_data = raw_data
  }
}
export class IotBoxMiddlewareGatewayDto {
  mac: string
  total: number
  packet_receive_rate: number
  last_packet_receive_rate: number = 0
  tag_map: Map<string, IotBoxTagDto>
  tag_list: IotBoxTagDto[]
  tag_packets: IotBoxTagDto[] = []
  constructor(
    mac: string,
    total: number,
    packet_receive_rate: number,
    tag_map: Map<string, IotBoxTagDto>,
    tag_list: IotBoxTagDto[]
  ) {
    this.mac = mac
    this.total = total
    this.packet_receive_rate = packet_receive_rate
    this.tag_map = tag_map
    this.tag_list = tag_list
  }
}
export class IotBoxTagDto {
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
  first_time: number = Date.now()
  packet_count: number = 0
  constructor(mac: string) {
    this.mac = mac
  }
  static transform(tag: IotBoxTagProtocol): IotBoxTagDto {
    const iotBoxTagDto = new IotBoxTagDto(parseMac(tag.mac))
    const bytebuffer = ByteBuffer.wrap(tag.userData)
    iotBoxTagDto.rssi = tag.rssi
    switch (tag.command) {
      case 0x09:
        iotBoxTagDto.voltage = Number(((tag.userData[2] * 6.6) / 255).toFixed(2))
        iotBoxTagDto.tamper = ((tag.userData[0] >> 5) & 0x01) == 1
        iotBoxTagDto.button = ((tag.userData[0] >> 4) & 0x01) == 1
        iotBoxTagDto.shock = ((tag.userData[0] >> 3) & 0x01) == 1
        break
      case 0x0a:
        iotBoxTagDto.heart_rate = tag.userData[0]
        iotBoxTagDto.blood_pressure_h = tag.userData[1]
        iotBoxTagDto.blood_pressure_l = tag.userData[2]
        break
      case 0x0b:
        iotBoxTagDto.blood_oxygen = tag.userData[0]
        break
      case 0x0c:
        iotBoxTagDto.body_temperature = bytebuffer.readByte()
        iotBoxTagDto.step_count = bytebuffer.readUint16()
        break
      case 0x0d:
        iotBoxTagDto.sleep_state = tag.userData[0]
        iotBoxTagDto.light_sleep_time = tag.userData[1]
        iotBoxTagDto.deep_sleep_time = tag.userData[2]
        break
      default:
        break
    }
    return iotBoxTagDto
  }
}
export function mergeProperties<T>(obj1: T, obj2: T): void {
  for (const key in obj2) {
    if (obj2[key] !== null && obj2[key] !== undefined) {
      obj1[key] = obj2[key]
    }
  }
}
export function parseMac(dev_id: Uint8Array<ArrayBuffer>): string {
  return Array.from(dev_id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}
