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
const roleDialogVisible = ref(false);
const roles = ref<any[]>([]);
const currentAdmin = ref<any>(null);
const form = reactive({ username: '', password: '', nickname: '', isSuper: false, roleIds: [] as number[] });

async function load() {
  const res: any = await systemApi.adminPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function loadRoles() {
  const res: any = await systemApi.rolePage(1, 200);
  roles.value = res.list;
}

function openCreate() {
  Object.assign(form, { username: '', password: '', nickname: '', isSuper: false, roleIds: [] });
  loadRoles();
  dialogVisible.value = true;
}

async function submit() {
  await systemApi.createAdmin({ ...form, roleIds: form.roleIds });
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  load();
}

async function toggle(item: any) {
  if (item.isSuper) {
    ElMessage.warning('不能禁用超级管理员');
    return;
  }
  await systemApi.toggleStatus(item.id);
  ElMessage.success('状态已更新');
  load();
}

async function openRoleDialog(item: any) {
  if (item.isSuper) {
    ElMessage.warning('超级管理员拥有全部权限，无需分配角色');
    return;
  }
  currentAdmin.value = item;
  form.roleIds = (item.roles ?? []).map((r: any) => r.id);
  await loadRoles();
  roleDialogVisible.value = true;
}

async function saveRoles() {
  await systemApi.assignRoles(currentAdmin.value.id, form.roleIds);
  ElMessage.success('角色已更新');
  roleDialogVisible.value = false;
  load();
}

async function remove(item: any) {
  if (item.isSuper) {
    ElMessage.warning('不能删除超级管理员');
    return;
  }
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
      <el-button v-if="store.admin?.isSuper" type="primary" @click="openCreate">新增管理员</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="角色">
        <template #default="{ row }">
          <el-tag v-if="row.isSuper" type="danger" size="small">超级管理员</el-tag>
          <template v-else>
            <el-tag v-for="r in row.roles" :key="r.id" size="small" style="margin-right: 4px">{{ r.name }}</el-tag>
            <span v-if="!row.roles?.length" style="color: #909399">未分配</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button v-if="store.admin?.isSuper && !row.isSuper" link type="primary" @click="openRoleDialog(row)">分配角色</el-button>
          <el-button v-if="store.admin?.isSuper" link type="primary" @click="toggle(row)">启用/禁用</el-button>
          <el-button v-if="store.admin?.isSuper" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" style="margin-top: 12px" />

    <el-dialog v-model="dialogVisible" title="新增管理员" width="480">
      <el-form :model="form" label-width="110px">
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple placeholder="可不分配" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="超级管理员"><el-switch v-model="form.isSuper" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" :title="`分配角色 - ${currentAdmin?.nickname || ''}`" width="480">
      <el-select v-model="form.roleIds" multiple placeholder="选择角色" style="width: 100%">
        <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
      </el-select>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoles">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>