<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import BannerCarousel from '../components/BannerCarousel.vue';
import AppImage from '../components/AppImage.vue';
import { firstImage } from '../utils/images';

const router = useRouter();
const studios = ref<any[]>([]);
const items = ref<any[]>([]);
const activities = ref<any[]>([]);

onMounted(async () => {
  try {
    const s: any = await api.studios(1, 6);
    studios.value = s.list || [];
  } catch {}
  try {
    const i: any = await api.items(1, 6);
    items.value = i.list || [];
  } catch {}
  try {
    const a: any = await api.activities(1, 3);
    activities.value = a.list || [];
  } catch {}
});

const bannerSlides = computed(() =>
  studios.value.slice(0, 5).map((s) => ({
    src: s.images ? firstImage(s.images) : '',
    title: s.name,
    subtitle: `¥${s.weekdayPrice}/时段起`,
    onClick: () => router.push(`/studio/${s.id}`),
  })),
);

</script>

<template>
  <div style="padding: 16px">
    <BannerCarousel v-if="bannerSlides.length" :slides="bannerSlides" :height="'170px'" />

    <h2 class="section-title">热门场地</h2>
    <div v-if="studios.length" class="grid">
      <div v-for="s in studios" :key="s.id" class="card" @click="router.push(`/studio/${s.id}`)">
        <AppImage :src="firstImage(s.images)" :ratio="'4 / 3'" alt="场地图片" />
        <div class="card__body">
          <div class="card__name">{{ s.name }}</div>
          <div class="card__price">¥{{ s.weekdayPrice }}/时段起</div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无场地" />

    <h2 class="section-title">器材/服装</h2>
    <div v-if="items.length" class="grid">
      <div v-for="i in items" :key="i.id" class="card" @click="router.push(`/item/${i.id}`)">
        <AppImage :src="firstImage(i.images)" :ratio="'4 / 3'" alt="商品图片" />
        <div class="card__body">
          <div class="card__name">{{ i.name }}</div>
          <div class="card__price">¥{{ i.unitPrice }}{{ i.billingType === 'day' ? '/天' : '/时段' }}</div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无商品" />

    <h2 class="section-title">热门活动</h2>
    <div v-if="activities.length">
      <div v-for="a in activities" :key="a.id" class="activity-card" @click="router.push(`/activity/${a.id}`)">
        <AppImage :src="a.image" :ratio="'16 / 7'" radius="8px" alt="活动图片" />
        <div class="activity-card__body">
          <div class="activity-card__title">{{ a.title }}</div>
          <div class="activity-card__time">{{ (a.startAt || '').slice(0, 10) }} ~ {{ (a.endAt || '').slice(0, 10) }}</div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无活动" />
  </div>
</template>

<style scoped>
.section-title {
  font-size: 18px;
  margin: 6px 0 10px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 8px;
}

.card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
}

.card__body {
  padding: 8px 10px 10px;
}

.card__name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__price {
  color: #e6a23c;
  font-size: 13px;
  margin-top: 3px;
}

.activity-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
  cursor: pointer;
  background: #fff;
}

.activity-card__body {
  padding: 10px 12px;
}

.activity-card__title {
  font-size: 15px;
  font-weight: 600;
}

.activity-card__time {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
