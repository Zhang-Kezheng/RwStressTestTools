import { parentPort, workerData } from 'worker_threads'
import ByteBuffer from 'bytebuffer'
import {
  IotBoxGatewayProtocol,
  IotBoxTagProtocol,
  SotoaTagProtocol,
  TagProtocol,
  writeBytes
} from '../common/protocol.ts'
import { IotBoxGatewayVo, transform } from '../common/vo'
import { Client, TcpClient, UdpClient } from './client.ts'

let tagList = new Array<TagProtocol>()
const client: Client =
  workerData.transport == 'UDP'
    ? new UdpClient(workerData.ip, workerData.port)
    : new TcpClient(workerData.ip, workerData.port)
const gateway_mac_buffer = ByteBuffer.allocate(6)
gateway_mac_buffer.writeShort(parseInt(workerData.prefix, 16))
gateway_mac_buffer.writeInt(workerData.index)
gateway_mac_buffer.flip()
for (let j = 0; j < workerData.tag_count; j++) {
  setInterval(() => {
    const tag_mac_buffer = ByteBuffer.allocate(6)
    tag_mac_buffer.writeShort(parseInt(workerData.prefix, 16))
    tag_mac_buffer.writeShort(workerData.index)
    tag_mac_buffer.writeShort(j)
    tag_mac_buffer.flip()
    const tag = buildIotBoxTagPacket(
      workerData.protocol,
      new Uint8Array(tag_mac_buffer.toArrayBuffer())
    )
    tagList.push(tag)
    if (tagList.length >= 26) {
      const gateway = buildIotBoxGatewayPacket(
        new Uint8Array<ArrayBuffer>(gateway_mac_buffer.toArrayBuffer()),
        tagList
      )
      client.send(gateway.toBytes(), () => {
        const iotBoxTagVoList = tagList.map((value: TagProtocol) => {
          return transform(value)
        })
        parentPort?.postMessage(
          new IotBoxGatewayVo(parseMac(gateway.dev_id), iotBoxTagVoList, gateway.toBytes())
        )
        tagList = []
      })
    }
  }, 1000 / workerData.rate)
}
function parseMac(dev_id: Uint8Array<ArrayBuffer>): string {
  return Array.from(dev_id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}

function buildIotBoxGatewayPacket(
  mac: Uint8Array<ArrayBuffer>,
  tags: Array<TagProtocol>
): IotBoxGatewayProtocol {
  const buffer = ByteBuffer.allocate()
  buffer.writeByte(tags.length)
  tags.forEach((item) => {
    writeBytes(buffer, item.toBytes())
  })
  buffer.flip()
  return IotBoxGatewayProtocol.getInstance(mac, new Uint8Array<ArrayBuffer>(buffer.toArrayBuffer()))
}
let sn = 0
function buildIotBoxTagPacket(
  protocol: 'IOT_BOX' | 'SOTOA',
  mac: Uint8Array<ArrayBuffer>
): TagProtocol {
  switch (protocol) {
    case 'IOT_BOX': {
      const tag = new IotBoxTagProtocol()
      tag.packageId = 0x04
      tag.command = getRandomInt(0x09, 0x0f)
      tag.userData = new Uint8Array([
        getRandomInt(0, 255),
        getRandomInt(0, 255),
        getRandomInt(0, 255)
      ])
      tag.crc = 0x00
      tag.dFField = new Uint8Array([
        0x2f, 0x61, 0xac, 0xcc, 0x27, 0x45, 0x67, 0xf7, 0xdb, 0x34, 0xc4, 0x03, 0x8e, 0x5c, 0x0b,
        0xaa, 0x97, 0x30, 0x56, 0xe6
      ])
      return new TagProtocol(mac, 0x1e, 0xff, 0x0d00, tag, getRandomInt(0, 255))
    }
    case 'SOTOA': {
      const event = 0x01
      const type = 0x01
      const data = new Uint8Array([
        1, //固件版本号
        1, //硬件版本号
        getRandomInt(0, 100), //电量百分比（0-100）
        getRandomInt(100, 230), //体温测量值
        getRandomInt(0, 255), //设备状态
        getRandomInt(0, 255), //心率
        getRandomInt(0, 255), //血压
        getRandomInt(0, 255), //血压
        getRandomInt(0, 255), //血氧
        getRandomInt(0, 255), //计步
        getRandomInt(0, 255), //计步
        getRandomInt(0, 2), //睡眠
        getRandomInt(0, 255), //睡眠
        getRandomInt(0, 255), //睡眠
        sn++
      ])
      const tag = new SotoaTagProtocol(0x1000, event, type, data)
      return new TagProtocol(mac, data.length + 8, 0xff, 0x0911, tag, getRandomInt(0, 255))
    }
  }
}
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
