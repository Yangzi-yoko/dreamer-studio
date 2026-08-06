<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';
import { useAuthStore } from '../../stores/auth';

const store = useAuthStore();
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const form = reactive({ username: '', password: '', nickname: '', isSuper: false, roleIds: [] as number[] });

async function load() {
  const res: any = await systemApi.adminPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function submit() {
  await systemApi.createAdmin(form);
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  load();
}

async function toggle(item: any) {
  await systemApi.toggleStatus(item.id);
  ElMessage.success('状态已更新');
  load();
}

async function remove(item: any) {
  await ElMessageBox.confirm(`确定删除管理员「${item.nickname}」？`, '提示');
  await systemApi.deleteAdmin(item.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>管理员管理</h3>
      <el-button v-if="store.admin?.isSuper" type="primary" @click="dialogVisible = true">新增管理员</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="超级管理员" width="110">
        <template #default="{ row }">{{ row.isSuper ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ row.status === 1 ? '启用' : '禁用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="store.admin?.isSuper" link type="primary" @click="toggle(row)">启用/禁用</el-button>
          <el-button v-if="store.admin?.isSuper" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" title="新增管理员" width="480">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="超级管理员"><el-switch v-model="form.isSuper" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
