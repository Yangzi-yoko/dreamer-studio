<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemApi } from '../../api/system';

const list = ref<any[]>([]);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const menus = ref<any[]>([]);
const form = reactive({
  title: '',
  path: '',
  icon: '',
  type: 'menu',
  permissionCode: '',
  sort: 0,
  parentId: undefined as number | undefined,
  visible: true,
});

const TYPE_LABEL: Record<string, string> = { dir: '目录', menu: '菜单', button: '按钮' };
const TYPE_TAG: Record<string, string> = { dir: 'warning', menu: 'primary', button: 'info' };

async function load() {
  const res: any = await systemApi.menuTree();
  list.value = res;
}

async function loadFlatMenus() {
  const res: any = await systemApi.menuPage(1, 500);
  menus.value = res.list;
}

function openCreate(parentId?: number) {
  editingId.value = null;
  Object.assign(form, {
    title: '',
    path: '',
    icon: '',
    type: parentId ? 'menu' : 'dir',
    permissionCode: '',
    sort: 0,
    parentId,
    visible: true,
  });
  loadFlatMenus();
  dialogVisible.value = true;
}

async function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    path: row.path,
    icon: row.icon,
    type: row.type,
    permissionCode: row.permissionCode,
    sort: row.sort,
    parentId: row.parentId,
    visible: row.visible,
  });
  await loadFlatMenus();
  dialogVisible.value = true;
}

async function submit() {
  const payload = { ...form };
  if (payload.parentId === undefined || payload.parentId === null) {
    payload.parentId = undefined;
  }
  if (editingId.value) {
    await systemApi.updateMenu(editingId.value, payload);
  } else {
    await systemApi.createMenu(payload);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除菜单「${row.title}」？`, '提示');
  await systemApi.deleteMenu(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(() => {
  load();
  loadFlatMenus();
});
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>菜单管理</h3>
      <div>
        <el-button type="primary" @click="openCreate()">新增目录/菜单</el-button>
      </div>
    </div>
    <el-table :data="list" border row-key="id" default-expand-all :tree-props="{ children: 'children' }">
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="path" label="路由路径" min-width="150" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="TYPE_TAG[row.type] || 'info'" size="small">{{ TYPE_LABEL[row.type] || row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="permissionCode" label="权限标识" min-width="160" />
      <el-table-column label="排序" width="70" prop="sort" />
      <el-table-column label="可见" width="80">
        <template #default="{ row }">{{ row.visible ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.type !== 'button'" link type="primary" @click="openCreate(row.id)">新增子项</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑菜单' : '新增菜单'" width="520">
      <el-form :model="form" label-width="100px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" placeholder="无（作为顶级）" clearable filterable style="width: 100%">
            <el-option label="顶级菜单" :value="undefined" />
            <el-option v-for="m in menus" :key="m.id" :label="`${m.title}${m.type === 'menu' ? '（菜单）' : ''}`" :value="m.id" :disabled="editingId === m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="路由路径"><el-input v-model="form.path" placeholder="如 /system/role" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" placeholder="Element Plus 图标名" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="目录" value="dir" />
            <el-option label="菜单" value="menu" />
            <el-option label="按钮" value="button" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限标识"><el-input v-model="form.permissionCode" placeholder="如 system:role:create" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
        <el-form-item label="可见"><el-switch v-model="form.visible" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>