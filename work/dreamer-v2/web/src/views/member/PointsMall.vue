<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../../api';

const router = useRouter();
const products = ref<any[]>([]);
const coupons = ref<any[]>([]);
const balance = ref(0);

function couponText(c: any) {
  if (!c) return '';
  if (c.couponType === 'amount') {
    return c.couponMinSpend > 0 ? `满${c.couponMinSpend}元减${c.couponValue}元` : `${c.couponValue}元无门槛券`;
  }
  return c.couponMinSpend > 0 ? `满${c.couponMinSpend}元${(c.couponValue / 10).toFixed(1)}折` : `${(c.couponValue / 10).toFixed(1)}折券`;
}

async function load() {
  try {
    products.value = (await api.pointMall()) as any[];
  } catch {}
  try {
    coupons.value = (await api.pointCouponMall()) as any[];
  } catch {}
  try {
    const p: any = await api.memberPoints();
    balance.value = p.account?.balance ?? 0;
  } catch {}
}

async function redeem(c: any) {
  try {
    await ElMessageBox.confirm(
      `确定使用 ${c.point} 积分兑换「${c.couponName}」？兑换后发放到我的优惠券。`,
      '兑换确认',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await api.pointCouponRedeem(c.id);
    ElMessage.success('兑换成功，已发放至我的优惠券');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '兑换失败');
  }
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">积分商城</h2>
      <span style="color: #e6a23c; font-size: 16px">我的积分 {{ balance }}</span>
    </div>

    <h3 style="margin-top: 14px">优惠券兑换</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 10px">
      <div v-for="c in coupons" :key="c.id" class="p-card">
        <div style="font-weight: 600">{{ c.couponName }}</div>
        <div style="color: #e6a23c; font-size: 13px; margin-top: 4px">{{ couponText(c) }}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px">
          <span style="color: #f56c6c; font-size: 16px">{{ c.point }} 积分</span>
          <span style="color: #909399; font-size: 12px">剩余 {{ c.stock < 0 ? '不限' : c.stock }}</span>
        </div>
        <el-button type="primary" size="small" style="width: 100%; margin-top: 8px" @click="redeem(c)">立即兑换</el-button>
      </div>
    </div>
    <el-empty v-if="!coupons.length" description="暂无优惠券可兑换" style="padding: 12px 0" />

    <h3 style="margin-top: 16px">实物兑换</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 10px">
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