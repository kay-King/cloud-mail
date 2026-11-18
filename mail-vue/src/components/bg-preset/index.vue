<template>
  <div class="bg-preset" :class="'bg-preset-' + id">
    <!-- 星空：三层视差星野 + 月亮 + 流星 -->
    <template v-if="id === 'starry'">
      <i class="stars stars-1"></i>
      <i class="stars stars-2"></i>
      <i class="stars stars-3"></i>
      <i class="moon"></i>
      <i class="meteor meteor-1"></i>
      <i class="meteor meteor-2"></i>
    </template>
    <!-- 极光：星空打底 + 四团变形光晕 -->
    <template v-else-if="id === 'aurora'">
      <i class="stars stars-aurora"></i>
      <i class="blob blob-1"></i>
      <i class="blob blob-2"></i>
      <i class="blob blob-3"></i>
      <i class="blob blob-4"></i>
    </template>
    <!-- 樱花：12 片真花瓣形花瓣飘落 -->
    <template v-else-if="id === 'sakura'">
      <i v-for="(p, i) in petals" :key="i" class="petal" :style="p"></i>
    </template>
    <!-- 流星雨：Magic UI Meteors（MIT），20 颗改 14 颗，角度改 -35° 让流星往左下坠 -->
    <template v-else-if="id === 'meteors'">
      <i class="stars stars-aurora"></i>
      <i v-for="(m, i) in muMeteors" :key="i" class="mu-meteor" :style="m"></i>
    </template>
    <!-- 光束：Magic UI Light Rays（MIT），motion 动画改纯 CSS 关键帧 -->
    <template v-else-if="id === 'rays'">
      <i class="ray-glow ray-glow-1"></i>
      <i class="ray-glow ray-glow-2"></i>
      <i v-for="(r, i) in rays" :key="i" class="ray" :style="r"></i>
    </template>
    <!-- 海洋：8 个气泡上升 + 顶部光柱 -->
    <template v-else-if="id === 'ocean'">
      <i v-for="(b, i) in bubbles" :key="i" class="bubble" :style="b"></i>
    </template>
    <!-- 晨曦 / 落日：太阳 + 三朵真云 -->
    <template v-else-if="id === 'dawn' || id === 'sunset'">
      <i class="sun"></i>
      <i class="cloud cloud-1"></i>
      <i class="cloud cloud-2"></i>
      <i class="cloud cloud-3"></i>
    </template>
    <!-- 落雪：14 片雪花飘落（经典纯 CSS 落雪做法，同樱花花瓣模式） -->
    <template v-else-if="id === 'snow'">
      <i v-for="(f, i) in flakes" :key="i" class="flake" :style="f"></i>
    </template>
    <!-- 彩晕：Aurora Blobs 浅色版，3 团粉彩光晕漂移 -->
    <template v-else-if="id === 'mesh'">
      <i class="mesh-blob mesh-blob-1"></i>
      <i class="mesh-blob mesh-blob-2"></i>
      <i class="mesh-blob mesh-blob-3"></i>
    </template>
    <!-- 海浪：CodePen "CSS wave animation"（Prachl），三层 SVG 波浪 + 飘云 -->
    <template v-else-if="id === 'waves'">
      <i class="cloud cloud-1"></i>
      <i class="cloud cloud-2"></i>
      <i class="wave-sea-base"></i>
      <div class="wave-ocean">
        <i class="wave-layer wave-layer-3"></i>
        <i class="wave-layer wave-layer-2"></i>
        <i class="wave-layer wave-layer-1"></i>
      </div>
    </template>
    <!-- 沙滩：aduok.in CSS 海滩场景，太阳 + 椭圆海浪 + 泡沫 + 湿沙 -->
    <template v-else-if="id === 'beach'">
      <i class="beach-sun"></i>
      <i class="beach-wet"></i>
      <div class="beach-sea"><i class="beach-foam"></i></div>
      <div class="beach-sea beach-sea-2"><i class="beach-foam"></i></div>
    </template>
    <!-- 热气球：经典 CSS 热气球画法（pyxofy 教程的升空+漂浮动效），三只不同配色 -->
    <template v-else-if="id === 'balloons'">
      <i class="cloud cloud-1"></i>
      <i class="cloud cloud-3"></i>
      <div v-for="(b, i) in balloons" :key="i" class="hab" :class="['hab-' + b.variant, 'hab-drift-' + b.drift]" :style="b.style">
        <div class="hab-inner">
          <i class="hab-envelope"></i>
          <i class="hab-basket"></i>
        </div>
      </div>
    </template>
    <!-- 晨光：Aurora Flux 的极光光带做法，改成浅色粉彩带（原版是深色夜空） -->
    <template v-else-if="id === 'ribbons'">
      <i class="ribbon ribbon-1"></i>
      <i class="ribbon ribbon-2"></i>
      <i class="ribbon ribbon-3"></i>
      <i class="ribbon ribbon-4"></i>
    </template>
    <template v-else-if="id === 'butterfly'">
      <div v-for="(b, i) in butterflies" :key="i" class="bfly" :class="['bfly-' + b.variant, 'bfly-drift-' + b.drift]" :style="b.style">
        <i class="bfly-body"></i>
        <i class="bfly-head"></i>
        <div class="bfly-wings">
          <i class="bfly-wing bfly-wtl"></i>
          <i class="bfly-wing bfly-wtr"></i>
          <i class="bfly-wing bfly-wbl"></i>
          <i class="bfly-wing bfly-wbr"></i>
        </div>
      </div>
      <div class="bflower bflower-1">
        <i class="bflower-core"></i>
        <i v-for="n in 8" :key="n" class="bflower-petal" :class="'bp' + n"></i>
        <i class="bflower-leaf"></i>
      </div>
      <div class="bflower bflower-2">
        <i class="bflower-core"></i>
        <i v-for="n in 8" :key="n" class="bflower-petal" :class="'bp' + n"></i>
        <i class="bflower-leaf"></i>
      </div>
    </template>
  </div>
</template>

<script setup>
// 登录背景壁纸组件：登录页全屏与设置弹窗缩略图共用。
// 尺寸一律用容器单位（cqmin/cqh/cqw），容器是组件根节点本身
// （container-type: size），所以同一套 DOM 在全屏和 64px 缩略图里
// 都会按比例缩放。需 Chrome 105+ / Safari 16+ / Firefox 110+。
// 技法来源（均已按需改写）：
//  - 星野 box-shadow 三层视差：经典纯 CSS 星空（CodePen sarazond 等）
//  - 流星渐变尾 + 亮头：Animata Shooting Stars（MIT）/ Yuemiu Meteor Loader
//  - 极光变形光晕：CodePen "Pure CSS - The Aurora"（Code The World）
//  - 樱花花瓣 border-radius: 150% 0 150% 0 花瓣形：经典樱花飘落做法
//  - 流星雨 / 光束：直接借用 Magic UI 的 Meteors / Light Rays（MIT License，
//    Copyright (c) Magic UI），只改了尺寸单位（px → 容器单位）与流星角度
//    （原版 -215° 是往右上飞，改成 -35° 往左下坠，手机竖屏上才看得全）
//  - 彩晕：Aurora Blobs（ravindranathjha.in）的浅色粉彩版，3 团模糊光晕漂移
//  - 海浪：CodePen "CSS wave animation"（Prachl），三层 SVG 波浪原样借用，
//    填充色改浅（原版深蓝 #003F7C 太沉，改成浅蓝三色）
//  - 沙滩：aduok.in《CSS-Only Beach Scene》教程，太阳 + 椭圆海浪 + 泡沫 + 湿沙
//    原样借用（棕榈树没要：缩略图里糊成一团）；第二层海浪是错峰的复刻
//  - 蝴蝶：CodePen "Butterfly"（Ritam Chakraborty），四翼扇动原样借用，
//    加了飞行轨迹（原版蝴蝶不动）与花丛（花瓣取原版 13 瓣里的 8 瓣）
//  - 热气球：经典 CSS 热气球画法（条纹球囊 + 吊篮 + 绳索），动效照
//    pyxofy《Hot Air Balloon Launch》教程的升空 + 上下漂浮 + 横向漂移
//  - 晨光：Aurora Flux（uihub.art）的极光光带，4 条模糊渐变带漂移；
//    原版是深色夜空 + screen 混合，改成浅色底 + 粉彩带（screen 在白底上无效）
defineProps({ id: { type: String, required: true } })

