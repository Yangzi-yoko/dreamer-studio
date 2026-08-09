<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const menuDialogVisible = ref(false);
const editing = ref(false);
const form = reactive({ code: '', name: '', description: '' });
const menus = ref<any[]>([]);
const currentRole = ref<any>(null);
const treeRef = ref<any>(null);
const treeProps = { label: 'title', children: 'children' };

const SUPER_CODE = 'superadmin';

function buildTree(flat: any[]) {
  const map: Record<number, any> = {};
  flat.forEach((m) => {
    map[m.id] = { ...m, children: [] };
  });
  const roots: any[] = [];
  flat.forEach((m) => {
    if (m.parentId && map[m.parentId]) map[m.parentId].children.push(map[m.id]);
    else roots.push(map[m.id]);
  });
  return roots;
}

async function load() {
  const res: any = await systemApi.rolePage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function loadMenus() {
  const res: any = await systemApi.menuPage(1, 200);
  menus.value = buildTree(res.list);
}

function openCreate() {
  editing.value = false;
  form.code = '';
  form.name = '';
  form.description = '';
  dialogVisible.value = true;
}

function openEdit(role: any) {
  editing.value = true;
  form.code = role.code;
  form.name = role.name;
  form.description = role.description;
  currentRole.value = role;
  dialogVisible.value = true;
}

async function submit() {
  if (editing.value) {
    await systemApi.updateRole(currentRole.value.id, { name: form.name, description: form.description });
    ElMessage.success('更新成功');
  } else {
    await systemApi.createRole(form);
    ElMessage.success('创建成功');
  }
  dialogVisible.value = false;
  load();
}

async function openMenuDialog(role: any) {
  currentRole.value = role;
  await loadMenus();
  menuDialogVisible.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys([]);
  const res: any = await systemApi.roleMenus(role.id);
  treeRef.value?.setCheckedKeys(res);
}

async function saveMenus() {
  const checked = treeRef.value?.getCheckedKeys() || [];
  const half = treeRef.value?.getHalfCheckedKeys() || [];
  await systemApi.assignMenus(currentRole.value.id, [...checked, ...half]);
  ElMessage.success('授权成功');
  menuDialogVisible.value = false;
  load();
}

async function remove(role: any) {
  if (role.code === SUPER_CODE) {
    ElMessage.warning('内置超级管理员角色不能删除');
    return;
  }
  await ElMessageBox.confirm(`确定删除角色「${role.name}」？`, '提示');
  await systemApi.deleteRole(role.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>角色管理</h3>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="description" label="说明" />
      <el-table-column prop="menuCount" label="菜单数" width="90" />
      <el-table-column prop="adminCount" label="用户数" width="90" />
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button link type="primary" @click="openMenuDialog(row)">菜单授权</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :disabled="row.code === SUPER_CODE" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" style="margin-top: 12px" />

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑角色' : '新增角色'" width="480">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码"><el-input v-model="form.code" :disabled="editing" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuDialogVisible" title="菜单授权" width="480">
      <el-scrollbar max-height="440">
        <el-tree
          ref="treeRef"
          :data="menus"
          :props="treeProps"
          node-key="id"
          show-checkbox
          default-expand-all
        />
      </el-scrollbar>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMenus">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>