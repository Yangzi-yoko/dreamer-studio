<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

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
    <div v-for="i in list" :key="i.id" class="card" @click="router.push(`/item/${i.id}`)">
      <div style="font-weight: 600">{{ i.name }}</div>
      <div style="color: #e6a23c">¥{{ i.unitPrice }}{{ i.billingType === 'day' ? '/天' : '/时段' }}</div>
      <div style="color: #909399">押金 ¥{{ i.deposit }} · 库存 {{ i.stock }}</div>
    </div>
    <el-empty v-if="!list.length" description="暂无商品" />
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
