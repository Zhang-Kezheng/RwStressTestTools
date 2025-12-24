import { Worker } from 'worker_threads'
import { IotBoxGateway, IotBoxGatewayVo, IotBoxTagVo } from '../common/vo'
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent
import path from 'path'
type GatewayOption = {
  transport: string
  protocol: string
  ip: string
  port: number
  rate: number
  gateway_count: number
  tag_count: number
  prefix: string
}
let workerList = new Array<Worker>()
let start_time = 0
const gatewayMap = new Map<string, IotBoxGatewayVo>()
let gatewayList = new Array<IotBoxGatewayVo>()
export async function start(_event: IpcMainInvokeEvent, args: GatewayOption): Promise<number[]> {
  console.log('gateway:start', args)
  start_time = Date.now()
  const taskList: Promise<number>[] = []
  for (let i = 0; i < args.gateway_count; i++) {
    const task = new Promise<number>((resolve, reject) => {
      args['index'] = i
      const worker = new Worker(path.join(__dirname, './worker.js'), {
        workerData: args
      })
      worker.on('error', (error) => {
        console.error(error)
        workerList.forEach((worker) => {
          worker.terminate()
        })
        start_time = 0
        workerList = []
        reject(error)
      })
      worker.on('exit', (exitCode) => {
        resolve(exitCode)
        start_time = 0
      })
      worker.on('message', (msg) => {
        const iotBoxGatewayVo = msg as IotBoxGatewayVo
        if (gatewayMap.has(iotBoxGatewayVo.mac)) {
          const gateway = gatewayMap.get(iotBoxGatewayVo.mac)!
          gateway.mac = iotBoxGatewayVo.mac
          gateway.update_time = Date.now()
          gateway.raw_data = iotBoxGatewayVo.raw_data
          iotBoxGatewayVo.tags.forEach((value) => {
            if (gateway.tagMap.has(value.mac)) {
              const tag = gateway.tagMap.get(value.mac)!
              mergeProperties(tag, value)
            } else {
              gateway.tags.push(value)
              gateway.tagMap.set(value.mac, value)
            }
          })
        } else {
          gatewayMap.set(iotBoxGatewayVo.mac, iotBoxGatewayVo)
          gatewayList.push(iotBoxGatewayVo)
        }
      })
      workerList.push(worker)
    })
    taskList.push(task)
  }
  return await Promise.all(taskList)
}

export async function stop(): Promise<boolean> {
  await Promise.all(
    workerList.map((value) => {
      return value.terminate()
    })
  )
  gatewayList = []
  gatewayMap.clear()
  workerList = []
  return true
}

export async function list(): Promise<IotBoxGateway[]> {
  return gatewayList.map((value) => {
    return {
      mac: value.mac,
      raw_data: value.raw_data,
      update_time: value.update_time
    }
  })
}

export async function tag_list(
  _event: IpcMainInvokeEvent,
  mac: string
): Promise<IotBoxTagVo[] | undefined> {
  return gatewayMap.get(mac)?.tags
}

export async function runtime(): Promise<number> {
  return start_time == 0 ? 0 : Date.now() - start_time
}

export function mergeProperties<T>(obj1: T, obj2: T): void {
  for (const key in obj2) {
    if (obj2[key] !== null && obj2[key] !== undefined) {
      obj1[key] = obj2[key]
    }
  }
}
