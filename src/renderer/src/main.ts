import 'virtual:svg-icons-register'
import { createApp } from 'vue'
import App from './App.vue'
import TDesign from 'tdesign-vue-next'
import router from './router'
import 'tdesign-vue-next/es/style/index.css'
const app = createApp(App)
app.use(TDesign)
app.use(router)
// 全局错误处理
app.config.errorHandler = async (err) => {
  const error = err as Error
  console.error('errorHandler', error)
  const messages = error.message.split(':')
  alert(messages[messages.length-1])
}
// 全局 Promise 错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('unhandledrejection', event.reason)
})
// 全局 JS 错误处理
window.addEventListener('error', (event) => {
  console.error('error', event.error)
})
let app_setting = localStorageGet<AppSetting>('app_setting')
if (app_setting === null) {
  app_setting = {
    exportPath: await window.electron.ipcRenderer.invoke('app:path', 'userData'),
    theme: 'light'
  }
  window.localStorage.setItem('app_setting', JSON.stringify(app_setting))
}
window.electron.ipcRenderer.invoke('setting:set_theme', app_setting.theme)
app.provide('appSetting', app_setting)
app.mount('#app')
export type AppSetting = {
  exportPath: string
  theme: 'light' | 'dark' | 'system'
}
function localStorageGet<T>(key: string): T | null {
  const result = window.localStorage.getItem(key)
  if (result == null) {
    return null
  } else {
    return JSON.parse(result) as T
  }
}
