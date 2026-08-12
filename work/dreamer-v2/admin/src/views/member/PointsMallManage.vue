<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';
import ImageUpload from '../../components/ImageUpload.vue';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', cover: '', description: '', point: 0, stock: 0, limitPerUser: 0, status: 'enabled', sort: 0 });

async function load() {
  const res: any = await memberApi.pointMallPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', cover: '', description: '', point: 0, stock: 0, limitPerUser: 0, status: 'enabled', sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    cover: row.cover || '',
    description: row.description || '',
    point: row.point,
    stock: row.stock,
    limitPerUser: row.limitPerUser || 0,
    status: row.status || 'enabled',
    sort: row.sort || 0,
  });
  dialogVisible.value = true;
}

async function submit() {
  const payload = {
    ...form,
    cover: form.cover || undefined,
    description: form.description || undefined,
  };
  if (editingId.value) {
    await memberApi.updatePointsProduct(editingId.value, payload);
  } else {
    await memberApi.createPointsProduct(payload);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示');
  try {
    await memberApi.deletePointsProduct(row.id);
    ElMessage.success('已删除');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败');
  }
}

async function toggleStatus(row: any) {
  const next = row.status === 'enabled' ? 'disabled' : 'enabled';
  await memberApi.updatePointsProduct(row.id, {
    name: row.name,
    point: row.point,
    stock: row.stock,
    limitPerUser: row.limitPerUser || 0,
    status: next,
    sort: row.sort || 0,
  });
  ElMessage.success(next === 'enabled' ? '已上架' : '已下架');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>积分商品管理</h3>
      <el-button type="primary" @click="openCreate">新增积分商品</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="80">
        <template #default="{ row }">
          <el-image v-if="row.cover" :src="row.cover" fit="cover" style="width: 48px; height: 48px; border-radius: 4px" :preview-src-list="[row.cover]" preview-teleported />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column label="所需积分" width="100">
        <template #default="{ row }">
          <span style="color: #f56c6c">{{ row.point }}</span>
        </template>
      </el-table-column>
      <el-table-column label="库存" width="120">
        <template #default="{ row }">{{ row.stock }} / {{ row.totalStock }}</template>
      </el-table-column>
      <el-table-column prop="exchanged" label="已兑换" width="90" />
      <el-table-column label="每人限兑" width="100">
        <template #default="{ row }">{{ row.limitPerUser ? `${row.limitPerUser} 次` : '不限' }}</template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ row.status === 'enabled' ? '上架' : '下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 'enabled' ? 'warning' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 'enabled' ? '下架' : '上架' }}
          </el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑积分商品' : '新增积分商品'" width="560">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称"><el-input v-model="form.name" maxlength="64" /></el-form-item>
        <el-form-item label="封面图片"><ImageUpload v-model="form.cover" :limit="1" /></el-form-item>
        <el-form-item label="所需积分"><el-input-number v-model="form.point" :min="0" /></el-form-item>
        <el-form-item label="库存数量"><el-input-number v-model="form.stock" :min="0" /></el-form-item>
        <el-form-item label="每人限兑"><el-input-number v-model="form.limitPerUser" :min="0" /><span style="margin-left: 8px; color: #999">0 表示不限</span></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="上架">
          <el-switch v-model="form.status" active-value="enabled" inactive-value="disabled" active-text="上架" inactive-text="下架" />
        </el-form-item>
        <el-form-item label="商品描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
