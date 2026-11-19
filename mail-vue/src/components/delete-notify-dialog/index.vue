<template>
  <el-dialog v-model="visible" :title="$t('delete')" width="360" @closed="onClosed">
    <div class="del-notify-dialog">
      <p class="del-notify-message">{{ message }}</p>
      <el-radio-group v-if="hasPair" v-model="scope" class="del-scope-group">
        <el-radio-button value="single">{{ $t('deleteScopeSingle') }}</el-radio-button>
        <el-radio-button value="pair">{{ $t('deleteScopePair') }}</el-radio-button>
      </el-radio-group>
      <el-checkbox v-if="showNotify" v-model="notify">{{ $t('notifyUser') }}</el-checkbox>
      <el-input v-if="showNotify && notify" v-model="reason" type="textarea" :rows="2" :maxlength="200"
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
  message: {type: String, default: ''},
  // 是否显示“通知用户”勾选：仅删自己的邮件或通知开关关闭时不显示
  showNotify: {type: Boolean, default: true},
  // 选中的邮件里是否有带副本的：有才显示删除范围二选一
  hasPair: {type: Boolean, default: false}
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const visible = ref(props.modelValue)
const notify = ref(true)
const reason = ref('')
const scope = ref('single')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    notify.value = true
    reason.value = ''
    scope.value = 'single'
  }
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

function onClosed() {
  notify.value = true
  reason.value = ''
  scope.value = 'single'
}

function onCancel() {
  visible.value = false
  emit('cancel')
}

function onConfirm() {
  visible.value = false
  emit('confirm', {
    notify: props.showNotify ? notify.value : false,
    reason: reason.value.trim(),
    pair: props.hasPair && scope.value === 'pair'
  })
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

.del-scope-group {
  display: flex;
  flex-wrap: wrap;
}
</style>
