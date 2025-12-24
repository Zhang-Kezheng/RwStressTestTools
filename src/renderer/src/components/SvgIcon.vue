<template>
  <svg :class="$attrs.class" :style="{ fill: color, width: `${size}px`, height: `${size}px` }">
    <use :href="symbolId" />
  </svg>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
  name: String,
  color: String,
  size: [Number, String]
})
const symbolId = computed(() => `#icon-${props.name}`)
</script>
