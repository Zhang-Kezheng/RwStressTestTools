import OS from 'os'
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent
import {
  IotBoxMiddlewareGatewayVo,
  IotBoxTagVo,
  IotBoxMiddlewareGateway,
  SotoaTagVo,
  transform
} from '../common/vo'
import { mergeProperties } from './gateway.ts'
import * as fs from 'node:fs'
import path from 'path'
import { MiddlewareOption } from '../common/dto.ts'
export async function ips(): Promise<string[]> {
  const interfaces: NodeJS.Dict<OS.NetworkInterfaceInfo[]> = OS.networkInterfaces()
  const ips = new Array<string>()
  for (const interfaceName in interfaces) {
    if (interfaceName.includes('en') || interfaceName.includes('lo')) {
      const ifaces = interfaces[interfaceName]!
      for (let i = 0; i < ifaces.length; i++) {
        const iface = ifaces[i]
        if (iface.family === 'IPv4') {
          ips.push(iface.address)
        }
      }
    }
  }
  return ips
}
import workerpool from 'workerpool'
const pool = workerpool.pool(__dirname + '/middleware_worker.js')
let start_time = 0
let server: Server
const gateway_map = new Map<string, IotBoxMiddlewareGatewayVo>()
const gateway_list: IotBoxMiddlewareGatewayVo[] = []
export async function start(
  _event: IpcMainInvokeEvent,
  option: MiddlewareOption
): Promise<boolean> {
  console.log('middleware:start', option)
  fs.readdirSync(path.join(app.getPath('userData'), 'cache')).forEach((value) => {
    const ext = path.extname(value)
    if (ext == '.cache') {
      fs.unlinkSync(path.join(path.join(app.getPath('userData'), 'cache', value)))
    }
  })
  server =
    option.transport == 'UDP'
      ? new UdpServer(option.ip, option.port)
      : new TcpServer(option.ip, option.port)
  const cache_map: Map<string, Array<IotBoxTagVo | SotoaTagVo>> = new Map<
    string,
    Array<IotBoxTagVo | SotoaTagVo>
  >()
  const timer = setInterval(() => {
    gateway_list.forEach((item) => {
      item.last_packet_receive_rate = item.packet_receive_rate
      item.packet_receive_rate = 0
      cache_map.forEach((value, key) => {
        let data = ''
        value.forEach((item) => {
          data = data + item.raw_data + `${os.EOL}`
        })
        fs.appendFileSync(
          path.join(app.getPath('userData'), 'cache', `${key.replaceAll(':', '-')}.cache`),
          data
        )
      })
      cache_map.clear()
    })
  }, 1000)
  return new Promise<boolean>((resolve, reject) => {
    server.on('error', (err) => {
      switch (err.message) {
        case 'EADDRINUSE':
          reject('端口被占用')
          break
        default:
          reject('出现未知异常')
          break
      }
      server.close()
    })
    server.on('close', () => {
      console.log('server close')
      start_time = 0
      clearInterval(timer)
      resolve(true)
    })
    server.on('listening', () => {
      console.log(`server listening ${option.ip}:${option.port}`)
      start_time = Date.now()
      gateway_list.length = 0
      gateway_map.clear()
    })
    server.message(async (message) => {
      try {
        const [mac, tag_list, tag_map] = await pool.exec('process', [option.protocol, message])
        const tags: Array<IotBoxTagVo | SotoaTagVo> = JSON.parse(JSON.stringify(tag_list))
        if (cache_map.has(mac)) {
          cache_map.get(mac)?.push(...tags)
        } else {
          cache_map.set(mac, tags)
        }
        if (gateway_map.has(mac)) {
          const gateway = gateway_map.get(mac)!
          gateway.packet_receive_rate += tag_list.length * 38
          gateway.total += tag_list.length
          tag_list.forEach((tag: IotBoxTagVo) => {
            if (gateway.tag_map.has(tag.mac)) {
              const item = gateway.tag_map.get(tag.mac)!
              const packet_count = item.packet_count + 1
              mergeProperties(item, tag)
              item.packet_count = packet_count
            } else {
              tag.first_time = Date.now()
              gateway.tag_map.set(tag.mac, tag)
              gateway.tag_list.push(tag)
            }
          })
        } else {
          tag_list.forEach((tag: IotBoxTagVo) => {
            tag.first_time = Date.now()
          })
          const gateway = new IotBoxMiddlewareGatewayVo(mac, tag_list.length, 0, tag_map, tag_list)
          gateway_list.push(gateway)
          gateway_map.set(gateway.mac, gateway)
        }
      } catch (e) {
        console.error(e)
      }
    })
    server.listen()
  })
}
export async function stop(): Promise<boolean> {
  if (start_time != 0) {
    server.close()
    return true
  }
  return false
}
import os from 'os'
import { Server, TcpServer, UdpServer } from './server.ts'
import { app } from 'electron'
import { IotBoxTagProtocol } from '../common/protocol.ts'
export async function export_tag_list(
  _event: IpcMainInvokeEvent,
  option: {
    gateway_mac: string
    tag_mac: string
    export_mode: number
    path: string
    rate: number
  }
): Promise<boolean> {
  console.log(option)
  const gateway = gateway_map.get(option.gateway_mac)
  const mac = option.gateway_mac.replaceAll(':', '-')
  if (gateway == undefined) {
    throw new Error('错误的网关mac')
  }
  if (option.export_mode == 0) {
    const runtime = Date.now() - start_time
    //合并导出
    fs.appendFileSync(
      path.join(option.path, `${mac}.csv`),
      `Mac,电压,防拆,按钮,振动,心率,舒张压,收缩压,血氧,体温,计步,睡眠状态,深睡眠时间,浅睡眠时间,rssi,第一次上报时间,最后更新时间,丢包率${os.EOL}`
    )
    gateway.tag_list
      .filter((item) => {
        return item.mac.includes(option.tag_mac)
      })
      .forEach((value) => {
        fs.appendFileSync(
          path.join(option.path, `${mac}.csv`),
          parseIotBoxTagVo(value) +
            `${timestampToTime(value.first_time)},${timestampToTime(value.last_time)},${diubaolv(value, option.rate, runtime)}% ${os.EOL}`
        )
      })
  } else {
    //不合并导出
    fs.appendFileSync(
      path.join(option.path, `${mac}.csv`),
      `Mac,电压,防拆,按钮,振动,心率,舒张压,收缩压,血氧,体温,计步,睡眠状态,深睡眠时间,浅睡眠时间,rssi,更新时间,原始数据${os.EOL}`
    )
    const data = fs
      .readFileSync(path.join(app.getPath('userData'), 'cache', `${mac}.cache`))
      .toString()
    const list: Array<IotBoxTagVo | SotoaTagVo> = []
    data.split(`${os.EOL}`).forEach((item) => {
      const protocol = IotBoxTagProtocol.getInstance(hexStringToByteArray(item).buffer)
      if (protocol != null) {
        const vo = transform(protocol)
        list.push(vo)
      }
    })
    list
      .filter((item) => {
        return item.mac.includes(option.tag_mac)
      })
      .forEach((value) => {
        fs.appendFileSync(
          path.join(option.path, `${mac}.csv`),
          parseIotBoxTagVo(value) + `${timestampToTime(value.last_time)},${value.raw_data}${os.EOL}`
        )
      })
  }
  console.log('File written successfully')

  return true
}
// 将十六进制字符串转换为字节数组
function hexStringToByteArray(hex: string): Uint8Array<ArrayBuffer> {
  // 创建一个 Uint8Array，长度为 hex 字符串的一半
  const byteArray = new Uint8Array(hex.length / 2)

  // 遍历每两个字符，将其转换为一个字节
  for (let i = 0; i < hex.length; i += 2) {
    byteArray[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }

  return byteArray // 返回字节数组
}
function timestampToTime(timestamp: number | undefined): string {
  if (timestamp == undefined) return ''
  const date = new Date(timestamp) // 如果时间戳是10位数，则需要乘以1000
  const Y = date.getFullYear() + '-'
  const M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-'
  const D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' '
  const h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':'
  const m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':'
  const s = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()) + '.'
  const milliseconds =
    date.getMilliseconds() < 100 ? '0' + date.getMilliseconds() : date.getMilliseconds()
  return Y + M + D + h + m + s + milliseconds
}
function parseIotBoxTagVo(tag: IotBoxTagVo): string {
  return `${tag.mac},${tag.voltage ?? ''},${tag.tamper ?? ''},${tag.button ?? ''},${tag.shock ?? ''},${tag.heart_rate ?? ''},${tag.blood_pressure_l ?? ''},${tag.blood_pressure_h ?? ''},${tag.blood_oxygen ?? ''},${tag.body_temperature ?? ''},${tag.step_count ?? ''},${tag.sleep_state ?? ''},${tag.deep_sleep_time ?? ''},${tag.light_sleep_time ?? ''},${tag.rssi ?? ''},`
}
const diubaolv = (row: IotBoxTagVo, rate: number, runtime: number): string => {
  const yingshou = (runtime * rate) / 1000
  if (yingshou === 0) {
    return '0'
  }
  let result = yingshou - row.packet_count
  if (result < 0) result = 0
  return ((result * 100) / yingshou).toFixed(2)
}
export async function list(): Promise<IotBoxMiddlewareGateway[]> {
  return gateway_list.map((value) => {
    return {
      mac: value.mac,
      total: value.total,
      last_packet_receive_rate: value.last_packet_receive_rate,
      tag_count: value.tag_list.length
    }
  })
}

export async function tag_list(
  _event: IpcMainInvokeEvent,
  mac: string
): Promise<IotBoxTagVo[] | undefined> {
  return gateway_map.get(mac)?.tag_list
}

export async function runtime(): Promise<number> {
  return start_time == 0 ? 0 : Date.now() - start_time
}
