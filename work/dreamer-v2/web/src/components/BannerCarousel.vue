<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { firstImage } from '../utils/images';

interface Slide {
  src?: string | null;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

const props = withDefaults(
  defineProps<{
    slides: Slide[];
    interval?: number;
    height?: string;
  }>(),
  {
    interval: 4000,
    height: '180px',
  },
);

const current = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;
let touchStartX = 0;

const list = computed(() => props.slides || []);

function go(index: number) {
  if (!list.value.length) return;
  current.value = (index + list.value.length) % list.value.length;
}

function next() {
  go(current.value + 1);
}

function start() {
  stop();
  if (list.value.length > 1) {
    timer = setInterval(next, props.interval);
  }
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX;
  stop();
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) {
    dx < 0 ? next() : go(current.value - 1);
  }
  start();
}

function slideStyle(i: number) {
  return {
    backgroundImage: list.value[i]?.src ? `url(${firstImage(list.value[i].src)})` : '',
  };
}

onMounted(start);
onBeforeUnmount(stop);
</script>

<template>
  <div v-if="list.length" class="banner" :style="{ height }" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <div
      class="banner__track"
      :style="{ transform: `translateX(-${current * 100}%)` }"
    >
      <div v-for="(s, i) in list" :key="i" class="banner__slide" :class="`banner__slide--${(i % 3) + 1}`" :style="slideStyle(i)" @click="s.onClick">
        <div v-if="s.src" class="banner__mask" />
        <div class="banner__content">
          <div class="banner__title">{{ s.title }}</div>
          <div v-if="s.subtitle" class="banner__subtitle">{{ s.subtitle }}</div>
        </div>
      </div>
    </div>
    <div v-if="list.length > 1" class="banner__dots">
      <span
        v-for="i in list.length"
        :key="i"
        class="banner__dot"
        :class="{ 'banner__dot--active': i - 1 === current }"
        @click="go(i - 1)"
      />
    </div>
  </div>
</template>

<style scoped>
.banner {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.banner__track {
  display: flex;
  height: 100%;
  transition: transform 0.4s ease;
}

.banner__slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
}

.banner__slide--1 {
  background: linear-gradient(135deg, #4f6ef7 0%, #7c8cf8 60%, #b3c0fa 100%);
}

.banner__slide--2 {
  background: linear-gradient(135deg, #f0643a 0%, #f79e5a 100%);
}

.banner__slide--3 {
  background: linear-gradient(135deg, #19a974 0%, #4fd1a5 100%);
}

.banner__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.45) 100%);
}

.banner__content {
  position: relative;
  padding: 14px;
  color: #fff;
  width: 100%;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.banner__title {
  font-size: 18px;
  font-weight: 600;
}

.banner__subtitle {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.95;
}

.banner__dots {
  position: absolute;
  bottom: 10px;
  right: 14px;
  display: flex;
  gap: 5px;
}

.banner__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  transition: all 0.25s;
  cursor: pointer;
}

.banner__dot--active {
  background: #fff;
  width: 16px;
  border-radius: 3px;
}
</style>
