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
    const res: any = await api.items(1, 50);
    list.value = res.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>器材/服装租赁</h2>
    <div class="grid">
      <div v-for="i in list" :key="i.id" class="card" @click="router.push(`/item/${i.id}`)">
        <AppImage :src="firstImage(i.images)" :ratio="'1 / 1'" alt="商品图片" />
        <div class="card__body">
          <div class="card__name">{{ i.name }}</div>
          <div class="card__price">¥{{ i.unitPrice }}{{ i.billingType === 'day' ? '/天' : '/时段' }}</div>
          <div class="card__meta">押金 ¥{{ i.deposit }} · 库存 {{ i.stock }}</div>
        </div>
      </div>
    </div>
    <el-empty v-if="!list.length" description="暂无商品" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
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

.card__meta {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}
</style>