// 樱花花瓣：left / 大小 / 下落时长 / 延迟（负延迟让花瓣一上来就散在半空）
const petals = [
  { left: '4%', width: '4.2cqmin', height: '4.2cqmin', animationDuration: '13s', animationDelay: '-2s' },
  { left: '14%', width: '3.4cqmin', height: '3.4cqmin', animationDuration: '16s', animationDelay: '-9s' },
  { left: '23%', width: '5cqmin', height: '5cqmin', animationDuration: '11s', animationDelay: '-5s' },
  { left: '31%', width: '3.2cqmin', height: '3.2cqmin', animationDuration: '15s', animationDelay: '-12s' },
  { left: '40%', width: '4.6cqmin', height: '4.6cqmin', animationDuration: '12s', animationDelay: '-1s' },
  { left: '48%', width: '3.6cqmin', height: '3.6cqmin', animationDuration: '17s', animationDelay: '-7s' },
  { left: '57%', width: '4.9cqmin', height: '4.9cqmin', animationDuration: '12s', animationDelay: '-11s' },
  { left: '66%', width: '3.3cqmin', height: '3.3cqmin', animationDuration: '14s', animationDelay: '-4s' },
  { left: '74%', width: '4.4cqmin', height: '4.4cqmin', animationDuration: '13s', animationDelay: '-8s' },
  { left: '82%', width: '3.8cqmin', height: '3.8cqmin', animationDuration: '16s', animationDelay: '-13s' },
  { left: '90%', width: '4.7cqmin', height: '4.7cqmin', animationDuration: '11s', animationDelay: '-6s' },
  { left: '97%', width: '3.5cqmin', height: '3.5cqmin', animationDuration: '15s', animationDelay: '-3s' },
]

// 萤火虫：位置 / 大小 / 游动时长,闪烁时长 / 延迟 / 游动轨迹
// 流星雨（Magic UI Meteors 原版参数：top -5%、随机 left、时长 2–10s）：
// 14 颗，负延迟让流星雨一上来就是进行中的样子
const muMeteors = [
  { left: '6%', animationDuration: '5s', animationDelay: '-1.2s' },
  { left: '14%', animationDuration: '8s', animationDelay: '-4.5s' },
  { left: '22%', animationDuration: '3.5s', animationDelay: '-0.6s' },
  { left: '29%', animationDuration: '7s', animationDelay: '-6.1s' },
  { left: '37%', animationDuration: '4.5s', animationDelay: '-2.3s' },
  { left: '45%', animationDuration: '9s', animationDelay: '-7.8s' },
  { left: '52%', animationDuration: '3s', animationDelay: '-1.7s' },
  { left: '60%', animationDuration: '6s', animationDelay: '-3.9s' },
  { left: '68%', animationDuration: '4s', animationDelay: '-0.9s' },
  { left: '75%', animationDuration: '8.5s', animationDelay: '-5.4s' },
  { left: '83%', animationDuration: '5.5s', animationDelay: '-2.8s' },
  { left: '90%', animationDuration: '7.5s', animationDelay: '-6.7s' },
  { left: '96%', animationDuration: '4.8s', animationDelay: '-1.5s' },
  { left: '33%', animationDuration: '6.5s', animationDelay: '-8.4s' },
]

// 光束（Magic UI Light Rays 原版参数：7 道、宽 160–320px、长 70vh、
// 倾斜 -28°~28°、摇摆 0.8°~2.6°、周期 14s）：宽度改 cqw、长度改 cqh
const rays = [
  { left: '6%', '--w': '6cqw', '--r': '-5deg', '--s': '1.6deg', '--o': '0.85', animationDuration: '12s', animationDelay: '-2s' },
  { left: '17%', '--w': '7cqw', '--r': '2deg', '--s': '2.2deg', '--o': '1', animationDuration: '16s', animationDelay: '-7s' },
  { left: '28%', '--w': '5cqw', '--r': '-6deg', '--s': '1.1deg', '--o': '0.7', animationDuration: '11s', animationDelay: '-4s' },
  { left: '39%', '--w': '8cqw', '--r': '4deg', '--s': '2.5deg', '--o': '0.95', animationDuration: '18s', animationDelay: '-10s' },
  { left: '50%', '--w': '6cqw', '--r': '-2deg', '--s': '1.8deg', '--o': '0.8', animationDuration: '14s', animationDelay: '-1s' },
  { left: '61%', '--w': '7cqw', '--r': '6deg', '--s': '1.3deg', '--o': '0.9', animationDuration: '20s', animationDelay: '-13s' },
  { left: '72%', '--w': '5cqw', '--r': '-3deg', '--s': '2.1deg', '--o': '0.75', animationDuration: '13s', animationDelay: '-6s' },
]

// 雪花：left / 大小 / 下落时长 / 延迟（负延迟让雪花一上来就散在半空）
const flakes = [
  { left: '3%', width: '2.2cqmin', height: '2.2cqmin', animationDuration: '16s', animationDelay: '-2s' },
  { left: '11%', width: '3.6cqmin', height: '3.6cqmin', animationDuration: '13s', animationDelay: '-8s' },
  { left: '19%', width: '1.8cqmin', height: '1.8cqmin', animationDuration: '19s', animationDelay: '-5s' },
  { left: '27%', width: '2.8cqmin', height: '2.8cqmin', animationDuration: '15s', animationDelay: '-11s' },
  { left: '35%', width: '4cqmin', height: '4cqmin', animationDuration: '12s', animationDelay: '-1s' },
  { left: '43%', width: '2cqmin', height: '2cqmin', animationDuration: '18s', animationDelay: '-7s' },
  { left: '51%', width: '3.2cqmin', height: '3.2cqmin', animationDuration: '14s', animationDelay: '-13s' },
  { left: '59%', width: '1.6cqmin', height: '1.6cqmin', animationDuration: '20s', animationDelay: '-4s' },
  { left: '67%', width: '2.6cqmin', height: '2.6cqmin', animationDuration: '16s', animationDelay: '-9s' },
  { left: '74%', width: '3.8cqmin', height: '3.8cqmin', animationDuration: '13s', animationDelay: '-3s' },
  { left: '82%', width: '2.1cqmin', height: '2.1cqmin', animationDuration: '17s', animationDelay: '-12s' },
  { left: '89%', width: '3cqmin', height: '3cqmin', animationDuration: '14s', animationDelay: '-6s' },
  { left: '95%', width: '2.4cqmin', height: '2.4cqmin', animationDuration: '18s', animationDelay: '-10s' },
  { left: '47%', width: '1.7cqmin', height: '1.7cqmin', animationDuration: '19s', animationDelay: '-14s' },
]

