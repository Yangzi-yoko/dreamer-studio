<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const menuDialogVisible = ref(false);
const form = reactive({ code: '', name: '', description: '' });
const menus = ref<any[]>([]);
const checkedMenus = ref<number[]>([]);
const currentRole = ref<any>(null);

async function load() {
  const res: any = await systemApi.rolePage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

async function loadMenus() {
  const res: any = await systemApi.menuPage(1, 200);
  menus.value = res.list;
}

async function submit() {
  await systemApi.createRole(form);
  ElMessage.success('创建成功');
  dialogVisible.value = false;
  load();
}

async function openMenuDialog(role: any) {
  currentRole.value = role;
  await loadMenus();
  menuDialogVisible.value = true;
}

async function saveMenus() {
  await systemApi.assignMenus(currentRole.value.id, checkedMenus.value);
  ElMessage.success('授权成功');
  menuDialogVisible.value = false;
}

async function remove(role: any) {
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
      <el-button type="primary" @click="dialogVisible = true">新增角色</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="description" label="说明" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="openMenuDialog(row)">菜单授权</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" title="新增角色" width="480">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码"><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuDialogVisible" title="菜单授权" width="480">
      <el-checkbox-group v-model="checkedMenus">
        <el-checkbox v-for="m in menus" :key="m.id" :value="m.id">{{ m.title }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMenus">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
