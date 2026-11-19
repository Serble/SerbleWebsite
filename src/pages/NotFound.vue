<script>
import LinkedText from '@/components/LinkedText.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { LinkedText, Icon }
}
</script>

<template>
  <div class="notfound-page">

    <div class="notfound-inner">

      <!-- Error code -->
      <div class="error-code">404</div>

      <!-- Heading & description -->
      <h1 class="notfound-title">{{ $t('not-found') }}</h1>
      <p class="notfound-desc"><LinkedText :text="$t('sorry-not-found')" to="/" /></p>

      <!-- Actions -->
      <div class="notfound-actions">
        <RouterLink to="/" class="btn-home">
          <Icon name="home" class="me-2" />
          {{ $t('home') }}
        </RouterLink>
        <button class="btn-back" @click="$router.go(-1)">
          <Icon name="arrowLeft" :size="18" class="me-2" />
          {{ $t('go-back') }}
        </button>
      </div>

      <!-- http.cat image -->
      <div class="cat-card">
        <img
          src="https://http.cat/404"
          :alt="$t('cat-404-alt')"
          class="cat-img"
        />
        <p class="cat-caption">{{ $t('via') }} <a href="https://http.cat" target="_blank" rel="noopener">http.cat</a></p>
      </div>

    </div>

  </div>
</template>

<style scoped>
.notfound-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.notfound-inner {
  text-align: center;
  max-width: 560px;
  width: 100%;
}

.error-code {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text);
  margin-bottom: 12px;
  user-select: none;
}

.notfound-title {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 12px;
}

.notfound-desc {
  font-size: 0.95rem;
  color: var(--text-dim);
  line-height: 1.7;
  margin-bottom: 28px;
}

.notfound-desc :deep(a) {
  color: var(--accent-light);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--t);
}

.notfound-desc :deep(a:hover) {
  border-color: var(--accent-light);
}

.notfound-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.btn-home {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--t), transform var(--t);
}

.btn-home:hover {
  background: var(--accent-hover);
  color: #fff;
}

.btn-home:active,
.btn-back:active {
  transform: scale(0.98);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color var(--t), color var(--t), transform var(--t);
}

.btn-back:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

/* Cat image card */
.cat-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}

.cat-img {
  width: 100%;
  display: block;
  max-height: 420px;
  object-fit: cover;
}

.cat-caption {
  font-size: 0.75rem;
  color: var(--text-faint);
  padding: 8px 0 10px;
  margin: 0;
}

.cat-caption a {
  color: var(--border-strong);
  text-decoration: none;
}

.cat-caption a:hover {
  color: var(--text-dim);
}
</style>