// 热气球：位置 / 配色 / 漂移轨迹 / --hb 气球大小系数 / 时长 / 延迟 / 内层浮动延迟
const balloons = [
  { variant: 'red', drift: 'a', style: { left: '8%', top: '16%', '--hb': '11', '--bob-delay': '-1s', animationDuration: '38s', animationDelay: '-6s' } },
  { variant: 'blue', drift: 'b', style: { left: '50%', top: '36%', '--hb': '15', '--bob-delay': '-2.4s', animationDuration: '46s', animationDelay: '-20s' } },
  { variant: 'pink', drift: 'c', style: { left: '70%', top: '10%', '--hb': '8.5', '--bob-delay': '-0.6s', animationDuration: '33s', animationDelay: '-12s' } },
]

// 蝴蝶：位置 / 配色（blue 蓝原版、orange 橙粉）/ 飞行轨迹 / 时长 / 延迟
const butterflies = [
  { variant: 'blue', drift: 'a', style: { left: '14%', top: '20%', animationDuration: '26s', animationDelay: '-4s' } },
  { variant: 'orange', drift: 'b', style: { left: '58%', top: '42%', animationDuration: '31s', animationDelay: '-14s' } },
  { variant: 'blue', drift: 'c', style: { left: '30%', top: '62%', animationDuration: '24s', animationDelay: '-9s' } },
]

const bubbles = [
  { left: '8%', width: '4.5cqmin', height: '4.5cqmin', animationDuration: '13s', animationDelay: '-3s' },
  { left: '19%', width: '2.8cqmin', height: '2.8cqmin', animationDuration: '10s', animationDelay: '-7s' },
  { left: '30%', width: '6.5cqmin', height: '6.5cqmin', animationDuration: '16s', animationDelay: '-1s' },
  { left: '43%', width: '3.4cqmin', height: '3.4cqmin', animationDuration: '12s', animationDelay: '-9s' },
  { left: '55%', width: '5.2cqmin', height: '5.2cqmin', animationDuration: '14s', animationDelay: '-5s' },
  { left: '67%', width: '2.6cqmin', height: '2.6cqmin', animationDuration: '11s', animationDelay: '-11s' },
  { left: '78%', width: '4cqmin', height: '4cqmin', animationDuration: '15s', animationDelay: '-2s' },
  { left: '89%', width: '3.1cqmin', height: '3.1cqmin', animationDuration: '12s', animationDelay: '-8s' },
]
</script>

<style scoped>
.bg-preset {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  container-type: size;
}

.bg-preset i {
  position: absolute;
  display: block;
}

/* ---------- 星空 ---------- */
.bg-preset-starry {
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}

.stars {
  top: 0;
  left: 0;
  background: #fff;
  border-radius: 50%;
}

.stars-1 {
  width: 1px;
  height: 1px;
  box-shadow: 2.3cqmin 12.4cqmin 0 rgba(255,255,255,0.99),
    104.3cqmin 81.1cqmin 0 rgba(255,233,196,0.73),
    110.7cqmin 146.0cqmin 0 rgba(255,233,196,0.63),
    152.8cqmin 103.7cqmin 0 rgba(255,255,255,0.60),
    58.6cqmin 106.9cqmin 0 rgba(255,255,255,0.65),
    49.5cqmin 175.6cqmin 0 rgba(255,233,196,0.60),
    30.9cqmin 58.2cqmin 0 rgba(255,255,255,0.77),
    14.9cqmin 182.6cqmin 0 rgba(255,255,255,0.78),
    136.0cqmin 193.2cqmin 0 rgba(255,255,255,0.81),
    165.5cqmin 8.0cqmin 0 rgba(255,255,255,0.59),
    85.1cqmin 4.0cqmin 0 rgba(255,255,255,0.54),
    73.8cqmin 85.3cqmin 0 rgba(255,255,255,0.73),
    140.7cqmin 137.7cqmin 0 rgba(255,255,255,0.67),
    27.8cqmin 26.7cqmin 0 rgba(255,255,255,0.96),
    38.1cqmin 126.4cqmin 0 rgba(207,228,255,0.67),
    136.9cqmin 184.3cqmin 0 rgba(255,255,255,0.77),
    131.0cqmin 184.0cqmin 0 rgba(255,255,255,0.56),
    129.8cqmin 178.2cqmin 0 rgba(255,255,255,0.98),
    118.8cqmin 192.8cqmin 0 rgba(255,255,255,0.98),
    163.7cqmin 1.1cqmin 0 rgba(255,255,255,0.76),
    144.9cqmin 109.9cqmin 0 rgba(255,255,255,0.88),
    111.5cqmin 164.6cqmin 0 rgba(255,255,255,0.71),
    147.7cqmin 110.3cqmin 0 rgba(255,233,196,0.66),
    1.9cqmin 4.8cqmin 0 rgba(255,255,255,0.97),
    126.1cqmin 2.9cqmin 0 rgba(255,255,255,0.81),
    143.4cqmin 199.0cqmin 0 rgba(255,255,255,0.64),
    130.0cqmin 161.0cqmin 0 rgba(255,255,255,0.81),
    27.8cqmin 198.8cqmin 0 rgba(255,255,255,0.75),
    32.2cqmin 79.2cqmin 0 rgba(255,255,255,0.61),
    172.3cqmin 147.2cqmin 0 rgba(255,255,255,0.83),
    121.9cqmin 147.3cqmin 0 rgba(255,255,255,0.98),
    46.0cqmin 116.8cqmin 0 rgba(255,255,255,0.90),
    38.0cqmin 111.0cqmin 0 rgba(255,255,255,0.74),
    36.0cqmin 50.1cqmin 0 rgba(255,255,255,0.72),
    34.2cqmin 0.6cqmin 0 rgba(207,228,255,0.59),
    21.4cqmin 175.3cqmin 0 rgba(207,228,255,0.99),
    34.9cqmin 81.0cqmin 0 rgba(255,255,255,0.75),
    73.6cqmin 72.0cqmin 0 rgba(255,255,255,0.90),
    160.0cqmin 106.0cqmin 0 rgba(255,255,255,0.90),
    112.5cqmin 58.5cqmin 0 rgba(255,255,255,0.76),
    16.0cqmin 50.4cqmin 0 rgba(255,255,255,0.91),
    154.9cqmin 86.0cqmin 0 rgba(255,255,255,0.68),
    50.3cqmin 72.3cqmin 0 rgba(255,255,255,0.74),
    80.8cqmin 194.9cqmin 0 rgba(255,255,255,0.78),
    67.7cqmin 107.4cqmin 0 rgba(255,255,255,0.65),
    114.5cqmin 197.2cqmin 0 rgba(255,255,255,0.92),
    87.4cqmin 139.5cqmin 0 rgba(255,255,255,0.97),
    131.5cqmin 32.5cqmin 0 rgba(255,255,255,0.85),
    121.9cqmin 171.2cqmin 0 rgba(255,255,255,0.69),
    18.1cqmin 136.7cqmin 0 rgba(255,255,255,0.87);
  animation: bgPStarsTwinkle 5s ease-in-out infinite alternate;
}

