<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';
import ImageUpload from '../../components/ImageUpload.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const isEdit = !!id && id !== 'new';
const levels = ref<any[]>([]);
const tags = ref<any[]>([]);
const form = reactive({
  phone: '',
  username: '',
  password: '',
  nickname: '',
  avatar: '',
  levelId: undefined as number | undefined,
  tagIds: [] as number[],
  status: 1,
});

onMounted(async () => {
  const lres: any = await memberApi.levelPage(1, 100);
  levels.value = lres.list;
  const tres: any = await memberApi.tagPage(1, 100);
  tags.value = tres.list;
  if (isEdit) {
    const res: any = await memberApi.memberPage(1, 1000);
    const m = res.list.find((x: any) => x.id === Number(id));
    if (m) Object.assign(form, {
      phone: m.phone,
      username: m.username || m.phone,
      nickname: m.nickname,
      avatar: m.avatar,
      levelId: m.levelId,
      tagIds: m.tags.map((t: any) => t.id),
      status: m.status,
    });
  }
});

async function submit() {
  const payload: any = {
    phone: form.phone,
    nickname: form.nickname,
    avatar: form.avatar,
    levelId: form.levelId,
    tagIds: form.tagIds,
  };
  if (form.username.trim()) payload.username = form.username.trim();
  if (form.password) payload.password = form.password;
  if (isEdit) payload.status = form.status;
  if (isEdit) {
    await memberApi.updateMember(Number(id), payload);
  } else {
    await memberApi.createMember(payload);
  }
  ElMessage.success('保存成功');
  router.push('/member/members');
}
</script>

<template>
  <el-card>
    <h3>{{ isEdit ? '会员详情' : '新增会员' }}</h3>
    <el-form :model="form" label-width="100px" style="max-width: 480px">
      <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item label="账号">
        <el-input v-model="form.username" :placeholder="isEdit ? '登录账号' : '默认手机号'" />
      </el-form-item>
      <el-form-item :label="isEdit ? '重置密码' : '初始密码'">
        <el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空则不修改' : '默认 123456'" />
      </el-form-item>
      <el-form-item v-if="isEdit" label="状态">
        <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
      </el-form-item>
      <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
      <el-form-item label="头像"><ImageUpload v-model="form.avatar" :limit="1" /></el-form-item>
      <el-form-item label="等级">
        <el-select v-model="form.levelId" clearable placeholder="选择等级">
          <el-option v-for="l in levels" :key="l.id" :label="l.name" :value="l.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="标签">
        <el-select v-model="form.tagIds" multiple placeholder="选择标签">
          <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
