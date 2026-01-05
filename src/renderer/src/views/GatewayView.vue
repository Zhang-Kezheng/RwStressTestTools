<script setup lang="tsx">
import { ref, onMounted, toRaw, onUnmounted } from 'vue'
import { SearchIcon } from 'tdesign-icons-vue-next'
import { IotBoxGateway } from '@common/vo'
import {
  CustomValidateResolveType,
  CustomValidator,
  FormInstanceFunctions,
  FormProps,
  ValueType
} from 'tdesign-vue-next'
import * as ip from 'ip'
import GatewayTagList from '@renderer/views/GatewayTagList.vue'
const formData = ref({
  transport: 'UDP',
  protocol: 'IOT_BOX',
  ip: '127.0.0.1',
  port: 32500,
  rate: 1,
  gateway_count: 1,
  tag_count: 26,
  prefix: '0201'
})
const runtime = ref(0)
const running = ref(false)
const settingShow = ref(false)
let timer: number
onMounted(async () => {
  await fetchList()
  timer = setInterval(
    async () => {
      await fetchList()
    },
    500,
    []
  )
})
const fetchList = async (): Promise<void> => {
  const run_time = await window.electron.ipcRenderer.invoke('gateway:runtime')
  running.value = run_time != 0
  runtime.value = run_time
  const result: IotBoxGateway[] = await window.electron.ipcRenderer.invoke('gateway:list')
  tableData.value = result.filter((item: IotBoxGateway) => {
    return item.mac.replaceAll(':', '').includes(filterMac.value.replaceAll(':', ''))
  })
}
onUnmounted(async () => {
  clearInterval(timer)
})
function format_date(now: Date): string {
  const year = now.getFullYear()
  const month = ('0' + (now.getMonth() + 1)).slice(-2)
  const day = ('0' + now.getDate()).slice(-2)
  const hours = ('0' + now.getHours()).slice(-2)
  const minutes = ('0' + now.getMinutes()).slice(-2)
  const seconds = ('0' + now.getSeconds()).slice(-2)

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
const realtime_index = ref(-1)
const realtime_show = ref(false)
const overview_index = ref(-1)
const overview_show = ref(false)
const tableColumns = [
  {
    colKey: 'mac',
    title: '网关Mac',
    width: '140',
    align: 'center'
  },
  {
    colKey: 'matters',
    title: '实时数据',
    align: 'center',
    width: '140',
    cell: (_h, { rowIndex }) => {
      return (
        <t-link
          theme="primary"
          onClick={() => {
            realtime_index.value = rowIndex
            realtime_show.value = true
          }}
        >
          查看
        </t-link>
      )
    }
  },
  {
    colKey: 'matters',
    title: '标签总览',
    align: 'center',
    width: '140',
    cell: (_h, { rowIndex }) => {
      return (
        <t-link
          theme="primary"
          onClick={() => {
            overview_index.value = rowIndex
            overview_show.value = true
          }}
        >
          查看
        </t-link>
      )
    }
  },
  {
    colKey: 'update_time',
    title: '更新时间',
    width: '140',
    align: 'center',
    cell: (_h, { row }) => {
      return <span>{format_date(new Date(row.update_time))}</span>
    }
  }
]
const settingClick = (): void => {
  settingShow.value = !settingShow.value
}
const filterMac = ref('')
const startClick = async (): Promise<void> => {
  if (running.value) {
    let res = await window.electron.ipcRenderer.invoke('gateway:stop')
    console.log('gateway:stop', res)
  } else {
    running.value = true
    let res = await window.electron.ipcRenderer.invoke('gateway:start', toRaw(formData.value))
    console.log('gateway:start', res)
    running.value = false
  }
}
const tableData = ref<IotBoxGateway[]>([])
function formatTimestampToTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = date.getUTCSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
const ipValidator: CustomValidator = (val: ValueType): CustomValidateResolveType => {
  if (ip.isV4Format(val as string)) {
    return true
  } else {
    return {
      result: false,
      message: '请输入有效的ip地址',
      type: 'error'
    }
  }
}
const numberValidator: CustomValidator = (val: ValueType): CustomValidateResolveType => {
  if ((val as number) > 0) {
    return true
  } else {
    return {
      result: false,
      message: '大于0',
      type: 'error'
    }
  }
}

const rules: FormProps['rules'] = {
  ip: [
    {
      required: true,
      message: '请输入目标地址',
      type: 'error',
      trigger: 'change'
    },
    { validator: ipValidator }
  ],
  port: [
    {
      required: true,
      message: '端口必填',
      type: 'error'
    },
    {
      min: 1,
      message: '最小值为1',
      type: 'error'
    },
    {
      max: 65535,
      message: '最大值65535',
      type: 'error'
    }
  ],
  rate: [
    {
      required: true,
      message: '发包频率必填',
      type: 'error'
    },
    { validator: numberValidator }
  ],
  gateway_count: [
    {
      required: true,
      message: '网关数必填',
      type: 'error'
    },
    {
      min: 1,
      message: '最小值为1',
      type: 'error'
    }
  ],
  tag_count: [
    {
      required: true,
      message: '标签数必填',
      type: 'error'
    },
    {
      min: 1,
      message: '最小值为1',
      type: 'error'
    }
  ],
  prefix: [
    {
      required: true,
      message: '前缀必填',
      type: 'error'
    }
  ]
}
const form = ref<FormInstanceFunctions>()
const onSubmit = async (): Promise<void> => {
  const result = (await form.value?.validate())?.valueOf()
  if (result == true) {
    settingShow.value = false
    await startClick()
  }
}
const validateHex = (): void => {
  // 允许的正则表达式，匹配16进制数
  const hexPattern = /^[0-9A-Fa-f]*$/
  // 如果输入的不是16进制字符，移除最后一个字符
  if (!hexPattern.test(formData.value.prefix)) {
    formData.value.prefix = formData.value.prefix.slice(0, -1)
  }
}
</script>

<template>
  <div style="display: flex; flex: 1; flex-direction: column; padding: 10px; margin-top: 30px">
    <div style="display: flex; justify-content: space-evenly; gap: 10px; align-items: center">
      <t-icon name="alarm-filled" size="25" />
      <span>{{ formatTimestampToTime(runtime) }}</span>
      <t-input v-model="filterMac" clearable>
        <template #suffixIcon>
          <search-icon :style="{ cursor: 'pointer' }" />
        </template>
      </t-input>
      <t-button shape="circle" variant="text" @click="settingClick">
        <t-icon name="setting-1-filled" size="28" />
      </t-button>
      <t-button shape="circle" variant="text" @click="startClick">
        <template #icon>
          <t-icon v-if="running" name="pause-circle-filled" size="28" style="color: red" />
          <t-icon v-else name="play-circle-filled" size="28" />
        </template>
      </t-button>
    </div>
    <t-table
      ref="tableRef"
      style="margin-top: 10px"
      row-key="id"
      max-height="85vh"
      :columns="tableColumns"
      :data="tableData"
      :scroll="{ type: 'virtual', rowHeight: 50, bufferSize: 10 }"
      :bordered="true"
      lazy-load
    />
  </div>
  <t-dialog
    v-model:visible="settingShow"
    header="基本设置"
    width="65%"
    :confirm-on-enter="true"
    @confirm="onSubmit"
  >
    <t-form ref="form" :data="formData" layout="inline" :disabled="running" :rules="rules">
      <t-form-item label="传输协议" name="name" label-align="top">
        <t-select
          v-model="formData.transport"
          placeholder="请选择"
          :options="[
            { label: 'UDP', value: 'UDP' },
            { label: 'TCP', value: 'TCP' }
          ]"
          size="medium"
        />
      </t-form-item>
      <t-form-item label="协议类型" name="name" label-align="top">
        <t-select
          v-model="formData.protocol"
          placeholder="请选择"
          :options="[
            { label: 'IOT_BOX', value: 'IOT_BOX' },
            { label: '索塔', value: 'SOTOA' }
          ]"
          size="medium"
        />
      </t-form-item>
      <t-form-item label="目标地址" name="ip" label-align="top">
        <t-input v-model="formData.ip"></t-input>
      </t-form-item>
      <t-form-item label="端口" name="port" label-align="top">
        <t-input v-model="formData.port" type="number"></t-input>
      </t-form-item>
      <t-form-item label="发包频率" name="rate" label-align="top">
        <t-input v-model="formData.rate" type="number"></t-input>
      </t-form-item>
      <t-form-item label="网关数" name="gateway_count" label-align="top">
        <t-input v-model="formData.gateway_count" type="number"></t-input>
      </t-form-item>
      <t-form-item label="标签数" name="tag_count" label-align="top">
        <t-input v-model="formData.tag_count" type="number"></t-input>
      </t-form-item>
      <t-form-item label="地址前缀" name="prefix" label-align="top">
        <t-input v-model="formData.prefix" :maxlength="4" @change="validateHex"></t-input>
      </t-form-item>
    </t-form>
  </t-dialog>
  <t-dialog
    v-model:visible="realtime_show"
    header="实时数据"
    width="65%"
    placement="center"
    :confirm-on-enter="true"
    @confirm="realtime_show = false"
  >
    <span>{{ tableData[realtime_index]?.raw_data }}</span>
  </t-dialog>
  <t-dialog
    v-model:visible="overview_show"
    header="标签总览"
    width="95%"
    :footer="false"
    destroy-on-close
    placement="center"
    :confirm-on-enter="true"
    @confirm="overview_show = false"
  >
    <GatewayTagList :mac="tableData[overview_index]?.mac" />
  </t-dialog>
</template>

<style scoped></style>
