<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const coupons = ref<any[]>([]);
const form = reactive({ couponId: undefined as number | undefined, enabled: false });

onMounted(async () => {
  const c: any = await memberApi.couponPage(1, 100);
  coupons.value = c.list;
  const cfg: any = await memberApi.birthdayConfig();
  if (cfg) Object.assign(form, { couponId: cfg.couponId, enabled: cfg.enabled });
});

async function save() {
  await memberApi.updateBirthdayConfig(form);
  ElMessage.success('保存成功');
}

async function runNow() {
  const res: any = await memberApi.birthdayRunNow();
  ElMessage.success(`已发放 ${res.issued} 张生日券`);
}
</script>

<template>
  <el-card>
    <h3>生日礼遇</h3>
    <el-form :model="form" label-width="120px" style="max-width: 480px">
      <el-form-item label="生日赠券">
        <el-select v-model="form.couponId" clearable placeholder="选择优惠券">
          <el-option v-for="c in coupons" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-button type="primary" @click="save">保存</el-button>
      <el-button @click="runNow">立即发放测试</el-button>
    </el-form>
  </el-card>
</template>
