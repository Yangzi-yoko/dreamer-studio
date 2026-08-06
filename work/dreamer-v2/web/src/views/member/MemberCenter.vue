<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const router = useRouter();
const memberId = Number(localStorage.getItem('member_id')) || 0;
const phone = localStorage.getItem('member_phone') || '';
const points = ref(0);
const wallet = ref(0);
const packages = ref<any[]>([]);
const coupons = ref<any[]>([]);
const referralCode = ref('');

onMounted(async () => {
  try {
    const p: any = await api.memberPoints(memberId);
    points.value = p.account?.balance ?? 0;
  } catch (e: any) { ElMessage.error('积分加载失败'); }
  try {
    const w: any = await api.memberWallet(memberId);
    wallet.value = w.account?.balance ?? 0;
  } catch {}
  try {
    packages.value = (await api.myPackages(memberId)) as any[];
  } catch {}
  try {
    coupons.value = (await api.myCoupons(memberId)) as any[];
  } catch {}
  try {
    referralCode.value = (await api.referralCode(memberId)) as string;
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>会员中心</h2>
    <div>手机号：{{ phone }}</div>
    <div style="display: flex; gap: 8px; margin: 12px 0">
      <el-button style="flex: 1" @click="router.push('/member/points')">积分 {{ points }}</el-button>
      <el-button style="flex: 1" @click="router.push('/member/wallet')">储值 ¥{{ wallet }}</el-button>
    </div>
    <h3>我的次卡</h3>
    <div v-for="p in packages" :key="p.id" class="card">剩余 {{ p.remainingTimes }} 次 · {{ p.status }}</div>
    <h3>我的优惠券</h3>
    <div v-for="c in coupons" :key="c.id" class="card">券 #{{ c.couponId }} · {{ c.status }}</div>
    <h3>我的邀请码</h3>
    <div class="card">{{ referralCode }}</div>
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
