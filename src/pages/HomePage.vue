<script>
export default {
  computed: {
    welcomeText() {
      return this.$t('welcome-to-serble')
        .replace('[', '')
        .replace(']', '');
    },
    lookingForMc() {
      return this.$t('looking-for-mc-server')
        .replace('[', '<a href="https://old.serble.net" target="_blank" rel="noopener">')
        .replace(']', '</a>');
    }
  }
}
</script>

<template>
  <main>

    <!-- ── Hero ── -->
    <section class="hero">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>
      <div class="hero-inner">
        <img src="/images/icon.png" alt="Serble" class="hero-icon" />
        <h1 class="hero-title">{{ $t('serble') }}</h1>
        <p class="hero-sub">{{ welcomeText }}</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg hero-btn" href="/discord/">
            <!-- Discord icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" class="me-2">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
            </svg>
            {{ $t('serble-discord') }}
          </a>
          <a class="btn btn-outline-light btn-lg hero-btn" href="https://status.serble.net" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" class="me-2">
              <path d="M8 16a8 8 0 1 0 0-16A8 8 0 0 0 8 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
            </svg>
            {{ $t('uptime-monitor') }}
          </a>
        </div>
        <p class="hero-mc" v-html="lookingForMc"></p>
      </div>
    </section>

    <!-- ── Feature cards ── -->
    <section class="features-section">
      <div class="features-grid">

        <RouterLink to="/store" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(99,102,241,0.15); color: #818cf8;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('store') }}</h5>
          <p class="feature-desc">{{ $t('serble-paid-plans') }}</p>
          <span class="feature-link">{{ $t('store') }} →</span>
        </RouterLink>

        <RouterLink to="/notes" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(16,185,129,0.15); color: #34d399;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1"/>
              <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2z"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('vault') }}</h5>
          <p class="feature-desc">{{ $t('notes') }}</p>
          <span class="feature-link">{{ $t('vault') }} →</span>
        </RouterLink>

        <RouterLink to="/wordmaster" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(245,158,11,0.15); color: #fbbf24;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13s1.12-2 2.5-2 2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2S10 12.105 10 11s1.12-2 2.5-2 2.5.896 2.5 2m-9 0c0-.663-.19-1.279-.52-1.79l3.7-5.55A1.5 1.5 0 0 0 9 3H7a1.5 1.5 0 0 0-1.5 1.5v1a1.5 1.5 0 0 0 1.5 1.5h1v3.5c0 .663.19 1.279.52 1.79l-3.7 5.55A1.5 1.5 0 0 0 5 18h2a1.5 1.5 0 0 0 1.5-1.5v-1A1.5 1.5 0 0 0 7 14H6z"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('games') }}</h5>
          <p class="feature-desc">{{ $t('word-master') }}</p>
          <span class="feature-link">{{ $t('games') }} →</span>
        </RouterLink>

        <RouterLink to="/oauthapps" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(59,130,246,0.15); color: #60a5fa;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('my-applications') }}</h5>
          <p class="feature-desc">{{ $t('new-oauth-application') }}</p>
          <span class="feature-link">{{ $t('my-applications') }} →</span>
        </RouterLink>

        <a href="/discord/" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(88,101,242,0.15); color: #7289da;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('serble-discord') }}</h5>
          <p class="feature-desc">{{ $t('contact') }}</p>
          <span class="feature-link">{{ $t('serble-discord') }} →</span>
        </a>

        <a href="https://status.serble.net" target="_blank" rel="noopener" class="feature-card">
          <div class="feature-icon-wrap" style="background: rgba(236,72,153,0.15); color: #f472b6;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16a8 8 0 1 0 0-16A8 8 0 0 0 8 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
            </svg>
          </div>
          <h5 class="feature-title">{{ $t('uptime-monitor') }}</h5>
          <p class="feature-desc">{{ $t('status') }}</p>
          <span class="feature-link">{{ $t('status') }} →</span>
        </a>

      </div>
    </section>

  </main>
</template>

<style scoped>
/* ── Hero ── */
.hero {
  position: relative;
  overflow: hidden;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111113;
  padding: 80px 24px 60px;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.25;
  pointer-events: none;
}

.hero-glow-1 {
  width: 480px;
  height: 480px;
  background: #3b82f6;
  top: -120px;
  left: -80px;
}

.hero-glow-2 {
  width: 380px;
  height: 380px;
  background: #8b5cf6;
  bottom: -100px;
  right: -60px;
}

.hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 700px;
}

.hero-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  border-radius: 18px;
  box-shadow: 0 0 40px rgba(59, 130, 246, 0.3);
}

.hero-title {
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 40%, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 1.05rem;
  color: #9ca3af;
  line-height: 1.7;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 600;
}

.hero-mc {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0;
}

.hero-mc :deep(a) {
  color: #60a5fa;
  text-decoration: none;
}

.hero-mc :deep(a:hover) {
  text-decoration: underline;
}

/* ── Feature cards ── */
.features-section {
  padding: 48px 24px 64px;
  max-width: 1000px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.feature-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.feature-card:hover {
  border-color: #3f3f46;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: inherit;
  text-decoration: none;
}

.feature-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f4f4f5;
  margin: 0;
}

.feature-desc {
  font-size: 0.85rem;
  color: #71717a;
  margin: 0;
  flex-grow: 1;
}

.feature-link {
  font-size: 0.82rem;
  font-weight: 600;
  color: #60a5fa;
  margin-top: 4px;
}
</style>
