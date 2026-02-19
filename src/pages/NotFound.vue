<script>
export default {
  computed: {
    sorryText() {
      return this.$t('sorry-not-found')
        .replace('[', '<a href="/">')
        .replace(']', '</a>');
    }
  }
}
</script>

<template>
  <div class="notfound-page">

    <div class="notfound-inner">

      <!-- Error code -->
      <div class="error-code">404</div>

      <!-- Heading & description -->
      <h1 class="notfound-title">{{ $t('not-found') }}</h1>
      <p class="notfound-desc" v-html="sorryText"></p>

      <!-- Actions -->
      <div class="notfound-actions">
        <RouterLink to="/" class="btn-home">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5v-4h3v4H10a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354z"/>
            <path d="m8 1.293 6 6V15h-3v-4H5v4H2V7.293z"/>
          </svg>
          {{ $t('home') }}
        </RouterLink>
        <button class="btn-back" @click="$router.go(-1)">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
          </svg>
          Go back
        </button>
      </div>

      <!-- http.cat image -->
      <div class="cat-card">
        <img
          src="https://http.cat/404"
          alt="A cat hiding under paper — HTTP 404"
          class="cat-img"
        />
        <p class="cat-caption">via <a href="https://http.cat" target="_blank" rel="noopener">http.cat</a></p>
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
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  user-select: none;
}

.notfound-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f4f4f5;
  margin-bottom: 12px;
}

.notfound-desc {
  font-size: 0.95rem;
  color: #71717a;
  line-height: 1.7;
  margin-bottom: 28px;
}

.notfound-desc :deep(a) {
  color: #60a5fa;
  text-decoration: none;
}

.notfound-desc :deep(a:hover) {
  text-decoration: underline;
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
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}

.btn-home:hover {
  background: #1d4ed8;
  color: #fff;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-back:hover {
  border-color: #71717a;
  color: #f4f4f5;
}

/* Cat image card */
.cat-card {
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
  background: #18181b;
}

.cat-img {
  width: 100%;
  display: block;
  max-height: 420px;
  object-fit: cover;
}

.cat-caption {
  font-size: 0.75rem;
  color: #52525b;
  padding: 8px 0 10px;
  margin: 0;
}

.cat-caption a {
  color: #3f3f46;
  text-decoration: none;
}

.cat-caption a:hover {
  color: #71717a;
}
</style>