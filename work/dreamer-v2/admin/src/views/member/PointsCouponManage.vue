<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const active = ref('config');

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;

const logs = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = 10;

const coupons = ref<any[]>([]);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ couponId: 0, point: 0, stock: 0, limitPerUser: 0, enabled: true, sort: 0 });

function couponText(c: any) {
  if (!c) return '';
  if (c.type === 'amount') {
    return c.minSpend > 0 ? `满${c.minSpend}元减${c.value}元` : `${c.value}元无门槛券`;
  }
  return c.minSpend > 0 ? `满${c.minSpend}元${(c.value / 10).toFixed(1)}折` : `${(c.value / 10).toFixed(1)}折券`;
}

async function load() {
  const res: any = await memberApi.pointCouponPage(page.value, pageSize);
  list.value = res.list;
  total.value = res.total;
}

async function loadLogs() {
  const res: any = await memberApi.pointCouponLogs(logPage.value, logPageSize);
  logs.value = res.list;
  logTotal.value = res.total;
}

async function loadCoupons() {
  const res: any = await memberApi.couponPage(1, 200);
  coupons.value = res.list || [];
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { couponId: 0, point: 0, stock: 0, limitPerUser: 0, enabled: true, sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    couponId: row.couponId,
    point: row.point,
    stock: row.stock,
    limitPerUser: row.limitPerUser || 0,
    enabled: row.enabled,
    sort: row.sort || 0,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!form.couponId) {
    ElMessage.warning('请选择优惠券');
    return;
  }
  const payload = { ...form };
  if (editingId.value) {
    await memberApi.updatePointsCoupon(editingId.value, payload);
  } else {
    await memberApi.createPointsCoupon(payload);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function toggleEnable(row: any) {
  await memberApi.updatePointsCoupon(row.id, {
    couponId: row.couponId,
    point: row.point,
    stock: row.stock,
    limitPerUser: row.limitPerUser || 0,
    enabled: !row.enabled,
    sort: row.sort || 0,
  });
  ElMessage.success(row.enabled ? '已停用' : '已启用');
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.couponName}」？`, '提示');
  try {
    await memberApi.deletePointsCoupon(row.id);
    ElMessage.success('已删除');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败');
  }
}

onMounted(async () => {
  load();
  loadLogs();
  loadCoupons();
});
</script>

<template>
  <el-tabs v-model="active">
    <el-tab-pane label="兑换配置" name="config">
      <el-card>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
          <h3 style="margin: 0">积分兑换优惠券配置</h3>
          <el-button type="primary" @click="openCreate">新增兑换项</el-button>
        </div>
        <el-table :data="list" border>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="couponName" label="优惠券" min-width="150" />
          <el-table-column label="券类型" min-width="120">
            <template #default="{ row }">
              {{ row.couponType === 'amount' ? `满${row.couponMinSpend}元减${row.couponValue}元` : `${(row.couponValue / 10).toFixed(1)}折` }}
            </template>
          </el-table-column>
          <el-table-column label="所需积分" width="100">
            <template #default="{ row }">
              <span style="color: #f56c6c">{{ row.point }}</span>
            </template>
          </el-table-column>
          <el-table-column label="库存" width="90">
            <template #default="{ row }">{{ row.stock < 0 ? '不限' : row.stock }}</template>
          </el-table-column>
          <el-table-column prop="exchanged" label="已兑换" width="80" />
          <el-table-column label="每人限兑" width="100">
            <template #default="{ row }">{{ row.limitPerUser ? `${row.limitPerUser} 次` : '不限' }}</template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="70" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="170" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleEnable(row)">
                {{ row.enabled ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          style="margin-top: 12px; justify-content: flex-end"
          @current-change="load"
        />

        <el-dialog v-model="dialogVisible" :title="editingId ? '编辑兑换项' : '新增兑换项'" width="520">
          <el-form :model="form" label-width="100px">
            <el-form-item label="优惠券">
              <el-select v-model="form.couponId" filterable placeholder="选择优惠券" style="width: 100%">
                <el-option
                  v-for="c in coupons"
                  :key="c.id"
                  :value="c.id"
                  :label="`${c.name}（${couponText(c)}）`"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="所需积分"><el-input-number v-model="form.point" :min="0" /></el-form-item>
            <el-form-item label="库存数量">
              <el-input-number v-model="form.stock" :min="-1" />
              <span style="margin-left: 8px; color: #999">-1 表示不限量</span>
            </el-form-item>
            <el-form-item label="每人限兑"><el-input-number v-model="form.limitPerUser" :min="0" /><span style="margin-left: 8px; color: #999">0 表示不限</span></el-form-item>
            <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
            <el-form-item label="启用"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submit">保存</el-button>
          </template>
        </el-dialog>
      </el-card>
    </el-tab-pane>

    <el-tab-pane label="兑换记录" name="logs">
      <el-card>
        <el-table :data="logs" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="memberNickname" label="会员昵称" width="130" />
          <el-table-column prop="memberPhone" label="手机号" width="130" />
          <el-table-column prop="couponName" label="优惠券" min-width="150" />
          <el-table-column label="消耗积分" width="100">
            <template #default="{ row }">
              <span style="color: #f56c6c">{{ row.point }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="兑换时间" width="180" />
        </el-table>
        <el-pagination
          v-model:current-page="logPage"
          :page-size="logPageSize"
          :total="logTotal"
          layout="prev, pager, next"
          style="margin-top: 12px; justify-content: flex-end"
          @current-change="loadLogs"
        />
      </el-card>
    </el-tab-pane>
  </el-tabs>
</template>