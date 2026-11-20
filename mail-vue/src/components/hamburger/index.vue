<template>
  <div style="padding: 0 15px;cursor: pointer" @click="toggleClick">
    <Icon
      :class="{'is-active':isActive}"
      class="hamburger"
      icon="fluent:panel-left-20-regular"
      width="20"
      height="20"
    />
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";

defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits()
const toggleClick = () => {
  emit('toggleClick');
}
</script>

<style scoped>
.hamburger {
  display: inline-block;
  vertical-align: middle;
  width: 20px;
  height: 20px;
}

.hamburger.is-active {
  transform: rotate(180deg);
}
</style>