.stars-2 {
  width: 2px;
  height: 2px;
  box-shadow: 86.5cqmin 89.4cqmin 0 rgba(255,255,255,0.64),
    95.3cqmin 178.4cqmin 0 rgba(255,255,255,0.94),
    88.6cqmin 155.3cqmin 0 rgba(255,255,255,0.59),
    122.7cqmin 68.0cqmin 0 rgba(255,255,255,0.55),
    41.3cqmin 110.9cqmin 0 rgba(207,228,255,0.91),
    97.7cqmin 46.2cqmin 0 rgba(255,255,255,0.77),
    19.6cqmin 133.8cqmin 0 rgba(255,255,255,0.90),
    129.8cqmin 117.8cqmin 0 rgba(255,255,255,0.59),
    76.3cqmin 62.3cqmin 0 rgba(255,255,255,0.82),
    77.7cqmin 185.5cqmin 0 rgba(255,255,255,0.79),
    62.9cqmin 173.0cqmin 0 rgba(255,255,255,0.96),
    128.1cqmin 25.6cqmin 0 rgba(207,228,255,0.74),
    20.3cqmin 144.8cqmin 0 rgba(255,255,255,0.70),
    56.0cqmin 42.9cqmin 0 rgba(255,255,255,0.83),
    7.0cqmin 4.9cqmin 0 rgba(255,233,196,0.56),
    120.4cqmin 150.4cqmin 0 rgba(255,255,255,0.64),
    42.9cqmin 180.2cqmin 0 rgba(255,255,255,0.99),
    49.1cqmin 2.0cqmin 0 rgba(255,255,255,0.54),
    164.3cqmin 144.4cqmin 0 rgba(255,255,255,0.71),
    44.9cqmin 94.0cqmin 0 rgba(255,255,255,0.89),
    75.8cqmin 32.4cqmin 0 rgba(255,255,255,0.78),
    10.6cqmin 111.4cqmin 0 rgba(255,255,255,0.95),
    83.1cqmin 146.6cqmin 0 rgba(255,233,196,0.67),
    139.4cqmin 167.0cqmin 0 rgba(255,255,255,0.79),
    92.3cqmin 9.9cqmin 0 rgba(207,228,255,0.84),
    136.0cqmin 5.6cqmin 0 rgba(255,255,255,0.85),
    53.3cqmin 102.2cqmin 0 rgba(255,233,196,0.92),
    118.5cqmin 89.2cqmin 0 rgba(255,255,255,0.73),
    182.1cqmin 3.3cqmin 0 rgba(255,255,255,0.87),
    148.2cqmin 121.5cqmin 0 rgba(255,255,255,0.90);
  animation: bgPStarsTwinkle 7s ease-in-out infinite alternate;
  animation-delay: -2s;
}

.stars-3 {
  width: 3px;
  height: 3px;
  box-shadow: 120.2cqmin 89.7cqmin 0 rgba(255,255,255,0.93),
    35.0cqmin 105.3cqmin 0 rgba(255,255,255,0.64),
    173.1cqmin 94.5cqmin 0 rgba(255,255,255,0.62),
    149.1cqmin 61.4cqmin 0 rgba(255,255,255,0.60),
    137.3cqmin 122.1cqmin 0 rgba(255,255,255,0.50),
    167.5cqmin 10.2cqmin 0 rgba(207,228,255,0.80),
    53.4cqmin 12.4cqmin 0 rgba(255,255,255,0.59),
    106.1cqmin 5.4cqmin 0 rgba(255,255,255,0.59),
    97.5cqmin 161.8cqmin 0 rgba(255,255,255,0.66),
    7.5cqmin 10.3cqmin 0 rgba(255,255,255,0.78),
    49.0cqmin 129.1cqmin 0 rgba(255,255,255,0.60),
    147.7cqmin 171.7cqmin 0 rgba(255,233,196,0.75),
    56.8cqmin 58.6cqmin 0 rgba(255,255,255,0.54),
    136.2cqmin 138.6cqmin 0 rgba(207,228,255,0.96),
    188.7cqmin 86.2cqmin 0 rgba(255,233,196,0.97),
    22.2cqmin 3.2cqmin 0 rgba(255,255,255,0.68),
    122.4cqmin 179.9cqmin 0 rgba(255,255,255,0.54),
    187.0cqmin 55.7cqmin 0 rgba(255,233,196,0.85);
  animation: bgPStarsTwinkle 9s ease-in-out infinite alternate;
  animation-delay: -5s;
}

.stars-aurora {
  width: 1px;
  height: 1px;
  box-shadow: 52.1cqmin 161.0cqmin 0 rgba(255,255,255,0.77),
    0.2cqmin 163.5cqmin 0 rgba(207,228,255,0.51),
    79.3cqmin 134.2cqmin 0 rgba(207,228,255,0.68),
    67.8cqmin 145.3cqmin 0 rgba(255,233,196,0.63),
    91.6cqmin 153.2cqmin 0 rgba(255,255,255,0.75),
    111.4cqmin 152.5cqmin 0 rgba(255,255,255,0.69),
    194.3cqmin 103.8cqmin 0 rgba(255,255,255,0.63),
    41.9cqmin 91.2cqmin 0 rgba(255,255,255,0.84),
    59.5cqmin 48.4cqmin 0 rgba(255,255,255,0.85),
    180.6cqmin 38.5cqmin 0 rgba(255,255,255,0.91),
    121.1cqmin 140.3cqmin 0 rgba(255,255,255,0.88),
    118.5cqmin 153.7cqmin 0 rgba(255,233,196,0.73),
    4.2cqmin 129.3cqmin 0 rgba(255,255,255,1.00),
    59.3cqmin 144.4cqmin 0 rgba(255,255,255,0.91),
    139.9cqmin 50.9cqmin 0 rgba(255,255,255,0.87),
    153.6cqmin 29.9cqmin 0 rgba(207,228,255,0.87),
    55.1cqmin 126.2cqmin 0 rgba(255,255,255,0.69),
    169.7cqmin 13.4cqmin 0 rgba(207,228,255,0.89),
    113.2cqmin 111.5cqmin 0 rgba(207,228,255,0.86),
    199.7cqmin 166.4cqmin 0 rgba(255,255,255,0.59);
  animation: bgPStarsTwinkle 6s ease-in-out infinite alternate;
}

@keyframes bgPStarsTwinkle {
  from { opacity: 0.35; }
  to { opacity: 1; }
}

.moon {
  left: 16%;
  top: 13%;
  width: 15cqmin;
  height: 15cqmin;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fffdf0, #f7ecc0 55%, #e8d48f);
  box-shadow: 0 0 6cqmin 2cqmin rgba(255, 244, 190, 0.35);
}

.moon::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle 1.6cqmin at 38% 42%, rgba(190, 170, 110, 0.5), transparent 70%),
    radial-gradient(circle 1.1cqmin at 62% 60%, rgba(190, 170, 110, 0.45), transparent 70%),
    radial-gradient(circle 0.9cqmin at 55% 30%, rgba(190, 170, 110, 0.4), transparent 70%);
}

.meteor {
  height: 2px;
  width: 26cqmin;
  border-radius: 999px;
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0.7) 30%, transparent);
  opacity: 0;
  animation: bgPMeteor linear infinite;
}

.meteor-1 {
  left: 62%;
  top: 12%;
  animation-duration: 7s;
}

.meteor-2 {
  left: 45%;
  top: 26%;
  animation-duration: 11s;
  animation-delay: -4s;
}

.meteor::before {
  content: "";
  position: absolute;
  left: -2px;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.8);
}

@keyframes bgPMeteor {
  0% { transform: rotate(-32deg) translate(0, 0); opacity: 0; }
  3% { opacity: 1; }
  14% { transform: rotate(-32deg) translate(-55cqmin, 0); opacity: 0; }
  100% { transform: rotate(-32deg) translate(-55cqmin, 0); opacity: 0; }
}

