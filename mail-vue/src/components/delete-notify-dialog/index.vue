<template>
  <el-dialog v-model="visible" :title="$t('delete')" width="360" @closed="onClosed">
    <div class="del-notify-dialog">
      <p class="del-notify-message">{{ message }}</p>
      <el-checkbox v-model="notify">{{ $t('notifyUser') }}</el-checkbox>
      <el-input v-if="notify" v-model="reason" type="textarea" :rows="2" :maxlength="200"
                :placeholder="$t('deleteReason')" class="del-notify-reason"/>
    </div>
    <template #footer>
      <el-button @click="onCancel">{{ $t('cancel') }}</el-button>
      <el-button type="primary" @click="onConfirm">{{ $t('confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {ref, watch} from "vue";

const props = defineProps({
  modelValue: {type: Boolean, default: false},
  message: {type: String, default: ''}
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const visible = ref(props.modelValue)
const notify = ref(true)
const reason = ref('')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    notify.value = true
    reason.value = ''
  }
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

function onClosed() {
  notify.value = true
  reason.value = ''
}

function onCancel() {
  visible.value = false
  emit('cancel')
}

function onConfirm() {
  visible.value = false
  emit('confirm', {notify: notify.value, reason: reason.value.trim()})
}
</script>

<style scoped>
.del-notify-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.del-notify-message {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.del-notify-reason {
  width: 100%;
}
</style>
