import workerpool from 'workerpool'
import {
  IotBoxGatewayProtocol,
  TagProtocol
} from '../common/protocol.ts'
import { parseMac, TagVo, transform } from '../common/vo.ts'
import ByteBuffer from 'bytebuffer'

function process(
  _protocol: 'SOTOA' | 'IOT_BOX',
  message: NonSharedBuffer
): [string, Array<TagVo>, Map<string, TagVo>] | undefined {
  const iotBoxGatewayProtocol = IotBoxGatewayProtocol.new(message.buffer)
  if (iotBoxGatewayProtocol == undefined) {
    return undefined
  }
  const mac = parseMac(iotBoxGatewayProtocol.dev_id)
  const data_buffer = ByteBuffer.wrap(iotBoxGatewayProtocol.data)
  const count = data_buffer.readUint8()
  const tag_list: Array<TagVo> = []
  const tag_map = new Map<string, TagVo>()
  if (iotBoxGatewayProtocol.data.length == count * 38 + 1) {
    for (let i = 0; i < count; i++) {
      const tag = TagProtocol.getInstance(data_buffer.readBytes(38).toArrayBuffer())
      if (tag != null) {
        const vo = transform(tag)
        tag_list.push(vo)
        tag_map.set(vo.mac, vo)
      }
    }
  }
  return [mac, tag_list, tag_map]
}

workerpool.worker({
  process: process
})
