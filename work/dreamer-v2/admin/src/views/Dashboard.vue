<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as echarts from 'echarts';
import { User, Message, ShoppingCart, ShoppingBag } from '@element-plus/icons-vue';
import { dashboardApi } from '../api/dashboard';

const ICONS: Record<string, any> = { User, Message, ShoppingCart, ShoppingBag };

const loading = ref(true);
const panel = ref<any>({ newVisits: 0, messages: 0, purchases: 0, shoppings: 0 });
const panelExt = ref<any>({ rechargeYuan: 0, walletBalanceYuan: 0, studioCount: 0 });
const transactions = ref<any[]>([]);

const lineEl = ref<HTMLElement>();
const radarEl = ref<HTMLElement>();
const pieEl = ref<HTMLElement>();
const barEl = ref<HTMLElement>();
let lineChart: echarts.ECharts | null = null;
let radarChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

const LINE_TYPES = [
  { key: 'newVisits', label: '新增会员', expected: '会员新增', actual: '新增订单' },
  { key: 'messages', label: '签到充值', expected: '签到次数', actual: '充值次数' },
  { key: 'purchases', label: '订单转化', expected: '待支付', actual: '已完成' },
  { key: 'shoppings', label: '金额趋势', expected: '营业额(元)', actual: '充值额(元)' },
] as const;

const activeLine = ref('newVisits');

const STATUS_TAG: Record<string, string> = {
  pending: 'danger',
  paid: 'warning',
  checked: 'primary',
  completed: 'success',
  cancelled: 'info',
  refunded: 'info',
};
const STATUS_TEXT: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  checked: '已入场',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
};

async function renderLine(type: string) {
  if (!lineEl.value) return;
  const res: any = await dashboardApi.lineData(type);
  lineChart = lineChart || echarts.init(lineEl.value);
  const meta = LINE_TYPES.find((t) => t.key === type) || LINE_TYPES[0];
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: [meta.expected, meta.actual] },
    grid: { left: 40, right: 16, top: 40, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: res.dates },
    yAxis: { type: 'value' },
    series: [
      { name: meta.expected, type: 'line', smooth: true, data: res.expectedData, areaStyle: { opacity: 0.15 } },
      { name: meta.actual, type: 'line', smooth: true, data: res.actualData },
    ],
  });
}

async function renderRadar() {
  if (!radarEl.value) return;
  const res: any = await dashboardApi.radarData();
  radarChart = radarChart || echarts.init(radarEl.value);
  radarChart.setOption({
    tooltip: {},
    legend: { bottom: 10 },
    radar: { indicator: res.indicators, radius: '65%' },
    series: [
      {
        type: 'radar',
        symbolSize: 4,
        areaStyle: { opacity: 0.2 },
        data: res.series,
      },
    ],
  });
}

async function renderPie() {
  if (!pieEl.value) return;
  const res: any = await dashboardApi.pieData();
  pieChart = pieChart || echarts.init(pieEl.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['40%', '50%'],
        label: { formatter: '{b}: {c}' },
        data: res.map((r: any) => ({ name: STATUS_TEXT[r.name] || r.name, value: r.value })),
      },
    ],
  });
}

async function renderBar() {
  if (!barEl.value) return;
  const res: any = await dashboardApi.barData();
  barChart = barChart || echarts.init(barEl.value);
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['场地订单', '道具租赁', '充值订单'] },
    grid: { left: 36, right: 16, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: res.dates },
    yAxis: { type: 'value', minInterval: 1 },
    series: res.series.map((s: any) => {
      const labels: Record<string, string> = { studio: '场地订单', item: '道具租赁', recharge: '充值订单' };
      return { name: labels[s.name] || s.name, type: 'bar', stack: 'total', barMaxWidth: 24, data: s.data };
    }),
  });
}

async function load() {
  loading.value = true;
  const [p, tx]: any = await Promise.all([dashboardApi.panelData(), dashboardApi.transactions()]);
  panel.value = p.panel;
  panelExt.value = p.panel.statusCounts ?? panelExt.value;
  transactions.value = tx;
  await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 60)),
  ]);
  await Promise.all([renderLine(activeLine.value), renderRadar(), renderPie(), renderBar()]);
  loading.value = false;
}

