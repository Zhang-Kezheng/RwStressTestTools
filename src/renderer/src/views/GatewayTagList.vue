<script setup lang="tsx">
import { onMounted, onUnmounted, ref } from 'vue'
const prop = defineProps({
  mac: String
})
let timer: number
const tagList = ref([])
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
  tagList.value = await window.electron.ipcRenderer.invoke('gateway:tag_list', prop.mac)
  console.log(tagList.value)
}
onUnmounted(() => {
  clearInterval(timer)
})

const overviewTableColumns = [
  {
    colKey: 'mac',
    title: '网关Mac',
    width: '160',
    align: 'center'
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
    width: '60'
  }
]
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
  <t-table
    ref="tableRef"
    style="margin-top: 10px"
    row-key="id"
    :columns="overviewTableColumns"
    height="500px"
    :data="tagList"
    :scroll="{ type: 'virtual', rowHeight: 50, bufferSize: 10 }"
    :bordered="true"
    lazy-load
  />
</template>

<style scoped></style>
