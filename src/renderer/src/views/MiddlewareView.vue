<script setup lang="tsx">
import { inject, onMounted, onUnmounted, reactive, ref, toRaw } from 'vue'
import { SearchIcon } from 'tdesign-icons-vue-next'
import { IotBoxGatewayVo, IotBoxMiddlewareGateway } from '@common/vo'
import { MiddlewareOption } from '@common/dto'
import MiddlewareTagList from '@renderer/views/MiddlewareTagList.vue'
import { AppSetting } from '@renderer/main'
const formData = reactive<MiddlewareOption>({
  transport: 'UDP',
  protocol: 'IOT_BOX',
  ip: '127.0.0.1',
  port: 32500,
  rate: 1
})
const runtime = ref(0)
const running = ref(false)
const settingShow = ref(false)
const ips = ref(
  new Array<{
    label: string
    value: string
  }>()
)
let timer: number
onMounted(async () => {
  const results = await window.electron.ipcRenderer.invoke('middleware:ips')
  for (let i = 0; i < results.length; i++) {
    ips.value.push({
      label: results[i],
      value: results[i]
    })
  }
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
  const run_time = await window.electron.ipcRenderer.invoke('middleware:runtime')
  running.value = run_time != 0
  runtime.value = run_time
  const result = await window.electron.ipcRenderer.invoke('middleware:list')
  tableData.value = result.filter((item: IotBoxGatewayVo) => {
    return item.mac.replaceAll(':', '').includes(filterMac.value.replaceAll(':', ''))
  })
}
onUnmounted(() => {
  clearInterval(timer)
})
const diubaolv = (row: IotBoxMiddlewareGateway): string => {
  const yingshou = (runtime.value * formData.rate * row.tag_count) / 1000
  if (yingshou === 0) {
    return '0'
  }
  let result = yingshou - row.total
  if (result < 0) result = 0
  return ((result * 100) / yingshou).toFixed(2)
}
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
    colKey: 'total',
    title: '总包数',
    align: 'center',
    width: '140'
  },
  {
    colKey: 'packet_receive_rate',
    title: '丢包率',
    align: 'center',
    width: '140',
    cell: (_h, { row }) => {
      return <span>{diubaolv(row)}%</span>
    }
  },
  {
    colKey: 'last_packet_receive_rate',
    title: '收包速率(Byte/S)',
    width: '140',
    align: 'center'
  },
  {
    colKey: 'total',
    title: '标签数',
    align: 'center',
    width: '140',
    cell: (_h, { row, rowIndex }) => {
      return (
        <t-link
          theme="primary"
          onClick={() => {
            overview_index.value = rowIndex
            overview_show.value = true
          }}
        >
          {row.tag_count}
        </t-link>
      )
    }
  }
]
const settingClick = (): void => {
  settingShow.value = !settingShow.value
}
const filterMac = ref('')
const filterTagMac = ref('')
const startClick = async (): Promise<void> => {
  if (running.value) {
    let res = await window.electron.ipcRenderer.invoke('middleware:stop')
    console.log('middleware:stop', res)
  } else {
    let res = await window.electron.ipcRenderer.invoke('middleware:start', toRaw(formData))
    console.log('middleware:start', res)
  }
}
const tableData = ref<IotBoxMiddlewareGateway[]>([])
function formatTimestampToTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = date.getUTCSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const app_setting = inject<AppSetting>('appSetting')!
const exportModeShow = ref(false)
const exportMode = ref('0')
const exporting = ref(false)
import { FormInstanceFunctions, FormProps, MessagePlugin } from 'tdesign-vue-next'
const export_tag_list = async (): Promise<void> => {
  try {
    exporting.value = true
    await window.electron.ipcRenderer.invoke('middleware:export_tag_list', {
      tag_mac: filterTagMac.value,
      export_mode: exportMode.value,
      path: app_setting.exportPath,
      rate: formData.rate,
      gateway_mac: tableData.value[overview_index.value]?.mac
    })
    await MessagePlugin.success({
      content: (
        <div>
          导出完成{' '}
          <a href="javascript:void(0)" onClick={opendir}>
            打开目录
          </a>
        </div>
      ),
      duration: 2000
    })
  } catch (e: unknown) {
    const error = e as Error
    console.error(error)
    await MessagePlugin.error({
      content: '导出失败' + error.message,
      duration: 2000
    })
  } finally {
    exporting.value = false
  }
}
const rules: FormProps['rules'] = {
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
    {
      min: 1,
      message: '最小值为1',
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
const opendir = (): void => {
  window.electron.ipcRenderer.invoke('shell:openPath', app_setting.exportPath)
}
</script>

<template>
  <div style="height: 30px; width: 100%; background-color: transparent; app-region: drag" />
  <div style="display: flex; flex: 1; flex-direction: column; padding: 10px">
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
      :scroll="{ type: 'virtual', rowHeight: 69, bufferSize: 10 }"
      :bordered="true"
      lazy-load
    />
  </div>
  <t-dialog
    v-model:visible="settingShow"
    header="基本设置"
    width="50%"
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
          :options="[{ label: 'IOT_BOX', value: 'IOT_BOX' }]"
          size="medium"
        />
      </t-form-item>
      <t-form-item label="本机地址" name="ip" label-align="top">
        <t-select v-model="formData.ip" placeholder="请选择" :options="ips" size="medium" />
      </t-form-item>
      <t-form-item label="端口" name="port" label-align="top">
        <t-input v-model="formData.port" type="number"></t-input>
      </t-form-item>
      <t-form-item label="发包频率" name="rate" label-align="top">
        <t-input v-model="formData.rate" type="number"></t-input>
      </t-form-item>
    </t-form>
  </t-dialog>
  <t-dialog
    v-model:visible="overview_show"
    width="95%"
    :footer="false"
    placement="center"
    destroy-on-close
    :confirm-on-enter="true"
    @confirm="overview_show = false"
  >
    <template #header>
      <div style="display: flex; width: 100%; gap: 10px; align-items: center">
        <span>标签总览</span>
        <t-input v-model="filterTagMac" clearable style="flex: 1">
          <template #suffixIcon>
            <search-icon :style="{ cursor: 'pointer' }" />
          </template>
        </t-input>
        <t-button @click="exportModeShow = true">导出</t-button>
      </div>
    </template>
    <MiddlewareTagList
      :mac="tableData[overview_index]?.mac"
      :filter-mac="filterTagMac"
      :runtime="runtime"
      :rate="formData.rate"
    />
    <t-dialog v-model:visible="exportModeShow" header="导出模式" @confirm="export_tag_list">
      <t-radio-group v-model="exportMode">
        <t-radio value="0">合并导出</t-radio>
        <t-radio value="1">不合并导出</t-radio>
      </t-radio-group>
    </t-dialog>
    <t-loading :loading="exporting" fullscreen text="正在导出,请稍后"> </t-loading>
  </t-dialog>
</template>

<style scoped></style>
