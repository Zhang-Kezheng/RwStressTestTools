import workerpool from 'workerpool'
import { IotBoxGatewayProtocol, IotBoxTagProtocol, SotoaTagProtocol } from '../common/protocol.ts'
import { IotBoxTagVo, parseMac, SotoaTagVo, transform } from '../common/vo.ts'
import ByteBuffer from 'bytebuffer'

function process(
  procotol: 'SOTOA' | 'IOT_BOX',
  message: NonSharedBuffer
): [string, Array<IotBoxTagVo | SotoaTagVo>, Map<string, IotBoxTagVo | SotoaTagVo>] | undefined {
  const iotBoxGatewayProtocol = IotBoxGatewayProtocol.new(message.buffer)
  if (iotBoxGatewayProtocol == undefined) {
    return undefined
  }
  const mac = parseMac(iotBoxGatewayProtocol.dev_id)
  const data_buffer = ByteBuffer.wrap(iotBoxGatewayProtocol.data)
  const count = data_buffer.readUint8()
  const tag_list: Array<IotBoxTagVo | SotoaTagVo> = []
  const tag_map = new Map<string, IotBoxTagVo | SotoaTagVo>()
  if (iotBoxGatewayProtocol.data.length == count * 38 + 1) {
    for (let i = 0; i < count; i++) {
      let tag: IotBoxTagProtocol | SotoaTagProtocol | null
      if (procotol == 'IOT_BOX') {
        tag = IotBoxTagProtocol.getInstance(data_buffer.readBytes(38).toArrayBuffer())
      } else {
        tag = SotoaTagProtocol.getInstance(data_buffer.readBytes(38).toArrayBuffer())
      }
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
