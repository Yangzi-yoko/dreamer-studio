<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { memberApi } from '../api/member';

const overview = ref<any>({});
const revenueTrend = ref<any>({ dates: [], bookingRevenue: [], rechargeAmount: [], refundAmount: [] });
const revenueBySource = ref<any[]>([]);
const transactions = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const params: any = {};
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    
    const [ov, trend, source, tx] = await Promise.all([
      memberApi.financeOverview(params),
      memberApi.financeRevenueTrend(30),
      memberApi.financeRevenueBySource(params),
      memberApi.financeTransactions({ page: page.value, pageSize: pageSize.value, ...params }),
    ]);
    
    overview.value = ov || {};
    revenueTrend.value = trend || { dates: [], bookingRevenue: [], rechargeAmount: [], refundAmount: [] };
    revenueBySource.value = source || [];
    transactions.value = tx?.list || [];
    total.value = tx?.total || 0;
  } catch (e: any) {
    console.error('Load finance data failed:', e);
  } finally {
    loading.value = false;
  }
}

function formatAmount(amount: number) {
  return amount?.toFixed(2) || '0.00';
}

function getTypeText(type: string) {
  const texts: Record<string, string> = { recharge: '充值', booking: '预订', refund: '退款', deduct: '扣款' };
  return texts[type] || type;
}

onMounted(loadData);
</script>

<template>
  <div class="finance-page">
    <el-card class="header-card">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h3 style="margin: 0">财务中心</h3>
        <div style="display: flex; gap: 12px; align-items: center">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadData" />
          <el-button type="primary" @click="loadData" :loading="loading">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- Overview Cards -->
    <div class="overview-cards">
      <div class="stat-card">
        <div class="stat-icon" style="background: #e8f5e9">💰</div>
        <div class="stat-info">
          <div class="stat-label">总营收</div>
          <div class="stat-value">¥{{ formatAmount(overview.totalRevenue) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #e3f2fd">💳</div>
        <div class="stat-info">
          <div class="stat-label">充值总额</div>
          <div class="stat-value">¥{{ formatAmount(overview.totalRecharge) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fce4ec">↩️</div>
        <div class="stat-info">
          <div class="stat-label">退款总额</div>
          <div class="stat-value">¥{{ formatAmount(overview.totalRefund) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fff3e0">📊</div>
        <div class="stat-info">
          <div class="stat-label">净收入</div>
          <div class="stat-value" :style="{ color: overview.netIncome >= 0 ? '#67c23a' : '#f56c6c' }">¥{{ formatAmount(overview.netIncome) }}</div>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="mini-stat">
        <div class="mini-label">预订订单</div>
        <div class="mini-value">{{ overview.bookingCount || 0 }}笔</div>
      </div>
      <div class="mini-stat">
        <div class="mini-label">充值订单</div>
        <div class="mini-value">{{ overview.rechargeCount || 0 }}笔</div>
      </div>
      <div class="mini-stat">
        <div class="mini-label">平均订单</div>
        <div class="mini-value">¥{{ formatAmount(overview.avgBookingAmount) }}</div>
      </div>
      <div class="mini-stat">
        <div class="mini-label">优惠减免</div>
        <div class="mini-value">¥{{ formatAmount(overview.totalDiscount) }}</div>
      </div>
    </div>

    <!-- Revenue by Source -->
    <el-card style="margin: 16px 0">
      <template #header>收入来源</template>
      <div class="source-grid">
        <div v-for="item in revenueBySource" :key="item.name" class="source-item">
          <div class="source-name">{{ item.name }}</div>
          <div class="source-value">¥{{ item.value }}</div>
        </div>
      </div>
    </el-card>

    <!-- Revenue Trend Chart -->
    <el-card style="margin: 16px 0">
      <template #header>近30天收入趋势</template>
      <div class="trend-chart">
        <div v-for="(date, i) in revenueTrend.dates" :key="date" class="trend-bar-group">
          <div class="trend-bars">
            <div class="trend-bar booking" :style="{ height: Math.min((revenueTrend.bookingRevenue[i] || 0) * 2, 160) + 'px' }" :title="'预订: ¥' + (revenueTrend.bookingRevenue[i] || 0)"></div>
            <div class="trend-bar recharge" :style="{ height: Math.min((revenueTrend.rechargeAmount[i] || 0) * 2, 160) + 'px' }" :title="'充值: ¥' + (revenueTrend.rechargeAmount[i] || 0)"></div>
          </div>
          <div class="trend-date">{{ date }}</div>
        </div>
      </div>
      <div class="trend-legend">
        <span><span class="legend-dot booking"></span> 预订收入</span>
        <span><span class="legend-dot recharge"></span> 充值收入</span>
      </div>
    </el-card>

    <!-- Transaction List -->
    <el-card>
      <template #header>交易流水</template>
      <el-table :data="transactions" border size="small">
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isIncome ? 'success' : 'danger'" size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="单号" width="180" />
        <el-table-column prop="nickname" label="会员" width="100">
          <template #default="{ row }">{{ row.nickname || row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column prop="typeText" label="描述" />
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.isIncome ? '#67c23a' : '#f56c6c', fontWeight: '500' }">
              {{ row.isIncome ? '+' : '-' }}¥{{ row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadData" style="margin-top: 12px" />
    </el-card>
  </div>
</template>

<style scoped>
.finance-page { padding: 0; }
.header-card { margin-bottom: 16px; }
.overview-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.stat-label { font-size: 13px; color: #999; }
.stat-value { font-size: 20px; font-weight: 600; color: #333; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.mini-stat { background: #fff; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.mini-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.mini-value { font-size: 16px; font-weight: 600; color: #333; }
.source-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.source-item { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px; }
.source-name { font-size: 14px; color: #666; margin-bottom: 8px; }
.source-value { font-size: 20px; font-weight: 600; color: #333; }
.trend-chart { display: flex; align-items: flex-end; gap: 4px; height: 200px; padding: 20px 0; overflow-x: auto; }
.trend-bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 30px; }
.trend-bars { display: flex; gap: 2px; align-items: flex-end; height: 160px; }
.trend-bar { width: 12px; min-height: 2px; border-radius: 2px 2px 0 0; transition: height 0.3s; }
.trend-bar.booking { background: #409eff; }
.trend-bar.recharge { background: #67c23a; }
.trend-date { font-size: 10px; color: #999; margin-top: 4px; writing-mode: vertical-rl; height: 40px; }
.trend-legend { display: flex; gap: 24px; justify-content: center; margin-top: 12px; }
.legend-dot { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 4px; }
.legend-dot.booking { background: #409eff; }
.legend-dot.recharge { background: #67c23a; }
</style>
