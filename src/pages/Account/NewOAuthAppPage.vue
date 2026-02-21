<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { createOAuthApp } from '@/assets/js/serble.js';

export default {
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const name = ref('');
    const description = ref('');
    const error = ref('');
    const redirectUris = ref([]);
    const newUri = ref('');

    function addUri() {
      const trimmed = newUri.value.trim();
      if (trimmed && !redirectUris.value.includes(trimmed)) {
        redirectUris.value.push(trimmed);
      }
      newUri.value = '';
    }

    function removeUri(index) {
      redirectUris.value.splice(index, 1);
    }

    function handleUriKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addUri();
      }
    }

    async function submit() {
      error.value = '';

      if (!name.value.trim() || redirectUris.value.length === 0) {
        error.value = 'null-fields';
        return;
      }

      const result = await createOAuthApp(
        name.value.trim(),
        description.value.trim(),
        redirectUris.value.join(';')
      );

      if (!result.success) {
        error.value = 'try-again-in-5';
        return;
      }

      router.push('/oauthapps');
    }

    return { name, description, error, redirectUris, newUri, addUri, removeUri, handleUriKeydown, submit };
  }
};
</script>

<template>
  <div class="form-page">

    <!-- Page header -->
    <div class="d-flex align-items-center gap-3 mb-4">
      <RouterLink to="/oauthapps" class="btn btn-sm btn-outline-secondary back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
        </svg>
      </RouterLink>
      <div>
        <h3 class="mb-0">{{ $t('new-oauth-application') }}</h3>
        <p class="text-muted mb-0" style="font-size:0.85rem;">Fill in the details for your new application</p>
      </div>
    </div>

    <!-- Error alert -->
    <div v-if="error" class="alert alert-danger py-2" role="alert">{{ $t(error) }}</div>

    <!-- Form card -->
    <div class="form-card bg-dark border rounded-3">

      <!-- Name -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label">{{ $t('application-name') }}</label>
        <input
          type="text"
          class="form-control dark-input"
          id="name"
          :placeholder="$t('application-name')"
          maxlength="255"
          v-model="name"
        >
      </div>

      <!-- Description -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label">{{ $t('description') }}</label>
        <p class="section-hint">Optional. Shown to users when they authorize your app.</p>
        <textarea
          class="form-control dark-input"
          id="desc"
          :placeholder="$t('description')"
          maxlength="1024"
          rows="3"
          v-model="description"
        ></textarea>
      </div>

      <!-- Redirect URIs -->
      <div class="form-section">
        <label class="section-label">{{ $t('redirect-uris') }}</label>
        <p class="section-hint">Add one or more URIs that users can be redirected to after authorization. Press Enter or click Add.</p>

        <div v-if="redirectUris.length > 0" class="uri-list mb-3">
          <div
            v-for="(uri, index) in redirectUris"
            :key="index"
            class="uri-item d-flex align-items-center justify-content-between"
          >
            <span class="uri-text">{{ uri }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger ms-3 flex-shrink-0" @click="removeUri(index)">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="input-group">
          <input
            type="text"
            class="form-control dark-input"
            :placeholder="$t('add-redirect-uri')"
            v-model="newUri"
            @keydown="handleUriKeydown"
          >
          <button type="button" class="btn btn-outline-secondary" @click="addUri">{{ $t('add') }}</button>
        </div>
      </div>

    </div>

    <!-- Actions -->
    <div class="d-flex justify-content-end gap-2 mt-4">
      <RouterLink to="/oauthapps" class="btn btn-outline-secondary">{{ $t('cancel') }}</RouterLink>
      <button class="btn btn-primary px-4" @click="submit">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
        </svg>
        {{ $t('create') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.form-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px;
}

.back-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.form-card {
  overflow: hidden;
}

.form-section {
  padding: 20px 24px;
}

.section-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 8px;
}

.section-hint {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 10px;
}

.dark-input {
  background-color: rgb(28, 28, 28);
  color: #fff;
  border-color: #444;
}

.dark-input::placeholder {
  color: #888;
}

.dark-input:focus {
  background-color: rgb(28, 28, 28);
  color: #fff;
  border-color: #6ea8fe;
  box-shadow: 0 0 0 0.2rem rgba(110, 168, 254, 0.15);
}

.uri-list {
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  overflow: hidden;
}

.uri-item {
  padding: 8px 12px;
  border-bottom: 1px solid #3a3a3a;
  background-color: rgb(28, 28, 28);
}

.uri-item:last-child {
  border-bottom: none;
}

.uri-text {
  word-break: break-all;
  color: #ccc;
  font-size: 0.85rem;
}
</style>