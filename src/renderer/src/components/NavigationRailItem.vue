<script setup lang="ts">
import SvgIcon from '@renderer/components/SvgIcon.vue'
import { computed, inject, ref } from 'vue'
import { MenuContext } from '@renderer/components/MenuContext'
const props = defineProps({
  index: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})
const menuContext = inject<MenuContext>('menuContext')
const selectIndex = menuContext?.selectIndex
const hover = ref(false)
const backgroundColor = computed(() => {
  if (props.index === selectIndex?.value) {
    return '#dbdedf'
  }
  if (hover.value) {
    return '#dbdedf50'
  }
  return 'transparent'
})
const onItemSelected = (): void => {
  menuContext?.onSelected(props.index)
}
</script>

<template>
  <div
    class="container"
    :style="{
      backgroundColor: backgroundColor,
      color: props.index === selectIndex ? 'black' : '#7c8b9c'
    }"
    data-name="index"
    :data-value="props.index"
    @click="onItemSelected"
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <SvgIcon
      style="margin-left: 10px"
      :name="icon"
      :color="props.index == selectIndex ? 'black' : '#7c8b9c'"
      size="16"
    />
    <span :style="{ marginLeft: '8px', fontWeight: props.index === selectIndex ? '700' : '400' }">{{
      label
    }}</span>
  </div>
</template>

<style scoped>
.container {
  background-color: transparent;
  width: 130px;
  height: 33px;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 14px;
  color: #7c8b9c;
  font-weight: bolder;
}
</style>
