<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api';
import AppImage from '../../components/AppImage.vue';
import { parseImages } from '../../utils/images';

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);
const item = ref<any>(null);
const activeIndex = ref(0);

const images = computed(() => parseImages(item.value?.images));

onMounted(async () => {
  try {
    const res: any = await api.items(1, 100);
    item.value = (res.list || []).find((i: any) => i.id === id);
  } catch {}
});
</script>

<template>
  <div v-if="item" style="padding: 16px">
    <template v-if="images.length">
      <AppImage
        :src="images[activeIndex]"
        :ratio="'4 / 3'"
        radius="10px"
        preview
        :preview-list="images"
      />
      <div v-if="images.length > 1" class="thumbs">
        <img
          v-for="(img, i) in images"
          :key="i"
          :src="img"
          class="thumbs__item"
          :class="{ 'thumbs__item--active': i === activeIndex }"
          @click="activeIndex = i"
          alt=""
        />
      </div>
    </template>
    <AppImage v-else :src="''" :ratio="'4 / 3'" radius="10px" alt="暂无商品图片" />

    <h2>{{ item.name }}</h2>
    <p>{{ item.description }}</p>
    <div class="price-row">单价 ¥{{ item.unitPrice }}{{ item.billingType === 'day' ? '/天' : '/时段' }}</div>
    <div class="price-row">押金 ¥{{ item.deposit }}</div>
    <el-button type="primary" style="width: 100%; margin-top: 16px" @click="router.push(`/item-rental/${item.id}`)">立即租用</el-button>
  </div>
  <el-empty v-else description="商品不存在" />
</template>

<style scoped>
.thumbs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;
}

.thumbs__item {
  width: 72px;
  height: 54px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.thumbs__item--active {
  border-color: #409eff;
}

.price-row {
  color: #e6a23c;
  margin-top: 4px;
}
</style>
