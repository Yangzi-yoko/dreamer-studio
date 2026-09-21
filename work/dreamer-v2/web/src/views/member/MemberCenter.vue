<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

const router = useRouter();
const phone = sessionStorage.getItem('member_phone') || '';
const nickname = ref('');
const avatar = ref('');
const levelName = ref('普通用户');
const levelId = ref(0);
const points = ref(0);
const wallet = ref(0);
const packages = ref<any[]>([]);
const coupons = ref<any[]>([]);
const packageNames = ref<Record<number, string>>({});
const memberId = ref(0);

const menuItems = [
  { icon: '💰', label: '会员充值', path: '/member/wallet', badge: '满赠' },
  { icon: '📅', label: '预约记录', path: '/orders' },
  { icon: '📋', label: '我的订单', path: '/orders' },
  { icon: '⭐', label: '我的权益', path: '/member/points' },
  { icon: '🛒', label: '购物车', path: '/items' },
  { icon: '💬', label: '我的消息', path: '/member' },
  { icon: '📝', label: '我的表单', path: '/member' },
  { icon: '🎫', label: '我的会员卡', path: '/member/packages' },
];

onMounted(async () => {
  try {
    const me: any = await api.me();
    avatar.value = me?.avatar || '';
    nickname.value = me?.nickname || me?.username || phone.slice(-4);
    levelName.value = me?.levelName || '普通用户';
    levelId.value = me?.levelId || 0;
    memberId.value = me?.memberId || me?.id || 0;
  } catch {}
  try {
    const p: any = await api.memberPoints();
    points.value = p.account?.balance ?? 0;
  } catch {}
  try {
    const w: any = await api.memberWallet();
    wallet.value = w.account?.balance ?? 0;
  } catch {}
  try {
    packages.value = (await api.myPackages()) as any[];
  } catch {}
  try {
    const mall: any = await api.packageMall();
    (mall || []).forEach((c: any) => { packageNames.value[c.id] = c.name; });
  } catch {}
  try {
    coupons.value = (await api.myCoupons()) as any[];
  } catch {}
});
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-title">我的主页</div>
    </div>

    <!-- User Card -->
    <div class="user-card">
      <div class="user-card-inner">
        <div v-if="memberId" class="user-info">
          <div class="avatar-wrapper">
            <img v-if="avatar" :src="avatar" class="avatar" alt="头像" />
            <div v-else class="avatar-placeholder">G</div>
          </div>
          <div class="user-details">
            <div class="nickname">{{ nickname }} <span class="edit-icon">✏️</span></div>
            <div class="level-badge">
              <span class="level-icon">💎</span>
              <span>{{ levelName }}</span>
            </div>
          </div>
          <div class="qr-code" @click="router.push('/member')">
            <div class="qr-icon">📊</div>
            <div class="qr-text">会员码</div>
          </div>
        </div>
        <div v-else class="user-info">
          <div class="avatar-wrapper">
            <div class="avatar-placeholder">G</div>
          </div>
          <div class="user-details">
            <div class="nickname">光海</div>
          </div>
        </div>
        
        <div v-if="memberId" class="card-number">卡号：{{ memberId }}</div>
        <div v-if="memberId" class="level-benefit">
          <span>尊享更多等级权益</span>
          <button class="benefit-btn" @click="router.push('/member/level-rules')">了解详情</button>
        </div>
        <button v-else class="activate-btn" @click="router.push('/login')">立即激活</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-item" @click="router.push('/member/wallet')">
        <div class="stat-icon wallet-icon">💰</div>
        <div class="stat-label">余额</div>
        <div class="stat-value">{{ wallet }}元</div>
      </div>
      <div class="stat-item" @click="router.push('/member/points')">
        <div class="stat-icon points-icon">⭐</div>
        <div class="stat-label">积分</div>
        <div class="stat-value">{{ points }}</div>
      </div>
      <div class="stat-item" @click="router.push('/member/packages')">
        <div class="stat-icon package-icon">📦</div>
        <div class="stat-label">卡项</div>
        <div class="stat-value">{{ packages.length }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon coupon-icon">🎫</div>
        <div class="stat-label">优惠券</div>
        <div class="stat-value">{{ coupons.length }}</div>
      </div>
    </div>

    <!-- Menu Grid -->
    <div class="menu-grid">
      <div 
        v-for="item in menuItems" 
        :key="item.label" 
        class="menu-item"
        @click="router.push(item.path)"
      >
        <div class="menu-icon">{{ item.icon }}</div>
        <div class="menu-label">{{ item.label }}</div>
        <div v-if="item.badge" class="menu-badge">{{ item.badge }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 60px;
}

.header {
  background: #fff;
  padding: 16px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.user-card {
  padding: 16px;
}

.user-card-inner {
  background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
  border-radius: 16px;
  padding: 24px 20px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.user-card-inner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255,255,255,0.3);
}

.avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #666 0%, #444 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  border: 3px solid rgba(255,255,255,0.3);
}

.user-details {
  flex: 1;
}

.nickname {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.edit-icon {
  font-size: 14px;
  margin-left: 4px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #d4a574 0%, #c9956a 100%);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #fff;
}

.level-icon {
  font-size: 12px;
}

.qr-code {
  text-align: center;
  cursor: pointer;
}

.qr-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.qr-text {
  font-size: 10px;
  color: rgba(255,255,255,0.7);
}

.card-number {
  margin-top: 16px;
  font-size: 14px;
  color: rgba(255,255,255,0.8);
  position: relative;
  z-index: 1;
}

.level-benefit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 14px;
  position: relative;
  z-index: 1;
}

.benefit-btn {
  background: #d4a574;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
}

.activate-btn {
  width: 100%;
  margin-top: 16px;
  background: linear-gradient(135deg, #d4a574 0%, #c9956a 100%);
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px;
}

.stat-item {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.wallet-icon {
  background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 100%);
}

.points-icon {
  background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 100%);
}

.package-icon {
  background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 100%);
}

.coupon-icon {
  background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 100%);
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #fff;
  margin: 16px;
  border-radius: 12px;
  overflow: hidden;
}

.menu-item {
  position: relative;
  background: #fff;
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
}

.menu-item:active {
  background: #f5f5f5;
}

.menu-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.menu-label {
  font-size: 13px;
  color: #333;
}

.menu-badge {
  position: absolute;
  top: 8px;
  right: 20%;
  background: #ff6b35;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}
</style>
