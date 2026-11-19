<script>
import { onMounted, onUnmounted } from 'vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { Icon },
  setup() {
    let animFrame = null;
    let particles = [];

    function randomBetween(a, b) {
      return a + Math.random() * (b - a);
    }

    function launchConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colours = ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa','#f472b6'];

      for (let i = 0; i < 180; i++) {
        particles.push({
          x: randomBetween(0, canvas.width),
          y: randomBetween(-canvas.height, 0),
          w: randomBetween(6, 14),
          h: randomBetween(10, 20),
          colour: colours[Math.floor(Math.random() * colours.length)],
          rot: randomBetween(0, Math.PI * 2),
          rotSpeed: randomBetween(-0.05, 0.05),
          vx: randomBetween(-1.5, 1.5),
          vy: randomBetween(2, 5),
          alpha: 1,
        });
      }

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.colour;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.rotSpeed;
          if (p.y > canvas.height * 0.7) p.alpha -= 0.012;
        });
        particles = particles.filter(p => p.alpha > 0);
        if (particles.length > 0) {
          animFrame = requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      draw();
    }

    onMounted(() => {
      launchConfetti();
    });

    onUnmounted(() => {
      if (animFrame) cancelAnimationFrame(animFrame);
    });
  }
};
</script>

<template>
  <div class="success-page">
    <!-- Confetti canvas -->
    <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

    <div class="success-inner">

      <!-- Icon -->
      <div class="success-icon">
        <Icon name="checkCircle" :size="56" />
      </div>

      <h1 class="success-title">{{ $t('purchase-complete') }}</h1>
      <p class="success-sub">{{ $t('purchase-thanks') }}</p>

      <!-- Minions gif -->
      <div class="minions-wrap">
        <img
          src="/images/awesome-minions.gif"
          :alt="$t('celebration-alt')"
          class="minions-img"
        />
      </div>

      <!-- Action buttons -->
      <div class="success-actions">
        <RouterLink to="/account" class="success-btn success-btn-primary">
          <Icon name="person" class="me-2" />
          {{ $t('account-page') }}
        </RouterLink>
        <RouterLink to="/account/paymentportal" class="success-btn success-btn-outline">
          <Icon name="creditCard" class="me-2" />
          {{ $t('manage-subscription') }}
        </RouterLink>
        <RouterLink to="/store" class="success-btn success-btn-outline">
          <Icon name="cart" class="me-2" />
          {{ $t('store') }}
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.success-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  position: relative;
}

.confetti-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

.success-inner {
  text-align: center;
  max-width: 560px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.success-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--success);
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

.success-title {
  font-size: 2.2rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.success-sub {
  color: var(--text-dim);
  font-size: 0.95rem;
  margin-bottom: 32px;
}

.minions-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
  margin-bottom: 32px;
  display: inline-block;
  max-width: 100%;
}

.minions-img {
  display: block;
  max-width: 100%;
  height: auto;
}

.success-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.success-btn {
  display: inline-flex;
  align-items: center;
  padding: 9px 20px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--t), border-color var(--t), color var(--t), transform var(--t);
}

.success-btn:active {
  transform: scale(0.98);
}

.success-btn-primary {
  background: var(--accent);
  color: #fff;
}

.success-btn-primary:hover {
  background: var(--accent-hover);
  color: #fff;
}

.success-btn-outline {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.success-btn-outline:hover {
  border-color: var(--text-dim);
  color: var(--text);
}
</style>
