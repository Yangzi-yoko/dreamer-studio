<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

const router = useRouter();
const levels = ref<any[]>([]);
const currentLevelId = ref(0);
const currentLevel = ref<any>(null);
const memberInfo = ref<any>(null);
const loading = ref(true);

// Default icons and colors for levels without custom settings
const defaultIcons = ['👤', '⭐', '💎', '🏆', '👑', '🌟'];
const defaultColors = ['#999999', '#f0c040', '#b87333', '#e74c3c', '#9c27b0', '#ff6b35'];

// Get icon for level (use custom or default)
function getLevelIcon(lvl: any, index: number): string {
  return lvl?.icon || defaultIcons[index % defaultIcons.length];
}

// Get color for level (use custom or default)
function getLevelColor(lvl: any, index: number): string {
  return lvl?.color || defaultColors[index % defaultColors.length];
}

// Get discount text
function getDiscountText(lvl: any): string {
  if (lvl?.discount) {
    return lvl.discount + '折';
  }
  return '无折扣';
}

// Get upgrade condition text
function getUpgradeCondition(_current: any, next: any): string {
  if (!next) return '已达最高等级';
  const conditions = [];
  if (next.minSpend > 0) {
    conditions.push(`累计消费满¥${next.minSpend}`);
  }
  if (next.minOrders > 0) {
    conditions.push(`订单满${next.minOrders}笔`);
  }
  return conditions.length ? conditions.join('或') : '注册即可获得';
}

// Calculate progress to next level
function getProgress(): number {
  if (!currentLevel.value || !memberInfo.value) return 0;
  const currentIndex = levels.value.findIndex(l => l.id === currentLevelId.value);
  if (currentIndex >= levels.value.length - 1) return 100;
  
  const nextLevel = levels.value[currentIndex + 1];
  if (!nextLevel) return 100;
  
  const currentSpend = memberInfo.value.totalSpend || 0;
  const targetSpend = nextLevel.minSpend || 0;
  
  if (targetSpend <= 0) return 100;
  return Math.min(100, Math.round((currentSpend / targetSpend) * 100));
}

// Get next level info
const nextLevel = computed(() => {
  if (!currentLevelId.value) return null;
  const currentIndex = levels.value.findIndex(l => l.id === currentLevelId.value);
  if (currentIndex >= levels.value.length - 1) return null;
  return levels.value[currentIndex + 1];
});

onMounted(async () => {
  try {
    // Load levels from backend
    const res: any = await api.levelPage(1, 100);
    levels.value = (res?.list || []).sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
    
    // Load current member info
    try {
      const me: any = await api.me();
      memberInfo.value = me;
      currentLevelId.value = me?.levelId || 0;
      
      // Find current level
      if (currentLevelId.value) {
        currentLevel.value = levels.value.find(l => l.id === currentLevelId.value);
      }
      
      // If no level set, use first level
      if (!currentLevel.value && levels.value.length > 0) {
        currentLevel.value = levels.value[0];
        currentLevelId.value = levels.value[0].id;
      }
    } catch {}
  } catch (e) {
    console.error('Failed to load levels:', e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="back-btn" @click="router.back()">←</div>
      <div class="header-title">等级规则</div>
      <div class="header-right">•••</div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>

    <template v-else>
      <!-- Current Level Card -->
      <div class="current-level-card">
        <div class="level-icon-large">{{ getLevelIcon(currentLevel, 0) }}</div>
        <div class="level-name">{{ currentLevel?.name || '普通用户' }}</div>
      </div>

      <!-- Next Level Progress -->
      <div v-if="nextLevel" class="next-level-card">
        <div class="next-level-info">
          <div class="next-label">下一等级：</div>
          <div class="next-name" :style="{ color: getLevelColor(nextLevel, levels.indexOf(nextLevel)) }">
            {{ nextLevel.name }}
          </div>
        </div>
        <div class="next-condition">{{ getUpgradeCondition(currentLevel, nextLevel) }}</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: getProgress() + '%' }"></div>
        </div>
        <div class="progress-text">已完成 {{ getProgress() }}%</div>
      </div>
      <div v-else class="next-level-card max-level">
        <div class="max-level-text">🎉 恭喜！您已达最高等级</div>
      </div>

      <!-- Level Rules List -->
      <div class="rules-section">
        <div class="rules-title">会员等级规则</div>
        
        <div v-for="(level, index) in levels" :key="level.id" class="level-item" :class="{ 'is-current': level.id === currentLevelId }">
          <div class="level-header">
            <div class="level-icon" :style="{ background: getLevelColor(level, index) }">
              {{ getLevelIcon(level, index) }}
            </div>
            <div class="level-info">
              <div class="level-name" :style="{ color: getLevelColor(level, index) }">
                {{ level.name }}
                <span v-if="level.id === currentLevelId" class="current-badge">当前</span>
              </div>
              <div class="level-condition">{{ getUpgradeCondition(null, level) }}</div>
            </div>
            <div class="level-arrow">⌄</div>
          </div>
          
          <div class="level-benefits">
            <div class="benefit-item">
              <div class="benefit-label">折扣权益</div>
              <div class="benefit-value" :class="{ 'has-discount': level.discount }">
                {{ getDiscountText(level) }}
              </div>
            </div>
            <div v-if="level.minSpend > 0" class="benefit-item">
              <div class="benefit-label">累计消费</div>
              <div class="benefit-value">满¥{{ level.minSpend }}</div>
            </div>
            <div v-if="level.minOrders > 0" class="benefit-item">
              <div class="benefit-label">订单数量</div>
              <div class="benefit-value">满{{ level.minOrders }}笔</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="levels.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂未配置会员等级</div>
        <div class="empty-hint">请在后台管理系统中配置会员等级</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 20px;
  cursor: pointer;
  width: 32px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  width: 32px;
  text-align: right;
  color: #999;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #999;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top-color: #3da9fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.current-level-card {
  background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
  padding: 24px;
  text-align: center;
  color: #fff;
}

.level-icon-large {
  font-size: 48px;
  margin-bottom: 8px;
}

.current-level-card .level-name {
  font-size: 20px;
  font-weight: 600;
}

.next-level-card {
  margin: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
  border-radius: 12px;
  border-left: 4px solid #f0c040;
}

.next-level-card.max-level {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-left-color: #4caf50;
}

.next-level-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.next-label {
  font-size: 14px;
  color: #666;
}

.next-name {
  font-size: 16px;
  font-weight: 600;
}

.next-condition {
  font-size: 13px;
  color: #999;
  margin-bottom: 12px;
}

.progress-bar {
  height: 6px;
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f0c040 0%, #ff9800 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 12px;
  color: #999;
  text-align: right;
}

.max-level-text {
  font-size: 16px;
  font-weight: 500;
  color: #4caf50;
}

.rules-section {
  margin: 16px;
}

.rules-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.level-item {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 2px solid transparent;
}

.level-item.is-current {
  border-color: #3da9fc;
}

.level-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.level-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.level-info {
  flex: 1;
}

.level-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-badge {
  font-size: 11px;
  background: #3da9fc;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: normal;
}

.level-condition {
  font-size: 12px;
  color: #999;
}

.level-arrow {
  font-size: 16px;
  color: #ccc;
}

.level-benefits {
  padding: 0 16px 16px;
  margin-left: 52px;
}

.benefit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.benefit-item:last-child {
  border-bottom: none;
}

.benefit-label {
  font-size: 13px;
  color: #666;
}

.benefit-value {
  font-size: 13px;
  color: #333;
}

.benefit-value.has-discount {
  color: #ff6b35;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #ccc;
}
</style>