function setLineType(key: string) {
  activeLine.value = key;
  renderLine(key);
}

const cards = [
  { key: 'newVisits', label: '会员总数', icon: 'User', color: '#40c9c6', money: false },
  { key: 'messages', label: '今日新增', icon: 'Message', color: '#36a3f7', money: false },
  { key: 'purchases', label: '订单总数', icon: 'ShoppingCart', color: '#f4516c', money: false },
  { key: 'shoppings', label: '营业额(元)', icon: 'Shopping', color: '#34bfa3', money: true },
];

const extCards = [
  { key: 'rechargeYuan', label: '充值总额(元)', money: true },
  { key: 'walletBalanceYuan', label: '会员余额(元)', money: true },
  { key: 'studioCount', label: '营业场地', money: false },
];

const onResize = () => {
  lineChart?.resize();
  radarChart?.resize();
  pieChart?.resize();
  barChart?.resize();
};

onMounted(() => {
  load();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  lineChart?.dispose();
  radarChart?.dispose();
  pieChart?.dispose();
  barChart?.dispose();
});
</script>

<template>
  <div v-loading="loading" class="dashboard-container">
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.key" :xs="12" :sm="12" :lg="6" style="margin-bottom: 16px">
        <div class="card-panel" @click="setLineType(c.key)">
          <div class="card-panel-icon-wrapper" :style="{ background: c.color }">
            <el-icon :size="30" color="#fff"><component :is="ICONS[c.icon]" /></el-icon>
          </div>
          <div class="card-panel-description">
            <div class="card-panel-text">{{ c.label }}</div>
            <div class="card-panel-num">{{ c.money ? panel[c.key].toFixed(2) : panel[c.key] }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col v-for="c in extCards" :key="c.key" :xs="8" :sm="8" :lg="8">
        <el-card shadow="never" style="text-align: center">
          <div class="stat-num">{{ c.money ? panelExt[c.key].toFixed(2) : panelExt[c.key] }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-bottom: 16px">
      <template #header>近 7 天趋势（点击上方卡片切换）</template>
      <div ref="lineEl" style="height: 320px; width: 100%" />
    </el-card>

    <el-row :gutter="16">
      <el-col :md="10" :lg="8" style="margin-bottom: 16px">
        <el-card shadow="never">
          <template #header>业务雷达</template>
          <div ref="radarEl" style="height: 320px; width: 100%" />
        </el-card>
      </el-col>
      <el-col :md="7" :lg="8" style="margin-bottom: 16px">
        <el-card shadow="never">
          <template #header>订单状态分布</template>
          <div ref="pieEl" style="height: 320px; width: 100%" />
        </el-card>
      </el-col>
      <el-col :md="7" :lg="8" style="margin-bottom: 16px">
        <el-card shadow="never">
          <template #header>近 7 天业务量</template>
          <div ref="barEl" style="height: 320px; width: 100%" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>最近订单</template>
      <el-table :data="transactions" style="width: 100%">
        <el-table-column prop="order_no" label="订单号" min-width="200" />
        <el-table-column prop="customer" label="客户" width="140" />
        <el-table-column prop="price" label="金额(元)" width="120" align="center" />
        <el-table-column prop="date" label="日期" width="120" align="center" />
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_TAG[row.status] || 'info'">{{ STATUS_TEXT[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard-container {
  background: #f0f2f5;
  padding: 8px;
}
.card-panel {
  height: 100px;
  cursor: pointer;
  background: #fff;
  box-shadow: 4px 4px 40px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
}
.card-panel-icon-wrapper {
  width: 62px;
  height: 62px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-panel-description {
  margin-left: 16px;
}
.card-panel-text {
  font-size: 14px;
  color: #909399;
  margin-bottom: 6px;
}
.card-panel-num {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.stat-num {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}
</style>