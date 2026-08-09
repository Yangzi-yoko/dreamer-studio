<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

interface SigninStatus {
  todaySigned: boolean;
  currentStreak: number;
  basePoints: number;
  streakBonus: number;
  bonusStreak: number;
  daysToBonus: number;
  monthDays: string[];
  totalDays: number;
  points: number;
}

const status = ref<SigninStatus | null>(null);
const loading = ref(false);

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const daysInMonth = new Date(year, month, 0).getDate();
const firstDayOfWeek = new Date(year, now.getMonth(), 1).getDay();
const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

const dayCells = computed(() => {
  const cells: { date: string; day: number; checked: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ date: '', day: 0, checked: false, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date, day: d, checked: !!status.value?.monthDays.includes(date), isToday: date === todayStr });
  }
  return cells;
});

async function load() {
  try {
    status.value = await api.signinStatus() as SigninStatus;
  } catch (e: any) {
    ElMessage.error(e.message || '加载签到状态失败');
  }
}

async function doCheckin() {
  if (status.value?.todaySigned) return;
  loading.value = true;
  try {
    await api.signinCheckin();
    ElMessage.success('签到成功');
    await load();
  } catch (e: any) {
    ElMessage.error(e.message || '签到失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="text-align: center; padding: 20px 0">
      <div style="font-size: 48px">{{ status?.todaySigned ? '✅' : '📅' }}</div>
      <div style="font-size: 22px; font-weight: 600; margin-top: 8px">
        已连续签到 {{ status?.currentStreak ?? 0 }} 天
      </div>
      <div style="color: #999; margin-top: 4px">
        累计签到 {{ status?.totalDays ?? 0 }} 天 · 当前积分 {{ status?.points ?? 0 }}
      </div>
      <el-button
        type="primary"
        size="large"
        style="width: 220px; margin-top: 16px"
        :disabled="status?.todaySigned"
        :loading="loading"
        @click="doCheckin"
      >
        {{ status?.todaySigned ? '今日已签到' : '立即签到' }}
      </el-button>
    </div>

    <el-card style="margin-top: 8px">
      <div style="font-weight: 600; margin-bottom: 4px">{{ year }}年{{ month }}月</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; color: #999">
        <div v-for="w in weekLabels" :key="w">{{ w }}</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 8px; text-align: center">
        <div
          v-for="(cell, i) in dayCells"
          :key="i"
          :class="['day-cell', { checked: cell.checked && !cell.isToday, today: cell.isToday }]"
        >
          {{ cell.day }}
        </div>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: #666">
        <span><span style="display: inline-block; width: 12px; height: 12px; background: #409eff; border-radius: 3px; vertical-align: -1px; margin-right: 4px"></span>已签到</span>
        <span><span style="display: inline-block; width: 12px; height: 12px; border: 1px dashed #f56c6c; border-radius: 3px; vertical-align: -1px; margin-right: 4px"></span>今天</span>
      </div>
    </el-card>

    <el-card style="margin-top: 12px">
      <div style="font-weight: 600; margin-bottom: 8px">签到规则</div>
      <div style="font-size: 13px; color: #666; line-height: 1.8">
        每日签到可得 <b style="color: #e6a23c">{{ status?.basePoints ?? 10 }} 积分</b>；
        连续签到每满 <b style="color: #e6a23c">{{ status?.bonusStreak ?? 7 }} 天</b>
        可额外获得 <b style="color: #e6a23c">{{ status?.streakBonus ?? 50 }} 积分</b>
        <span v-if="status && !status.todaySigned && status.daysToBonus > 0">
          ，再连续签到 <b style="color: #f56c6c">{{ status.daysToBonus }} 天</b> 即可触发
        </span>
        <span v-else-if="status && !status.todaySigned && status.daysToBonus === 0">，下次签到即可触发</span>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.day-cell {
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  background: #f5f7fa;
}
.day-cell.checked {
  background: #409eff;
  color: #fff;
}
.day-cell.today {
  border: 1px dashed #f56c6c;
  color: #f56c6c;
  background: #fef0f0;
}
.day-cell:not(.checked):not(.today) {
  color: #333;
}
</style>