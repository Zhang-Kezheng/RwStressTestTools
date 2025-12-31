<script setup lang="tsx">
import { onMounted, onUnmounted, ref } from 'vue'
import { IotBoxTagVo } from '@common/vo'
const prop = defineProps({
  mac: {
    type: String
  },
  filterMac: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  runtime: {
    type: Number,
    required: true
  }
})
let timer: number
onMounted(async () => {
  await fetchTagList()
  timer = setInterval(
    async () => {
      await fetchTagList()
    },
    500,
    []
  )
})
async function fetchTagList(): Promise<void> {
  if (prop.mac === undefined) {
    return
  }
  const result: IotBoxTagVo[] = await window.electron.ipcRenderer.invoke(
    'middleware:tag_list',
    prop.mac
  )
  tagTableData.value = result.filter((item) => {
    return item.mac.includes(prop.filterMac)
  })
}
onUnmounted(() => {
  clearInterval(timer)
})
const diubaolv = (row: IotBoxTagVo): string => {
  const yingshou = (prop.runtime * prop.rate) / 1000
  if (yingshou === 0) {
    return '0'
  }
  let result = yingshou - row.packet_count
  if (result < 0) result = 0
  return ((result * 100) / yingshou).toFixed(2)
}
const overviewTableColumns = [
  {
    colKey: 'mac',
    title: '网关Mac',
    width: '160',
    align: 'center',
    fixed: 'left'
  },
  {
    colKey: 'voltage',
    title: '电压/电量',
    align: 'center',
    width: '100'
  },
  {
    colKey: 'tamper',
    title: '防拆',
    align: 'center',
    width: '70',
    cell: (_h, { row }) => {
      return <span>{parseBoolean(row.tamper)}</span>
    }
  },
  {
    colKey: 'button',
    title: '按钮',
    align: 'center',
    width: '70',
    cell: (_h, { row }) => {
      return <span>{parseBoolean(row.button)}</span>
    }
  },
  {
    colKey: 'shock',
    title: '振动',
    align: 'center',
    width: '70',
    cell: (_h, { row }) => {
      return <span>{parseBoolean(row.shock)}</span>
    }
  },
  {
    colKey: 'heart_rate',
    title: '心率',
    align: 'center',
    width: '70'
  },
  {
    colKey: 'blood_pressure_h',
    title: '收缩压',
    align: 'center',
    width: '80'
  },
  {
    colKey: 'blood_pressure_l',
    title: '舒张压',
    align: 'center',
    width: '80'
  },
  {
    colKey: 'blood_oxygen',
    title: '血氧',
    align: 'center',
    width: '70'
  },
  {
    colKey: 'body_temperature',
    title: '体温',
    align: 'center',
    width: '70',
    cell: (_h, { row }) => {
      return (
        <span>{row.body_temperature == undefined ? '' : (row.body_temperature + 200) / 10}</span>
      )
    }
  },
  {
    colKey: 'step_count',
    title: '计步',
    align: 'center',
    width: '100'
  },
  {
    colKey: 'sleep_state',
    title: '睡眠状态',
    align: 'center',
    width: '100',
    cell: (_h, { row }) => {
      return <span>{parseSleepState(row.sleep_state)}</span>
    }
  },
  {
    colKey: 'deep_sleep_time',
    title: '深睡眠时间',
    align: 'center',
    width: '120'
  },
  {
    colKey: 'light_sleep_time',
    title: '浅睡眠时间',
    align: 'center',
    width: '120'
  },
  {
    colKey: 'rssi',
    title: 'rssi',
    align: 'center',
    width: '70'
  },
  {
    colKey: 'first_time',
    title: '第一次上报时间',
    align: 'center',
    width: '200',
    cell: (_h, { row }) => {
      return <span>{timestampToTime(row.first_time)}</span>
    }
  },
  {
    colKey: 'last_time',
    title: '更新时间',
    align: 'center',
    width: '200',
    cell: (_h, { row }) => {
      return <span>{timestampToTime(row.last_time)}</span>
    }
  },
  {
    colKey: 'packet_count',
    title: '丢包率',
    align: 'center',
    width: '100',
    cell: (_h, { row }) => {
      return <span>{diubaolv(row)}%</span>
    }
  }
]
function timestampToTime(timestamp: number): string {
  let date = new Date(timestamp) // 如果时间戳是10位数，则需要乘以1000
  let Y = date.getFullYear() + '-'
  let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-'
  let D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' '
  let h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':'
  let m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':'
  let s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()
  return Y + M + D + h + m + s
}
const tagTableData = ref<IotBoxTagVo[]>([])
const parseBoolean = (value: boolean | undefined): string => {
  if (value == undefined) {
    return ''
  } else if (value) {
    return '是'
  } else {
    return '否'
  }
}
function parseSleepState(state: number): string {
  // {{0x00:清醒；0X01:浅度睡眠；0X02:深度睡眠；0XFF:未检测）}}
  let state_str = '清醒'
  switch (state) {
    case 0x00:
      state_str = '清醒'
      break
    case 0x01:
      state_str = '浅度睡眠'
      break
    case 0x02:
      state_str = '深度睡眠'
      break
    case 0xff:
      state_str = '未检测'
      break
  }
  return state_str
}
</script>

<template>
  <div style="height: 500px">
    <t-table
      ref="tableRef"
      style="margin-top: 10px"
      :max-height="500"
      row-key="id"
      :columns="overviewTableColumns"
      :data="tagTableData"
      :scroll="{ type: 'virtual', rowHeight: 69, bufferSize: 10 }"
      :bordered="true"
      lazy-load
    />
  </div>
</template>

<style scoped></style>
