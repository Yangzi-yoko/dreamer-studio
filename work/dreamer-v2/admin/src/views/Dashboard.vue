<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as echarts from 'echarts';
import { dashboardApi } from '../api/dashboard';

const loading = ref(true);
const overview = ref<any>({
  memberTotal: 0,
  memberToday: 0,
  bookingTotal: 0,
  bookingToday: 0,
  revenueYuan: 0,
  rechargeYuan: 0,
  walletBalanceYuan: 0,
  studioCount: 0,
});
const statusCounts = ref<Record<string, number>>({});

const trendEl = ref<HTMLElement>();
const pieEl = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;

const STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  checked: '已入场',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
};

function shortDate(date: string) {
  return date.slice(5).replace('-', '/');
}

function renderTrend(memberTrend: any[], bookingTrend: any[]) {
  if (!trendEl.value) return;
  trendChart = trendChart || echarts.init(trendEl.value);
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增会员', '新增订单'] },
    grid: { left: 40, right: 16, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: memberTrend.map((p) => shortDate(p.date)),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '新增会员',
        type: 'line',
        smooth: true,
        data: memberTrend.map((p) => p.count),
        areaStyle: { opacity: 0.15 },
      },
      {
        name: '新增订单',
        type: 'bar',
        barMaxWidth: 22,
        data: bookingTrend.map((p) => p.count),
      },
    ],
  });
}

function renderStatusPie() {
  if (!pieEl.value) return;
  pieChart = pieChart || echarts.init(pieEl.value);
  const data = Object.entries(statusCounts.value).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
  }));
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['40%', '50%'],
        label: { show: false },
        data,
      },
    ],
  });
}

async function load() {
  loading.value = true;
  const res: any = await dashboardApi.stats();
  overview.value = res.overview;
  statusCounts.value = res.statusCounts;
  await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 60)),
  ]);
  renderTrend(res.memberTrend, res.bookingTrend);
  renderStatusPie();
  loading.value = false;
}

const cards = [
  { key: 'memberTotal', label: '会员总数', icon: 'User' },
  { key: 'memberToday', label: '今日新增会员', icon: 'UserFilled' },
  { key: 'bookingTotal', label: '订单总数', icon: 'Tickets' },
  { key: 'bookingToday', label: '今日订单', icon: 'Calendar' },
  { key: 'revenueYuan', label: '营业额(元)', icon: 'Money', money: true },
  { key: 'rechargeYuan', label: '充值总额(元)', icon: 'Wallet', money: true },
  { key: 'walletBalanceYuan', label: '会员余额(元)', icon: 'CreditCard', money: true },
  { key: 'studioCount', label: '营业场地', icon: 'OfficeBuilding' },
];

const onResize = () => {
  trendChart?.resize();
  pieChart?.resize();
};

onMounted(() => {
  load();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  trendChart?.dispose();
  pieChart?.dispose();
});
</script>

<template>
  <div v-loading="loading">
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.key" :xs="12" :sm="12" :md="6" :lg="3" style="margin-bottom: 16px">
        <el-card shadow="hover" style="text-align: center">
          <div class="stat-num">{{ c.money ? overview[c.key].toFixed(2) : overview[c.key] }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :md="16" style="margin-bottom: 16px">
        <el-card shadow="never">
          <template #header>近 14 天会员与订单趋势</template>
          <div ref="trendEl" style="height: 320px; width: 100%" />
        </el-card>
      </el-col>
      <el-col :md="8" style="margin-bottom: 16px">
        <el-card shadow="never">
          <template #header>订单状态分布</template>
          <div ref="pieEl" style="height: 320px; width: 100%" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat-num {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}
</style>