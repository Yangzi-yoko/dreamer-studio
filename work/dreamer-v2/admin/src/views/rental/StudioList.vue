<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { rentalApi } from '../../api/rental';

const router = useRouter();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

async function load() {
  const res: any = await rentalApi.studioPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function toggleEnabled(row: any) {
  await rentalApi.updateStudio(row.id, { ...row, enabled: !row.enabled });
  ElMessage.success('已更新');
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除场地「${row.name}」？`, '提示');
  await rentalApi.deleteStudio(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>场地管理</h3>
      <el-button type="primary" @click="router.push('/rental/studio/new')">新增场地</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="address" label="地址" />
      <el-table-column label="工作日价" width="100">
        <template #default="{ row }">¥{{ row.weekdayPrice }}</template>
      </el-table-column>
      <el-table-column label="周末价" width="100">
        <template #default="{ row }">¥{{ row.weekendPrice }}</template>
      </el-table-column>
      <el-table-column label="节假日价" width="100">
        <template #default="{ row }">¥{{ row.holidayPrice }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ row.deposit }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.enabled ? '上架' : '下架' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/rental/studio/${row.id}`)">编辑</el-button>
          <el-button link type="primary" @click="router.push(`/rental/studio/${row.id}/slots`)">时段</el-button>
          <el-button link type="warning" @click="toggleEnabled(row)">{{ row.enabled ? '下架' : '上架' }}</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
