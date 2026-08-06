<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const form = reactive({
  name: '', images: '', description: '', billingType: 'day',
  unitPriceYuan: 0, depositYuan: 0, stock: 0, enabled: true, sort: 0,
});

onMounted(async () => {
  if (id && id !== 'new') {
    const res: any = await rentalApi.itemPage(1, 100);
    const data = res.list.find((i: any) => i.id === Number(id));
    if (data) Object.assign(form, {
      name: data.name, images: data.images, description: data.description, billingType: data.billingType,
      unitPriceYuan: data.unitPrice, depositYuan: data.deposit, stock: data.stock,
      enabled: data.enabled, sort: data.sort,
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await rentalApi.updateItem(Number(id), form);
  } else {
    await rentalApi.createItem(form);
  }
  ElMessage.success('保存成功');
  router.push('/rental/items');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '编辑商品' : '新增商品' }}</h3>
    <el-form :model="form" label-width="120px" style="max-width: 560px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="图片URL"><el-input v-model="form.images" placeholder="逗号分隔多个URL" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-form-item label="计费方式">
        <el-radio-group v-model="form.billingType">
          <el-radio value="day">按天</el-radio>
          <el-radio value="slot">按时段</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="单价(元)"><el-input-number v-model="form.unitPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="押金(元)"><el-input-number v-model="form.depositYuan" :min="0" /></el-form-item>
      <el-form-item label="库存"><el-input-number v-model="form.stock" :min="0" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
      <el-form-item label="上架"><el-switch v-model="form.enabled" /></el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
