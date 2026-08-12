<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const router = useRouter();
const phone = sessionStorage.getItem('member_phone') || '';
const points = ref(0);
const wallet = ref(0);
const packages = ref<any[]>([]);
const coupons = ref<any[]>([]);
const packageNames = ref<Record<number, string>>({});

onMounted(async () => {
  try {
    const p: any = await api.memberPoints();
    points.value = p.account?.balance ?? 0;
  } catch (e: any) { ElMessage.error('积分加载失败'); }
  try {
    const w: any = await api.memberWallet();
    wallet.value = w.account?.balance ?? 0;
  } catch {}
  try {
    packages.value = (await api.myPackages()) as any[];
  } catch {}
  try {
    const mall: any = await api.packageMall();
    (mall || []).forEach((c: any) => { packageNames.value[c.id] = c.name; });
  } catch {}
  try {
    coupons.value = (await api.myCoupons()) as any[];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>会员中心</h2>
    <div>手机号：{{ phone }}</div>
    <div style="display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap">
      <el-button style="flex: 1; min-width: calc(33% - 6px)" @click="router.push('/member/signin')">每日签到</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" @click="router.push('/member/points')">积分 {{ points }}</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" @click="router.push('/member/wallet')">储值 ¥{{ wallet }}</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" @click="router.push('/member/packages')">计时卡商城</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" type="primary" plain @click="router.push('/member/points-mall')">积分商城</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" @click="router.push('/member/points-orders')">我的兑换</el-button>
      <el-button style="flex: 1; min-width: calc(33% - 6px)" type="primary" plain @click="router.push('/member/referral')">邀请有礼</el-button>
    </div>
    <h3>我的计时卡</h3>
    <div v-for="p in packages" :key="p.id" class="card">
      {{ packageNames[p.packageId] || `计时卡 #${p.packageId}` }} · 剩余 {{ p.remainingHours }} 小时 · {{ p.status === 'active' ? '生效中' : p.status }}
    </div>
    <h3>我的优惠券</h3>
    <div v-for="c in coupons" :key="c.id" class="card">券 #{{ c.couponId }} · {{ c.status }}</div>
  </div>
</template>

<style scoped>
.card {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 6px;
}
</style>