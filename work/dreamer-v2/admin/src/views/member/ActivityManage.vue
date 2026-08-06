<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const coupons = ref<any[]>([]);
const regs = ref<any[]>([]);
const regDialog = ref(false);
const form = reactive({ title: '', image: '', description: '', startAt: '', endAt: '', couponId: undefined as number | undefined, status: 'draft' });

async function load() {
  const res: any = await memberApi.activityPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { title: '', image: '', description: '', startAt: '', endAt: '', couponId: undefined, status: 'draft' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title, image: row.image, description: row.description,
    startAt: row.startAt, endAt: row.endAt, couponId: row.couponId, status: row.status,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateActivity(editingId.value, form);
  } else {
    await memberApi.createActivity(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function showRegs(row: any) {
  const res: any = await memberApi.activityRegistrations(row.id, 1, 50);
  regs.value = res.list;
  regDialog.value = true;
}

onMounted(async () => {
  load();
  const c: any = await memberApi.couponPage(1, 100);
  coupons.value = c.list;
});
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>营销活动</h3>
      <el-button type="primary" @click="openCreate">新增活动</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="startAt" label="开始时间" width="180" />
      <el-table-column prop="endAt" label="结束时间" width="180" />
      <el-table-column prop="status" label="状态" width="90" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="showRegs(row)">报名</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑活动' : '新增活动'" width="560">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="form.image" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="form.startAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="报名赠券">
          <el-select v-model="form.couponId" clearable placeholder="选择优惠券">
            <el-option v-for="c in coupons" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="草稿" value="draft" />
            <el-option label="发布" value="published" />
            <el-option label="结束" value="ended" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="regDialog" title="报名列表" width="560">
      <el-table :data="regs" border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="memberId" label="会员ID" width="100" />
        <el-table-column prop="createdAt" label="报名时间" />
      </el-table>
    </el-dialog>
  </el-card>
</template>
