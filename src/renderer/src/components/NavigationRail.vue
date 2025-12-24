<script setup lang="ts">

import {  provide, ref, } from 'vue'
import { MenuContext } from '@renderer/components/MenuContext'
const props = defineProps({
  defaultActive: {
    type: Number,
    required: true
  }
})
const selectIndex = ref(props.defaultActive)
// 存储所有注册的 MenuItem 实例
// 注册菜单项
const emits = defineEmits(['onSelected'])
const onSelected = (index: number): void => {
  selectIndex.value = index
  emits('onSelected', index)
}
provide<MenuContext>('menuContext', {
  selectIndex,
  onSelected
})
</script>

<template>
  <div class="container">
    <slot> </slot>
  </div>
</template>

<style scoped>
.container {
  width: 140px;
  background-color: #f5f7f9;
  align-items: center;
  padding-top: 60px;
  gap: 10px;
  display: flex;
  flex-direction: column;
}
</style>
