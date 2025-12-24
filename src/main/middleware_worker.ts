import workerpool from 'workerpool'
import { IotBoxGatewayProtocol, IotBoxTagProtocol } from '../common/protocol.ts'
import { IotBoxTagVo, parseMac } from '../common/vo.ts'
import ByteBuffer from 'bytebuffer'

function process(
  message: NonSharedBuffer
): [string, IotBoxTagVo[], Map<string, IotBoxTagVo>] | undefined {
  const iotBoxGatewayProtocol = IotBoxGatewayProtocol.new(message.buffer)
  if (iotBoxGatewayProtocol == undefined) {
    return undefined
  }
  const mac = parseMac(iotBoxGatewayProtocol.dev_id)
  const data_buffer = ByteBuffer.wrap(iotBoxGatewayProtocol.data)
  const count = data_buffer.readUint8()
  const tag_list: IotBoxTagVo[] = []
  const tag_map = new Map<string, IotBoxTagVo>()
  if (iotBoxGatewayProtocol.data.length == count * 38 + 1) {
    for (let i = 0; i < count; i++) {
      const tag = IotBoxTagProtocol.getInstance(data_buffer.readBytes(38).toArrayBuffer())
      if (tag != null) {
        const vo = IotBoxTagVo.transform(tag, mac)
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
