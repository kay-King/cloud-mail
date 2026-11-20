<template>
  <div v-for="item in rows" style="background: var(--el-bg-color)">
    <div :class="'email-row ' + type ">
      <!-- 移动端头像占位（与正式行的头像位置一致，防加载完跳动）；只在窄屏触屏设备显示 -->
      <div v-if="isMobile && !finePointer" class="avatar-slot">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="circle" style="width: 40px; height: 40px;"/>
          </template>
        </el-skeleton>
      </div>
      <el-checkbox v-if="finePointer" disabled :class=" props.type === 'all-email' ? 'all-email-checkbox' : 'checkbox'"
      ></el-checkbox>
      <div class="pc-star" v-if="showStar">
        <Icon style="color: var(--el-border-color)" icon="solar:star-line-duotone" width="18" height="18"/>
      </div>
      <div v-if="!showStar"></div>
      <div class="title" :class="accountShow ? 'title-column' : 'title-column'">

        <div class="email-sender">
          <div class="email-status" v-if="showStatus">

          </div>
          <div v-else></div>
          <span class="name">
             <span>
               <el-skeleton animated>
                 <template #template>
                   <el-skeleton-item variant="text" class="name-skeleton"/>
                 </template>
               </el-skeleton>
             </span>
             <span></span>
          </span>
          <span class="phone-time">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="text" style="width: 50px;height: 1rem;"/>
              </template>
            </el-skeleton>
          </span>
        </div>
        <div>
          <div class="email-text-skeleton">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="text" class="text-skeleton-one"/>
                <el-skeleton-item variant="text" class="text-skeleton-two"/>
              </template>
            </el-skeleton>
          </div>
          <div class="user-info" v-if="showUserInfo">
            <div class="user">
              <el-skeleton animated>
                <template #template>
                  <el-skeleton-item variant="text"
                                    style="width: 180px;margin-right: 5px;height: 1rem;margin-bottom: 4px;"/>
                </template>
              </el-skeleton>
            </div>
            <div class="account">
              <el-skeleton animated>
                <template #template>
                  <el-skeleton-item variant="text"
                                    style="width: 180px;margin-right: 5px;height: 1rem;margin-bottom: 4px;"/>
                </template>
              </el-skeleton>
            </div>
            <div class="del-status" v-if="item.isDel">
              <el-tag type="danger" size="small">{{ $t('deleted') }}</el-tag>
            </div>
          </div>
        </div>
      </div>
      <div class="email-right-skeleton" :style="showUserInfo ? 'align-self: start;':''">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 60px;margin-right: 15px;height: 1rem;"/>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  rows: {
    type: Number,
    default: 1
  },
  showStar: {
    type: Boolean,
    default: true
  },
  accountShow: {
    type: Boolean,
    default: false
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: ''
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  // 与正式行同一套分流标准：头像只在“窄屏 + 触屏”时显示，复选框只在鼠标设备显示；
  // 只按宽度分流会在 1366px 笔记本等设备上与正式行不一致，加载完跳动
  finePointer: {
    type: Boolean,
    default: false
  }
})
import {Icon} from "@iconify/vue";
</script>

<style scoped lang="scss">

/* 头像槽：父组件 email-scroll 的 scoped 样式进不到子组件内部元素，骨架自己的
   对齐边距须在这里写一份（与正式行的 .avatar-slot 一致：40px 圆 + 左右边距） */
.avatar-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-self: flex-start;
  margin: 0 12px 0 15px;
}

.phone-star {
  display: none;
}

.pc-star {
  display: flex;
  width: 40px;
}

:deep(.el-skeleton__item) {
  position: relative;
  top: 2px;
}

@media (max-width: 1366px) {
  .pc-star {
    display: none;
  }
  .phone-star {
    display: block;
    align-self: end;
    padding-right: 16px;
    padding-top: 8px;
  }
  .star-pd {
    padding-top: 6px !important;
  }
}

</style>
