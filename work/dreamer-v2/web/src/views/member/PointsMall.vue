<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

const router = useRouter();
const products = ref<any[]>([]);
const balance = ref(0);

async function load() {
  try {
    products.value = (await api.pointMall()) as any[];
  } catch {}
  try {
    const p: any = await api.memberPoints();
    balance.value = p.account?.balance ?? 0;
  } catch {}
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">积分商城</h2>
      <span style="color: #e6a23c; font-size: 16px">我的积分 {{ balance }}</span>
    </div>

    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px">
      <div v-for="p in products" :key="p.id" class="p-card" @click="router.push(`/member/points-mall/${p.id}`)">
        <el-image v-if="p.cover" :src="p.cover" fit="cover" style="width: 100%; height: 110px; border-radius: 8px" />
        <div v-else style="width: 100%; height: 110px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999">暂无图片</div>
        <div style="font-weight: 600; margin-top: 6px">{{ p.name }}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px">
          <span style="color: #f56c6c; font-size: 17px">{{ p.point }} 积分</span>
          <span style="color: #909399; font-size: 12px">剩余 {{ p.stock }}</span>
        </div>
      </div>
    </div>
    <el-empty v-if="!products.length" description="暂无可兑换商品" />

    <el-button style="width: 100%; margin-top: 14px" @click="router.push('/member/points-orders')">我的兑换</el-button>
  </div>
</template>

<style scoped>
.p-card {
  width: calc(50% - 5px);
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 8px;
  box-sizing: border-box;
}
</style>