/* ---------- 极光 ---------- */
.bg-preset-aurora {
  background: linear-gradient(180deg, #02040a 0%, #050b14 45%, #08151f 75%, #0a1a24 100%);
}

.blob {
  border-radius: 50%;
  filter: blur(9cqmin);
  opacity: 0.55;
  mix-blend-mode: screen;
}

.blob-1 {
  left: -10%;
  top: -18%;
  width: 95cqmin;
  height: 70cqmin;
  background: #2ecc71;
  animation: bgPAuroraBorder 6s ease-in-out infinite, bgPAuroraDrift1 12s ease-in-out infinite alternate;
}

.blob-2 {
  left: 30%;
  top: -10%;
  width: 80cqmin;
  height: 60cqmin;
  background: #00c2ff;
  animation: bgPAuroraBorder 7s ease-in-out infinite, bgPAuroraDrift2 16s ease-in-out infinite alternate;
  animation-delay: 0s, -6s;
}

.blob-3 {
  left: 55%;
  top: 8%;
  width: 70cqmin;
  height: 55cqmin;
  background: #8b5cf6;
  animation: bgPAuroraBorder 8s ease-in-out infinite, bgPAuroraDrift3 20s ease-in-out infinite alternate;
  animation-delay: 0s, -11s;
}

.blob-4 {
  left: 5%;
  top: 30%;
  width: 85cqmin;
  height: 50cqmin;
  background: #ff5fa2;
  opacity: 0.4;
  animation: bgPAuroraBorder 9s ease-in-out infinite, bgPAuroraDrift4 24s ease-in-out infinite alternate;
  animation-delay: 0s, -15s;
}

@keyframes bgPAuroraBorder {
  0%, 100% { border-radius: 58% 42% 57% 43% / 45% 45% 55% 55%; }
  33% { border-radius: 70% 30% 46% 54% / 30% 29% 71% 70%; }
  66% { border-radius: 100% 0% 100% 0% / 100% 100% 0% 0%; }
}

@keyframes bgPAuroraDrift1 {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(8cqmin, 5cqmin) scale(1.15); }
}

@keyframes bgPAuroraDrift2 {
  from { transform: translate(0, 0) rotate(0deg); }
  to { transform: translate(-6cqmin, 7cqmin) rotate(8deg); }
}

@keyframes bgPAuroraDrift3 {
  from { transform: translate(0, 0) scale(1.1); }
  to { transform: translate(-9cqmin, -4cqmin) scale(0.95); }
}

@keyframes bgPAuroraDrift4 {
  from { transform: translate(0, 0); }
  to { transform: translate(10cqmin, -6cqmin); }
}

/* ---------- 樱花 ---------- */
.bg-preset-sakura {
  background: linear-gradient(180deg, #fff0f3 0%, #ffd9e2 55%, #ffc2cf 100%);
}

.petal {
  top: 0;
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #ffd0da, #ff9ebb 70%);
  box-shadow: 0 0 1cqmin rgba(255, 120, 150, 0.25);
  animation: bgPPetalFall linear infinite;
}

@keyframes bgPPetalFall {
  0% { transform: translate(0, -12cqh) rotate(0deg); opacity: 0; }
  8% { opacity: 1; }
  25% { transform: translate(3cqmin, 25cqh) rotate(90deg); }
  50% { transform: translate(-3cqmin, 55cqh) rotate(180deg); }
  75% { transform: translate(2cqmin, 82cqh) rotate(270deg); opacity: 1; }
  100% { transform: translate(0, 112cqh) rotate(360deg); opacity: 0; }
}

/* ---------- 海洋 ---------- */
.bg-preset-ocean {
  background: linear-gradient(180deg, #2b8fd4 0%, #1468a8 50%, #0a4a78 100%);
}

.bg-preset-ocean::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.1) 42%, transparent 55%),
    linear-gradient(115deg, transparent 55%, rgba(255, 255, 255, 0.08) 66%, transparent 78%);
  animation: bgPOceanRays 18s ease-in-out infinite alternate;
}

@keyframes bgPOceanRays {
  from { transform: translateX(-3cqmin); opacity: 0.8; }
  to { transform: translateX(3cqmin); opacity: 1; }
}

.bubble {
  bottom: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.08) 45%, transparent 62%);
  animation: bgPBubbleRise linear infinite;
}

@keyframes bgPBubbleRise {
  0% { transform: translate(0, 12cqh); opacity: 0; }
  10% { opacity: 0.9; }
  25% { transform: translate(2cqmin, -25cqh); }
  50% { transform: translate(-2cqmin, -55cqh); }
  75% { transform: translate(1.5cqmin, -82cqh); opacity: 0.9; }
  100% { transform: translate(0, -112cqh); opacity: 0; }
}

