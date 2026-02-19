<script>
export default {};
</script>

<template>
  <div class="contact-page">

    <div class="contact-inner">

      <!-- Header -->
      <div class="contact-header">
        <div class="contact-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
          </svg>
        </div>
        <h1 class="contact-title">{{ $t('contact-us') }}</h1>
        <p class="contact-sub">Reach out through any of the methods below.</p>
      </div>

      <!-- Contact cards -->
      <div class="contact-cards">

        <a href="mailto:admin@serble.net" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(59,130,246,0.12); color: #60a5fa;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414zM0 4.697v7.104l5.803-3.558zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586zm3.436-.586L16 11.801V4.697z"/>
            </svg>
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('admin-email') }}</span>
            <span class="card-value">admin@serble.net</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="card-arrow">
            <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
          </svg>
        </a>

        <a href="mailto:support@serble.net" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(16,185,129,0.12); color: #34d399;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a7 7 0 1 1 14 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5"/>
            </svg>
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('support-email') }}</span>
            <span class="card-value">support@serble.net</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="card-arrow">
            <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
          </svg>
        </a>

        <RouterLink to="/discord" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(88,101,242,0.12); color: #7289da;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
            </svg>
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('discord-invite') }}</span>
            <span class="card-value">discord.com/invite/fzvcNhW</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="card-arrow">
            <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
          </svg>
        </RouterLink>

      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.contact-inner {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Header */
.contact-header {
  text-align: center;
}

.contact-icon {
  display: flex;
  justify-content: center;
  color: #60a5fa;
  margin-bottom: 14px;
}

.contact-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f4f4f5;
  margin-bottom: 8px;
}

.contact-sub {
  font-size: 0.9rem;
  color: #71717a;
  margin: 0;
}

/* Cards */
.contact-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 18px 20px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.contact-card:hover {
  border-color: #3f3f46;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  color: inherit;
}

.card-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.card-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #71717a;
}

.card-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #d4d4d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-arrow {
  color: #3f3f46;
  flex-shrink: 0;
  transition: color 0.15s, transform 0.15s;
}

.contact-card:hover .card-arrow {
  color: #71717a;
  transform: translateX(2px);
}
</style>
