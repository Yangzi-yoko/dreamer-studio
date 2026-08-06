<script setup lang="ts">
import { ref } from 'vue';
import { memberApi } from '../../api/member';

const memberId = ref<number | null>(null);
const list = ref<any[]>([]);
const total = ref(0);

async function query() {
  if (!memberId.value) return;
  const res: any = await memberApi.signinPage(memberId.value, 1, 50);
  list.value = res.list;
  total.value = res.total;
}
</script>

<template>
  <el-card>
    <h3>签到记录</h3>
    <div style="display: flex; gap: 12px; margin-bottom: 12px">
      <el-input-number v-model="memberId" :min="1" placeholder="会员ID" style="width: 180px" />
      <el-button type="primary" @click="query">查询</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="memberId" label="会员ID" width="90" />
      <el-table-column prop="signinDate" label="签到日期" width="120" />
      <el-table-column prop="streak" label="连续天数" width="100" />
      <el-table-column prop="pointsAwarded" label="奖励积分" width="100" />
      <el-table-column prop="createdAt" label="签到时间" />
    </el-table>
    <div style="margin-top: 8px">共 {{ total }} 条记录</div>
  </el-card>
</template>
