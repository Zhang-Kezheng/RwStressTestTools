<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { UpdateInfo } from 'electron-updater'
import { ProgressInfo } from 'electron-builder'

const router = useRouter()
const menuRoutes = ['/Gateway', '/Middleware', '/Setting']
onMounted(async () => {
  app_version.value = await window.electron.ipcRenderer.invoke('setting:app_version')
  await router.push(menuRoutes[0])
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
const app_version = ref('')
const update_available_dialog_show = ref(false)
const update_info = ref<UpdateInfo>()
window.electron.ipcRenderer.on('update-available', (_event, info: UpdateInfo) => {
  update_available_dialog_show.value = true
  update_info.value = info
})
window.electron.ipcRenderer.on('update-downloaded', (event) => {
  alert('下载完成')
})
window.electron.ipcRenderer.on('update-progress', (info) => {
  console.log('下载中', info)
})
const update_confirm = async (): Promise<void> => {
  const result = await window.electron.ipcRenderer.invoke('app:downloadUpdate')
  console.log(result)
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
    :close-on-overlay-click="false"
    :on-confirm="update_confirm"
  >
    <div>
      <div>{{ update_info?.releaseNotes }}</div>
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