/* ---------- 晨曦 / 落日 ---------- */
.bg-preset-dawn {
  background: linear-gradient(180deg, #a8dcff 0%, #d6efff 45%, #fff6d6 100%);
}

.bg-preset-sunset {
  background: linear-gradient(180deg, #ff9d7a 0%, #ffb37e 40%, #ffd194 70%, #ffe9c4 100%);
}

.sun {
  left: 16%;
  top: 58%;
  width: 19cqmin;
  height: 19cqmin;
  border-radius: 50%;
  animation: bgPSunFloat 14s ease-in-out infinite alternate;
}

.bg-preset-dawn .sun {
  background: radial-gradient(circle, #fffbe0 0%, #ffe9a3 45%, rgba(255, 233, 163, 0) 72%);
  box-shadow: 0 0 8cqmin 3cqmin rgba(255, 230, 150, 0.45);
}

.bg-preset-sunset .sun {
  background: radial-gradient(circle, #fff3b0 0%, #ff9e5e 50%, rgba(255, 158, 94, 0) 72%);
  box-shadow: 0 0 9cqmin 3cqmin rgba(255, 150, 80, 0.5);
}

@keyframes bgPSunFloat {
  from { transform: translateY(2.5cqmin) scale(1); }
  to { transform: translateY(-2.5cqmin) scale(1.06); }
}

.cloud {
  height: 7cqmin;
  border-radius: 999px;
  animation: bgPCloudDrift linear infinite;
}

.cloud::before,
.cloud::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: inherit;
}

.cloud::before {
  width: 45%;
  height: 160%;
  top: -90%;
  left: 18%;
}

.cloud::after {
  width: 32%;
  height: 120%;
  top: -60%;
  right: 16%;
}

.bg-preset-dawn .cloud {
  background: rgba(255, 255, 255, 0.92);
}

.bg-preset-sunset .cloud {
  background: rgba(255, 224, 192, 0.92);
}

.bg-preset-sunset .cloud {
  animation-direction: reverse;
}

.cloud-1 {
  top: 16%;
  width: 30cqmin;
  animation-duration: 38s;
}

.cloud-2 {
  top: 34%;
  width: 22cqmin;
  animation-duration: 28s;
  animation-delay: -14s;
}

.cloud-3 {
  top: 8%;
  width: 18cqmin;
  animation-duration: 48s;
  animation-delay: -30s;
}

@keyframes bgPCloudDrift {
  from { transform: translateX(-35cqmin); }
  to { transform: translateX(115cqw); }
}

/* ---------- 流星雨（Magic UI Meteors，MIT） ---------- */
.bg-preset-meteors {
  background: linear-gradient(180deg, #050816 0%, #0a0f24 60%, #101736 100%);
}

/* 流星头：2px 亮点 + 拖尾（原版：size-0.5 圆点 + w-12.5 渐变尾，rotate --angle） */
.mu-meteor {
  top: -5%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #e4e4e7;
  box-shadow: 0 0 6px 1px rgba(255, 255, 255, 0.7);
  animation: bgPMuMeteor linear infinite;
}

.mu-meteor::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 12cqmin;
  height: 1px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, rgba(228, 228, 231, 0.9), transparent);
}

/* 原版关键帧：rotate(var(--angle)) translateX(0 → -500px)，70% 前不透明；
   角度改 -35°（原版 -215° 是往右上飞），位移改容器单位 */
@keyframes bgPMuMeteor {
  0% { transform: rotate(-35deg) translateX(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: rotate(-35deg) translateX(-130cqmin); opacity: 0; }
}

/* ---------- 光束（Magic UI Light Rays，MIT） ---------- */
.bg-preset-rays {
  background: linear-gradient(180deg, #04070f 0%, #0a1628 55%, #0d1f3c 100%);
}

.ray-glow {
  inset: 0;
  opacity: 0.35;
}

.ray-glow-1 {
  background: radial-gradient(circle at 20% 15%, rgba(160, 210, 255, 0.35), transparent 70%);
}

.ray-glow-2 {
  background: radial-gradient(circle at 80% 10%, rgba(160, 210, 255, 0.28), transparent 75%);
}

/* 原版：顶部 -12% 出发、长 70vh、圆角、蓝白渐变、screen 混合、36px 模糊；
   motion 的 opacity/rotate 动画改成纯 CSS 关键帧，变量按每道光束取值 */
.ray {
  top: -12%;
  height: 70cqh;
  width: var(--w);
  transform-origin: top;
  border-radius: 999px;
  background: linear-gradient(to bottom, rgba(160, 210, 255, 0.65), transparent);
  mix-blend-mode: screen;
  filter: blur(1cqmin);
  opacity: 0;
  animation: bgPRay ease-in-out infinite;
}

@keyframes bgPRay {
  0% { opacity: calc(var(--o) * 0.35); transform: translateX(-50%) rotate(calc(var(--r) - var(--s))); }
  50% { opacity: var(--o); transform: translateX(-50%) rotate(calc(var(--r) + var(--s))); }
  100% { opacity: calc(var(--o) * 0.35); transform: translateX(-50%) rotate(calc(var(--r) - var(--s))); }
}

/* ---------- 落雪 ---------- */
.bg-preset-snow {
  background: linear-gradient(180deg, #0f1f38 0%, #1b324f 55%, #274468 100%);
}

.flake {
  top: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.55) 55%, rgba(255, 255, 255, 0) 72%);
  box-shadow: 0 0 1.5cqmin rgba(255, 255, 255, 0.35);
  animation: bgPSnowFall linear infinite;
}

@keyframes bgPSnowFall {
  0% { transform: translate(0, -12cqh); opacity: 0; }
  8% { opacity: 1; }
  25% { transform: translate(2cqmin, 25cqh); }
  50% { transform: translate(-2cqmin, 55cqh); }
  75% { transform: translate(1.5cqmin, 82cqh); opacity: 1; }
  100% { transform: translate(0, 112cqh); opacity: 0; }
}

/* ---------- 彩晕（Aurora Blobs 浅色版） ---------- */
.bg-preset-mesh {
  background: linear-gradient(180deg, #fdfbff 0%, #f4f0ff 55%, #eef4ff 100%);
}

.mesh-blob {
  border-radius: 50%;
  filter: blur(12cqmin);
  opacity: 0.6;
}

.mesh-blob-1 {
  left: -12%;
  top: -8%;
  width: 90cqmin;
  height: 70cqmin;
  background: #ffb3c8;
  animation: bgPMeshDrift1 18s ease-in-out infinite alternate;
}

.mesh-blob-2 {
  left: 38%;
  top: 22%;
  width: 80cqmin;
  height: 62cqmin;
  background: #a8c8ff;
  animation: bgPMeshDrift2 18s ease-in-out infinite alternate;
  animation-delay: -6s;
}

.mesh-blob-3 {
  left: 8%;
  top: 52%;
  width: 75cqmin;
  height: 58cqmin;
  background: #a8e6cf;
  animation: bgPMeshDrift3 18s ease-in-out infinite alternate;
  animation-delay: -12s;
}

@keyframes bgPMeshDrift1 {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(10cqmin, 8cqmin) scale(1.12); }
}

@keyframes bgPMeshDrift2 {
  from { transform: translate(0, 0) scale(1.08); }
  to { transform: translate(-9cqmin, -6cqmin) scale(0.96); }
}

@keyframes bgPMeshDrift3 {
  from { transform: translate(0, 0); }
  to { transform: translate(8cqmin, -9cqmin) scale(1.1); }
}

/* ---------- 海浪（CodePen Prachl "CSS wave animation"，波形与动效原样，填色改浅） ---------- */
.bg-preset-waves {
  background: linear-gradient(180deg, #a5dcf7 0%, #cdecff 38%, #e6f7ff 62%, #dff3ff 100%);
}

.bg-preset-waves .cloud {
  background: rgba(255, 255, 255, 0.92);
}

.wave-sea-base {
  left: 0;
  right: 0;
  bottom: 0;
  height: 38cqh;
  background: linear-gradient(180deg, #7ec8e3 0%, #4aa8d8 55%, #2f8fc4 100%);
}

.wave-ocean {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 34cqh;
  height: 14cqh;
  overflow-x: hidden;
}

.wave-layer {
  position: absolute;
  width: 200%;
  height: 100%;
  background-repeat: repeat-x;
  background-size: 50% 100%;
  transform: translate3d(0, 0, 0);
}

/* 波形 SVG 与原版同一条路径，只改了 fill 颜色（原版深蓝 #003F7C） */
.wave-layer-1 {
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%238fd3f4'/%3E%3C/svg%3E");
  animation: bgPWave 10s -3s linear infinite;
  opacity: 0.8;
}

.wave-layer-2 {
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%236ec1e8'/%3E%3C/svg%3E");
  animation: bgPWave 18s linear reverse infinite;
  opacity: 0.55;
}

.wave-layer-3 {
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%23a8e3ff'/%3E%3C/svg%3E");
  animation: bgPWave 20s -1s linear infinite;
  opacity: 0.5;
}

@keyframes bgPWave {
  0% { transform: translateX(0); }
  50% { transform: translateX(-25%); }
  100% { transform: translateX(-50%); }
}

/* ---------- 沙滩（aduok.in CSS 海滩场景，太阳 + 椭圆海浪 + 泡沫 + 湿沙） ---------- */
.bg-preset-beach {
  background: linear-gradient(180deg, #8fd8ff 0%, #c8ecff 36%, #fdf1d7 36%, #f6dfa0 100%);
}

.beach-sun {
  left: 14%;
  top: 9%;
  width: 20cqmin;
  height: 20cqmin;
  border-radius: 50%;
  background: radial-gradient(circle, #fff8dd 0%, #ffe89a 45%, rgba(255, 232, 154, 0.15) 75%, rgba(255, 232, 154, 0) 100%);
  animation: bgPBeachSun 6s ease-in-out infinite;
}

@keyframes bgPBeachSun {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.06); opacity: 1; }
}

.beach-wet {
  left: -50%;
  top: 40%;
  width: 200%;
  height: 37.5%;
  border-radius: 0 0 50% 50%;
  background: #ecc075;
  box-shadow: 0 2.5cqmin 2.5cqmin 0 #ecc075;
  animation: bgPBeachWet 10s ease-in-out infinite;
}

@keyframes bgPBeachWet {
  0% { opacity: 0.2; }
  34% { opacity: 0.2; }
  35% { opacity: 0.7; }
  100% { opacity: 0.2; }
}

.beach-sea {
  position: absolute;
  left: -50%;
  top: 40%;
  width: 200%;
  height: 30%;
  border-radius: 0 0 50% 50%;
  background: linear-gradient(to bottom, rgba(8, 122, 193, 1) 0%, rgba(18, 156, 192, 1) 25%, rgba(42, 212, 229, 1) 50%, rgba(150, 233, 239, 1) 75%, rgba(253, 241, 215, 1) 100%);
  animation: bgPBeachWave 10s ease-in-out infinite;
  transform-origin: 50% 0;
  overflow: hidden;
}

.beach-sea-2 {
  top: 33%;
  height: 22%;
  opacity: 0.85;
  animation-delay: -5s;
}

.beach-sea-2 .beach-foam {
  animation-delay: -5s;
}

@keyframes bgPBeachWave {
  0% { transform: scaleY(1); }
  35% { transform: scaleY(1.3); }
  69% { transform: scaleY(1); }
  100% { transform: scaleY(1); }
}

.beach-foam {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, transparent 0%, transparent 90%, white 100%);
  animation: bgPBeachFoam 10s ease-in-out infinite;
}

@keyframes bgPBeachFoam {
  0% { opacity: 0; }
  30% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 0; }
}

/* ---------- 蝴蝶（CodePen Ritam Chakraborty "Butterfly"，四翼扇动 + 花丛） ---------- */
.bg-preset-butterfly {
  background: linear-gradient(180deg, #dff8d2 0%, #e9fcd9 45%, #d2f2bd 100%);
}

.bfly {
  position: absolute;
  width: 18cqmin;
  height: 18cqmin;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.bfly-drift-a { animation-name: bgPBflyDriftA; }
.bfly-drift-b { animation-name: bgPBflyDriftB; }
.bfly-drift-c { animation-name: bgPBflyDriftC; }

@keyframes bgPBflyDriftA {
  0% { transform: translate(0, 0) rotate(-8deg); }
  30% { transform: translate(7cqmin, -9cqmin) rotate(5deg); }
  60% { transform: translate(-4cqmin, -16cqmin) rotate(-3deg); }
  100% { transform: translate(3cqmin, -5cqmin) rotate(7deg); }
}

@keyframes bgPBflyDriftB {
  0% { transform: translate(0, 0) rotate(6deg); }
  35% { transform: translate(-8cqmin, 6cqmin) rotate(-6deg); }
  70% { transform: translate(-14cqmin, -7cqmin) rotate(3deg); }
  100% { transform: translate(-5cqmin, -12cqmin) rotate(-8deg); }
}

@keyframes bgPBflyDriftC {
  0% { transform: translate(0, 0) rotate(-4deg); }
  25% { transform: translate(5cqmin, 8cqmin) rotate(8deg); }
  55% { transform: translate(12cqmin, -3cqmin) rotate(-5deg); }
  100% { transform: translate(6cqmin, -10cqmin) rotate(4deg); }
}

.bfly-body {
  left: 50%;
  top: 50%;
  width: 1.6cqmin;
  height: 7cqmin;
  background: #292727;
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.bfly-head {
  left: 58%;
  top: 33%;
  width: 2cqmin;
  height: 2cqmin;
  background: #272525;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.bfly-wings {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12cqmin;
  height: 12cqmin;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.bfly-wing {
  position: absolute;
  width: 6cqmin;
  height: 6cqmin;
  perspective: 1000px;
  transform-style: preserve-3d;
}

.bfly-wtl {
  top: 0.9cqmin;
  left: -0.3cqmin;
  border-radius: 25% 100% 0 50%;
  background: linear-gradient(-90deg, rgb(0, 40, 238) 0%, rgba(175, 179, 198, 1) 42%, rgba(149, 158, 170, 1) 68%, rgba(3, 25, 80, 1) 96%);
  transform-origin: bottom right;
  transform: rotate(-15deg);
  animation: bgPBflyFlapTL 500ms forwards alternate infinite;
  box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3);
}

@keyframes bgPBflyFlapTL {
  from { box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3); transform: rotate(-15deg); }
  to { box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0); transform: rotate(-15deg) rotateY(60deg); }
}

.bfly-wtr {
  top: 0.9cqmin;
  left: 6.3cqmin;
  border-radius: 100% 25% 50% 0;
  background: linear-gradient(90deg, rgb(0, 40, 238) 0%, rgba(175, 179, 198, 1) 42%, rgba(149, 158, 170, 1) 68%, rgba(3, 25, 80, 1) 96%);
  transform-origin: bottom left;
  transform: rotate(15deg);
  animation: bgPBflyFlapTR 500ms forwards alternate infinite;
  box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3);
}

@keyframes bgPBflyFlapTR {
  from { box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3); transform: rotate(15deg); }
  to { box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0); transform: rotate(15deg) rotateY(60deg); }
}

.bfly-wbl {
  top: 6.9cqmin;
  left: -0.36cqmin;
  border-radius: 90% 0 70% 50%;
  background: linear-gradient(225deg, rgb(29, 59, 207) 0%, rgba(175, 179, 198, 1) 42%, rgba(149, 158, 170, 1) 68%, rgba(3, 25, 80, 1) 96%);
  transform-origin: top right;
  transform: rotate(7deg);
  animation: bgPBflyFlapBL 500ms forwards alternate infinite cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3);
}

