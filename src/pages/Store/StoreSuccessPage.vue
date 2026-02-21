<script>
import { onMounted, onUnmounted } from 'vue';

export default {
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
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="currentColor" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>
      </div>

      <h1 class="success-title">{{ $t('purchase-complete') }}</h1>
      <p class="success-sub">Thank you for your support! Your account has been upgraded.</p>

      <!-- Minions gif -->
      <div class="minions-wrap">
        <img
          src="/images/awesome-minions.gif"
          alt="Awesome minions celebration"
          class="minions-img"
        />
      </div>

      <!-- Action buttons -->
      <div class="success-actions">
        <RouterLink to="/account" class="success-btn success-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>
          </svg>
          {{ $t('account-page') }}
        </RouterLink>
        <RouterLink to="/account/paymentportal" class="success-btn success-btn-outline">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
          </svg>
          {{ $t('manage-subscription') }}
        </RouterLink>
        <RouterLink to="/store" class="success-btn success-btn-outline">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
          </svg>
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
  color: #4ade80;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

.success-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f4f4f5;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.success-sub {
  color: #71717a;
  font-size: 0.95rem;
  margin-bottom: 32px;
}

.minions-wrap {
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
  background: #18181b;
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
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.success-btn-primary {
  background: #16a34a;
  color: #fff;
}

.success-btn-primary:hover {
  background: #15803d;
  color: #fff;
}

.success-btn-outline {
  background: transparent;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
}

.success-btn-outline:hover {
  border-color: #71717a;
  color: #f4f4f5;
}
</style>
