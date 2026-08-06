<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);
const item = ref<any>(null);

onMounted(async () => {
  try {
    const res: any = await api.items(1, 100);
    item.value = (res.list || []).find((i: any) => i.id === id);
  } catch {}
});
</script>

<template>
  <div v-if="item" style="padding: 16px">
    <h2>{{ item.name }}</h2>
    <p>{{ item.description }}</p>
    <div>单价 ¥{{ item.unitPrice }}{{ item.billingType === 'day' ? '/天' : '/时段' }}</div>
    <div>押金 ¥{{ item.deposit }}</div>
    <el-button type="primary" style="width: 100%; margin-top: 16px" @click="router.push(`/item-rental/${item.id}`)">立即租用</el-button>
  </div>
  <el-empty v-else description="商品不存在" />
</template>