@keyframes bgPBflyFlapBL {
  from { box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3); transform: rotate(7deg); }
  to { box-shadow: -1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0); transform: rotate(7deg) rotateY(55deg); }
}

.bfly-wbr {
  top: 6.9cqmin;
  left: 6.3cqmin;
  border-radius: 0 90% 50% 70%;
  background: linear-gradient(135deg, rgb(29, 59, 207) 0%, rgba(175, 179, 198, 1) 42%, rgba(149, 158, 170, 1) 68%, rgba(3, 25, 80, 1) 96%);
  transform-origin: top left;
  transform: rotate(-7deg);
  animation: bgPBflyFlapBR 500ms forwards alternate infinite cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3);
}

@keyframes bgPBflyFlapBR {
  from { box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0.3); transform: rotate(-7deg); }
  to { box-shadow: 1.2cqmin 1.2cqmin 2.5cqmin rgba(0, 0, 0, 0); transform: rotate(-7deg) rotateY(55deg); }
}

/* 橙粉配色：只换翅膀渐变，扇动关键帧共用 */
.bfly-orange .bfly-wtl { background: linear-gradient(-90deg, #ff7b39 0%, #ffd6a5 42%, #ffb4a2 68%, #c9184a 96%); }
.bfly-orange .bfly-wtr { background: linear-gradient(90deg, #ff7b39 0%, #ffd6a5 42%, #ffb4a2 68%, #c9184a 96%); }
.bfly-orange .bfly-wbl { background: linear-gradient(225deg, #ff5d8f 0%, #ffd6a5 42%, #ffb4a2 68%, #c9184a 96%); }
.bfly-orange .bfly-wbr { background: linear-gradient(135deg, #ff5d8f 0%, #ffd6a5 42%, #ffb4a2 68%, #c9184a 96%); }

.bflower {
  position: absolute;
  width: 16cqmin;
  height: 16cqmin;
}

.bflower-1 {
  left: 5%;
  bottom: 5%;
}

.bflower-2 {
  right: 7%;
  bottom: 11%;
  width: 13cqmin;
  height: 13cqmin;
}

.bflower-core {
  left: 48%;
  top: 50%;
  width: 32%;
  height: 32%;
  background: #ffd93b;
  border-radius: 50%;
  transform: translate(-48%, -40%);
  z-index: 2;
}

.bflower-petal {
  left: 50%;
  top: 50%;
  width: 15%;
  height: 45%;
  background: #f472b6;
  border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
  transform-origin: bottom center;
}

.bflower-2 .bflower-petal {
  background: #fb7185;
}

.bp1 { transform: translate(-50%, -90%) rotate(-20deg); }
.bp2 { transform: translate(-50%, -90%) rotate(30deg); }
.bp3 { transform: translate(-65%, -90%) rotate(70deg); }
.bp4 { transform: translate(-50%, -100%) rotate(100deg); }
.bp5 { transform: translate(-75%, -89%) rotate(115deg); }
.bp6 { transform: translate(-70%, -95%) rotate(185deg); }
.bp7 { transform: translate(-60%, -104%) rotate(212deg); }
.bp8 { transform: translate(-60%, -102%) rotate(271deg); }

.bflower-leaf {
  left: 72%;
  top: 88%;
  width: 5cqmin;
  height: 4.5cqmin;
  background: #1da851;
  border-radius: 0 100px 0 100px;
  transform: translate(-50%, -50%) rotate(30deg);
}

/* ---------- 热气球（经典 CSS 热气球 + pyxofy 升空漂浮动效） ---------- */
.bg-preset-balloons {
  background: linear-gradient(180deg, #a8dcf7 0%, #cdecff 45%, #e8f7ff 100%);
}

.bg-preset-balloons .cloud {
  background: rgba(255, 255, 255, 0.92);
}

.hab {
  position: absolute;
  width: calc(var(--hb) * 1.6cqmin);
  height: calc(var(--hb) * 2.8cqmin);
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.hab-drift-a { animation-name: bgPHabDriftA; }
.hab-drift-b { animation-name: bgPHabDriftB; }
.hab-drift-c { animation-name: bgPHabDriftC; }

@keyframes bgPHabDriftA {
  0% { transform: translate(0, 0) rotate(-2deg); }
  50% { transform: translate(4cqmin, -6cqmin) rotate(2deg); }
  100% { transform: translate(-3cqmin, -12cqmin) rotate(-1deg); }
}

@keyframes bgPHabDriftB {
  0% { transform: translate(0, 0) rotate(2deg); }
  50% { transform: translate(-6cqmin, -4cqmin) rotate(-3deg); }
  100% { transform: translate(2cqmin, -10cqmin) rotate(1deg); }
}

@keyframes bgPHabDriftC {
  0% { transform: translate(0, 0) rotate(-1deg); }
  50% { transform: translate(3cqmin, -8cqmin) rotate(3deg); }
  100% { transform: translate(6cqmin, -3cqmin) rotate(-2deg); }
}

.hab-inner {
  position: absolute;
  inset: 0;
  animation: bgPHabBob 3.6s ease-in-out infinite alternate;
  animation-delay: var(--bob-delay, 0s);
}

@keyframes bgPHabBob {
  from { transform: translateY(0); }
  to { transform: translateY(-1.6cqmin); }
}

.hab-envelope {
  left: 50%;
  top: 0;
  width: calc(var(--hb) * 1.6cqmin);
  height: calc(var(--hb) * 1.9cqmin);
  border-radius: 50% 50% 50% 50% / 55% 55% 45% 45%;
  transform: translateX(-50%);
}

.hab-red .hab-envelope {
  background: repeating-linear-gradient(90deg, #ff6b6b 0 calc(var(--hb) * 0.32cqmin), #fff5f0 calc(var(--hb) * 0.32cqmin) calc(var(--hb) * 0.64cqmin));
}

.hab-blue .hab-envelope {
  background: repeating-linear-gradient(90deg, #4dabf7 0 calc(var(--hb) * 0.32cqmin), #fffbe0 calc(var(--hb) * 0.32cqmin) calc(var(--hb) * 0.64cqmin));
}

.hab-pink .hab-envelope {
  background: repeating-linear-gradient(90deg, #f783ac 0 calc(var(--hb) * 0.32cqmin), #f3e8ff calc(var(--hb) * 0.32cqmin) calc(var(--hb) * 0.64cqmin));
}

/* 球囊高光 + 底部收口 */
.hab-envelope::before {
  content: "";
  position: absolute;
  left: 16%;
  top: 10%;
  width: 30%;
  height: 26%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: rotate(-20deg);
}

.hab-envelope::after {
  content: "";
  position: absolute;
  left: 35%;
  bottom: -5%;
  width: 30%;
  height: 8%;
  background: inherit;
  clip-path: polygon(15% 0, 85% 0, 100% 100%, 0 100%);
}

.hab-basket {
  left: 50%;
  top: calc(var(--hb) * 2.3cqmin);
  width: calc(var(--hb) * 0.5cqmin);
  height: calc(var(--hb) * 0.38cqmin);
  background: #a67c52;
  border-radius: 0.8cqmin;
  transform: translateX(-50%);
}

/* 吊绳：两条斜线连球囊与吊篮 */
.hab-basket::before,
.hab-basket::after {
  content: "";
  position: absolute;
  top: calc(var(--hb) * -0.42cqmin);
  width: 0.3cqmin;
  height: calc(var(--hb) * 0.42cqmin);
  background: #8a6d4b;
  transform-origin: bottom center;
}

.hab-basket::before {
  left: 12%;
  transform: rotate(10deg);
}

.hab-basket::after {
  right: 12%;
  transform: rotate(-10deg);
}

/* ---------- 晨光（Aurora Flux 极光光带，浅色粉彩版） ---------- */
.bg-preset-ribbons {
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 55%, #e6f2ff 100%);
}

.ribbon {
  position: absolute;
  border-radius: 9999px;
  filter: blur(9cqmin);
  will-change: transform;
}

.ribbon-1 {
  top: -10%;
  left: -30%;
  width: 160cqw;
  height: 34cqmin;
  opacity: 0.65;
  background: linear-gradient(100deg, transparent 5%, #ffb3d9 40%, #a8d8ff 70%, transparent 95%);
  animation: bgPRibbonDrift1 26s ease-in-out infinite alternate;
}

.ribbon-2 {
  top: 12%;
  right: -35%;
  width: 150cqw;
  height: 28cqmin;
  opacity: 0.55;
  background: linear-gradient(80deg, transparent 5%, #a8e6cf 45%, #d8b4fe 75%, transparent 95%);
  animation: bgPRibbonDrift2 32s ease-in-out infinite alternate;
  animation-delay: -8s;
}

.ribbon-3 {
  bottom: -14%;
  left: -20%;
  width: 170cqw;
  height: 30cqmin;
  opacity: 0.5;
  background: linear-gradient(120deg, transparent 0%, #ffd6a5 35%, #ffb3d9 60%, transparent 100%);
  animation: bgPRibbonDrift3 38s ease-in-out infinite alternate;
  animation-delay: -15s;
}

.ribbon-4 {
  top: 42%;
  left: 5%;
  width: 110cqw;
  height: 20cqmin;
  opacity: 0.45;
  background: linear-gradient(90deg, transparent 10%, #a8d8ff 50%, transparent 90%);
  animation: bgPRibbonDrift2 44s ease-in-out infinite alternate-reverse;
  animation-delay: -20s;
}

@keyframes bgPRibbonDrift1 {
  from { transform: translate(0, 0) rotate(-2deg) scale(1); }
  to { transform: translate(6cqw, 3cqmin) rotate(3deg) scale(1.08); }
}

@keyframes bgPRibbonDrift2 {
  from { transform: translate(0, 0) rotate(2deg); }
  to { transform: translate(-5cqw, -2cqmin) rotate(-3deg) scale(1.05); }
}

@keyframes bgPRibbonDrift3 {
  from { transform: translate(0, 0) skewX(0deg); }
  to { transform: translate(4cqw, -4cqmin) skewX(-4deg); }
}
</style>
