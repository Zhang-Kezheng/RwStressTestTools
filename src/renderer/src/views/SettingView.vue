<script setup lang="ts">
import { inject, ref, toRaw, watch } from 'vue'
import { AppSetting } from '@renderer/main'
import { UpdateCheckResult } from 'electron-updater'
const appSetting = ref<AppSetting>(inject<AppSetting>('appSetting')!)

const themeChange = (value: string): void => {
  window.electron.ipcRenderer.invoke('setting:set_theme', value)
}
const showSaveDialog = async (): Promise<void> => {
  const result = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
  if (!result.canceled) {
    appSetting.value.exportPath = result.filePaths[0]
  }
}
watch(
  () => appSetting,
  (newValue) => {
    console.log('appSetting change')
    window.localStorage.setItem('app_setting', JSON.stringify(toRaw(newValue.value)))
  },
  { deep: true }
)
const checkUpdate = async (): Promise<void> => {
  try {
    const result: UpdateCheckResult =
      await window.electron.ipcRenderer.invoke('setting:check_update')
    if (!result.isUpdateAvailable) {
      alert('当前版本为最新版本')
    }
  } catch (e) {
    console.error(e)
    alert('服务器出现错误，请联系管理员')
  }
}
</script>

<template>
  <t-list style="height: 100%">
    <t-list-item style="margin-top: 30px">
      <t-list-item-meta title="基本设置">
        <template #description>
          <t-form-item label="导出目录">
            <t-input-adornment>
              <t-input v-model="appSetting.exportPath" readonly style="width: 300px"></t-input>
              <template #append>
                <t-button shape="square" variant="outline" @click="showSaveDialog">
                  <t-icon name="folder-1" />
                </t-button>
              </template>
            </t-input-adornment>
          </t-form-item>
          <t-form-item label="主题">
            <t-select
              v-model="appSetting.theme"
              placeholder="请选择主题"
              style="width: 200px"
              @change="themeChange"
            >
              <t-option label="浅色模式" value="light"></t-option>
              <t-option label="深色模式" value="dark"></t-option>
              <t-option label="跟随系统" value="system"></t-option>
            </t-select>
          </t-form-item>
          <t-button @click="checkUpdate">检查更新</t-button>
        </template>
      </t-list-item-meta>
    </t-list-item>
  </t-list>
  <!--  <span>版本号: {{ app_version }}</span>-->
</template>

<style scoped></style>
