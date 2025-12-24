import { createRouter, createWebHistory } from 'vue-router'
import GatewayView from '../views/GatewayView.vue'
import MiddlewareView from '../views/MiddlewareView.vue'
import SettingView from '../views/SettingView.vue'
const routes = [
  { path: '/', name: 'Gateway', component: GatewayView },
  { path: '/Gateway', name: 'Gateway', component: GatewayView },
  { path: '/Middleware', name: 'Middleware', component: MiddlewareView },
  { path: '/Setting', name: 'Setting', component: SettingView }
]
const router = createRouter({
  history: createWebHistory(),
  routes
})
export default router
