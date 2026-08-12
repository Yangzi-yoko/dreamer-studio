<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../../api';

const cards = ref<any[]>([]);
const myPackages = ref<any[]>([]);
const balance = ref(0);
const buyingId = ref<number | null>(null);

async function load() {
  try {
    cards.value = (await api.packageMall()) as any[];
  } catch {}
  try {
    const w: any = await api.memberWallet();
    balance.value = w.account?.balance ?? 0;
  } catch {}
  try {
    myPackages.value = (await api.myPackages()) as any[];
  } catch {}
}

async function buy(card: any) {
  buyingId.value = card.id;
  try {
    await ElMessageBox.confirm(
      `确定购买「${card.name}」？将从储值余额扣除 ¥${card.price}。`,
      '购买确认',
      { type: 'warning' },
    );
    await api.packageMallBuy(card.id);
    ElMessage.success('购买成功');
    await load();
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message || '购买失败');
  } finally {
    buyingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">计时卡商城</h2>
      <span style="color: #e6a23c">余额 ¥{{ balance }}</span>
    </div>

    <div v-for="c in cards" :key="c.id" class="card">
      <div style="font-weight: 600">{{ c.name }}</div>
      <div style="color: #999; margin: 6px 0">{{ c.totalHours }} 小时 · 有效期至购买时配置</div>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="color: #f56c6c; font-size: 18px">¥{{ c.price }}</span>
        <el-button type="primary" size="small" :loading="buyingId === c.id" @click="buy(c)">购买</el-button>
      </div>
    </div>
    <el-empty v-if="!cards.length" description="暂无可购计时卡" />

    <h3>我的计时卡</h3>
    <div v-for="p in myPackages" :key="p.id" class="card">
      计时卡 #{{ p.packageId }} · 剩余 {{ p.remainingHours }} 小时 · {{ p.status === 'active' ? '生效中' : p.status }}
    </div>
    <el-empty v-if="!myPackages.length" description="暂无计时卡" />
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
