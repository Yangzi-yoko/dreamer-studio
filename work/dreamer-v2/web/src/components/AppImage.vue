<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    ratio?: string;
    radius?: string;
    preview?: boolean;
    previewList?: string[];
  }>(),
  {
    src: '',
    alt: '暂无图片',
    ratio: '4 / 3',
    radius: '8px',
    preview: false,
    previewList: () => [],
  },
);

const previewSrcList = computed<string[] | undefined>(() => {
  if (!props.preview) return undefined;
  if (props.previewList.length) return props.previewList;
  return props.src ? [props.src] : undefined;
});
</script>

<template>
  <div class="app-image" :style="{ aspectRatio: ratio, borderRadius: radius }">
    <el-image
      v-if="src"
      :src="src"
      fit="cover"
      lazy
      :preview-src-list="previewSrcList"
      :initial-index="0"
      preview-teleported
      class="app-image__img"
    >
      <template #error>
        <div class="app-image__fallback">
          <svg class="app-image__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span class="app-image__text">{{ alt }}</span>
        </div>
      </template>
    </el-image>
    <div v-else class="app-image__fallback">
      <svg class="app-image__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span class="app-image__text">{{ alt }}</span>
    </div>
  </div>
</template>

<style scoped>
.app-image {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f2f5 0%, #e4e7ed 100%);
  width: 100%;
}

.app-image__img {
  width: 100%;
  height: 100%;
  display: block;
}

.app-image__fallback {
  width: 100%;
  height: 100%;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #a8abb2;
}

.app-image__icon {
  width: 28px;
  height: 28px;
}

.app-image__text {
  font-size: 12px;
  color: #a8abb2;
}
</style>
