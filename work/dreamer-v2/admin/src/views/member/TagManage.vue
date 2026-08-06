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
const form = reactive({ name: '', color: '' });

async function load() {
  const res: any = await memberApi.tagPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', color: '' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, color: row.color });
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateTag(editingId.value, form);
  } else {
    await memberApi.createTag(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除标签「${row.name}」？`, '提示');
  await memberApi.deleteTag(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>会员标签</h3>
      <el-button type="primary" @click="openCreate">新增标签</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="颜色" width="120">
        <template #default="{ row }">
          <span :style="{ color: row.color || '#409EFF' }">● {{ row.color || '默认' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="420">
      <el-form :model="form" label-width="70px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="form.color" placeholder="如 #FF6B6B" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
