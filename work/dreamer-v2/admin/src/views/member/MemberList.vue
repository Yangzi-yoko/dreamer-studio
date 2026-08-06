<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const router = useRouter();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

async function load() {
  const res: any = await memberApi.memberPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

onMounted(load);

async function toggleStatus(row: any, status: number) {
  await memberApi.updateMember(row.id, { ...row, status });
  row.status = status;
  ElMessage.success(status === 1 ? '已启用' : '已禁用');
}
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员管理</h3>
      <el-button type="primary" @click="router.push('/member/new')">新增会员</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="username" label="账号" width="130" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="累计消费" width="110">
        <template #default="{ row }">¥{{ row.totalSpend }}</template>
      </el-table-column>
      <el-table-column prop="totalOrders" label="订单数" width="80" />
      <el-table-column label="标签" min-width="140">
        <template #default="{ row }">
          <el-tag v-for="t in row.tags" :key="t.id" size="small" style="margin-right: 4px">{{ t.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/member/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="toggleStatus(row, $event)" />
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
