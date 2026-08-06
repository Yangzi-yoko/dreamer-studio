<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', minSpendYuan: 0, minOrders: 0, enabled: true, sort: 0 });

async function load() {
  const res: any = await memberApi.levelPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', minSpendYuan: 0, minOrders: 0, enabled: true, sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, minSpendYuan: row.minSpend, minOrders: row.minOrders, enabled: row.enabled, sort: row.sort });
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateLevel(editingId.value, form);
  } else {
    await memberApi.createLevel(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除等级「${row.name}」？`, '提示');
  await memberApi.deleteLevel(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员等级配置</h3>
      <el-button type="primary" @click="openCreate">新增等级</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="升级门槛(累计消费)" width="180">
        <template #default="{ row }">¥{{ row.minSpend }}</template>
      </el-table-column>
      <el-table-column prop="minOrders" label="最低订单数" width="110" />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑等级' : '新增等级'" width="480">
      <el-form :model="form" label-width="140px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="累计消费门槛(元)"><el-input-number v-model="form.minSpendYuan" :min="0" /></el-form-item>
        <el-form-item label="最低订单数"><el-input-number v-model="form.minOrders" :min="0" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
