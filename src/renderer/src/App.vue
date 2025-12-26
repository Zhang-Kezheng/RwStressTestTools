<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { ProgressInfo } from 'electron-builder'

const router = useRouter()
const menuRoutes = ['/Gateway', '/Middleware', '/Setting']
const app_version = ref('')
const update_available_dialog_show = ref(false)
const update_info = ref<UpdateInfo>()
const update_progress_dialog_show = ref(false)
const progress_info = ref<ProgressInfo>()
onMounted(async () => {
  app_version.value = await window.electron.ipcRenderer.invoke('setting:app_version')
  await router.push(menuRoutes[0])
  window.electron.ipcRenderer.on('update-available', (_event, info: UpdateInfo) => {
    console.log('update-available', info)
    update_available_dialog_show.value = true
    update_info.value = info
  })
  window.electron.ipcRenderer.on(
    'update-downloaded',
    (_event, update_event: UpdateDownloadedEvent) => {
      console.log('下载完成', update_event)
      if (progress_info.value != null) {
        progress_info.value.percent = 100
      }
    }
  )
  window.electron.ipcRenderer.on('update-progress', (_event, info: ProgressInfo) => {
    console.log('下载中', info)
    progress_info.value = info
  })
  window.electron.ipcRenderer.on('update-not-available', (_event, info) => {
    console.log('当前版本为最新版本', info)
  })
})
useDark({
  onChanged(dark) {
    if (dark) {
      document.documentElement.setAttribute('theme-mode', 'dark')
    } else {
      document.documentElement.setAttribute('theme-mode', 'light')
    }
  }
})
const onSelected = (index: number): void => {
  router.push(menuRoutes[index])
}
const update_confirm = async (): Promise<void> => {
  update_progress_dialog_show.value = true
  update_available_dialog_show.value = false
  const result = await window.electron.ipcRenderer.invoke('app:downloadUpdate')
  console.log('app:downloadUpdate', result)
}
const downloadCancel = async (): Promise<void> => {
  await window.electron.ipcRenderer.invoke('app:downloadUpdate')
}
</script>
<template>
  <div
    style="
      height: 30px;
      background-color: transparent;
      app-region: drag;
      position: absolute;
      width: 100%;
      top: 0;
      left: 0;
    "
  />
  <t-layout style="height: 100%">
    <t-aside width="180px" style="margin-right: 2px">
      <t-menu theme="light" default-value="0" width="180px" @change="onSelected">
        <t-menu-item value="0" style="margin-top: 20px">
          <template #icon>
            <t-icon name="data-search-filled" />
          </template>
          网关
        </t-menu-item>
        <t-menu-item value="1">
          <template #icon>
            <t-icon name="device-filled" />
          </template>
          中间件
        </t-menu-item>
        <!--        <t-menu-item value="2">-->
        <!--          <template #icon>-->
        <!--            <t-icon name="work-history-filled" />-->
        <!--          </template>-->
        <!--          历史-->
        <!--        </t-menu-item>-->
        <t-menu-item value="2">
          <template #icon>
            <t-icon name="setting-1-filled" />
          </template>
          设置
        </t-menu-item>
        <template #operations>
          <div style="display: flex; justify-content: center">版本号：{{ app_version }}</div>
        </template>
      </t-menu>
    </t-aside>
    <t-layout>
      <t-content style="display: flex; flex-direction: column">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </t-content>
    </t-layout>
  </t-layout>
  <t-dialog
    v-model:visible="update_available_dialog_show"
    header="检测到新版本，是否更新？"
    mode="modal"
    cancel-btn="跳过"
    :close-on-overlay-click="false"
    :on-confirm="update_confirm"
  >
    <div>最新版本：{{ update_info?.version }}</div>
    <div v-for="releaseNote in update_info?.releaseNotes" :key="releaseNote.toString()">
      {{ releaseNote }}
    </div>
  </t-dialog>
  <t-dialog
    v-model:visible="update_progress_dialog_show"
    header="下载中"
    mode="modal"
    :close-on-overlay-click="false"
    :footer="false"
    @cancel="downloadCancel"
  >
    <div>
      <t-progress :percentage="progress_info?.percent" />
    </div>
  </t-dialog>
</template>

<style>
body {
  margin: 0;
}
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
