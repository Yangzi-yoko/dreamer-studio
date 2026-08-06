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
  const res: any = await rentalApi.itemPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function toggleEnabled(row: any) {
  await rentalApi.updateItem(row.id, { ...row, enabled: !row.enabled });
  ElMessage.success('已更新');
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除商品「${row.name}」？`, '提示');
  await rentalApi.deleteItem(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>器材/服装管理</h3>
      <el-button type="primary" @click="router.push('/rental/item/new')">新增商品</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="计费方式" width="100">
        <template #default="{ row }">{{ row.billingType === 'day' ? '按天' : '按时段' }}</template>
      </el-table-column>
      <el-table-column label="单价" width="90">
        <template #default="{ row }">¥{{ row.unitPrice }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ row.deposit }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.enabled ? '上架' : '下架' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/rental/item/${row.id}`)">编辑</el-button>
          <el-button link type="warning" @click="toggleEnabled(row)">{{ row.enabled ? '下架' : '上架' }}</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
