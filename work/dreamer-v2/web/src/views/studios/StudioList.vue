<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import AppImage from '../../components/AppImage.vue';
import { firstImage } from '../../utils/images';

const router = useRouter();
const list = ref<any[]>([]);

onMounted(async () => {
  try {
    const res: any = await api.studios(1, 50);
    list.value = res.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>场地租赁</h2>
    <div v-for="s in list" :key="s.id" class="card" @click="router.push(`/studio/${s.id}`)">
      <AppImage :src="firstImage(s.images)" :ratio="'1 / 1'" radius="8px" alt="场地图片" class="card__thumb" />
      <div class="card__info">
        <div class="card__name">{{ s.name }}</div>
        <div class="card__sub">{{ s.address }}</div>
        <div class="card__price">工作日 ¥{{ s.weekdayPrice }} / 周末 ¥{{ s.weekendPrice }} / 节假日 ¥{{ s.holidayPrice }}</div>
        <div class="card__deposit">押金 ¥{{ s.deposit }}</div>
      </div>
    </div>
    <el-empty v-if="!list.length" description="暂无场地" />
  </div>
</template>

<style scoped>
.card {
  display: flex;
  gap: 12px;
  padding: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  margin-bottom: 10px;
  background: #fff;
  cursor: pointer;
}

.card__thumb {
  width: 96px;
  flex-shrink: 0;
}

.card__info {
  flex: 1;
  min-width: 0;
}

.card__name {
  font-size: 15px;
  font-weight: 600;
}

.card__sub {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__price {
  color: #e6a23c;
  font-size: 13px;
  margin-top: 6px;
}

.card__deposit {
  color: #909399;
  font-size: 12px;
  margin-top: 3px;
}
</style>
