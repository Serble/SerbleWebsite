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
  <div class="oauth-form-container text-center">
    <div>
      <h1 class="h3 mb-3 fw-normal">{{ $t('new-oauth-application') }}</h1>

      <p v-if="error" style="color: red;">{{ $t(error) }}</p>

      <div class="form-floating">
        <input
          type="text"
          class="form-control"
          id="name"
          :placeholder="$t('application-name')"
          maxlength="255"
          v-model="name"
          style="background-color: rgb(34, 34, 34); color: #ffffff"
        >
        <label for="name">{{ $t('application-name') }}</label>
      </div>

      <div style="padding-top: 10px; padding-bottom: 10px;">
        <label class="form-label text-start d-block mb-2">{{ $t('redirect-uris') }}</label>

        <div v-if="redirectUris.length > 0" class="uri-list mb-2">
          <div
            v-for="(uri, index) in redirectUris"
            :key="index"
            class="uri-item d-flex align-items-center justify-content-between"
          >
            <span class="uri-text">{{ uri }}</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger ms-2 flex-shrink-0"
              @click="removeUri(index)"
            >{{ $t('remove') }}</button>
          </div>
        </div>

        <div class="input-group">
          <input
            type="text"
            class="form-control"
            :placeholder="$t('add-redirect-uri')"
            v-model="newUri"
            @keydown="handleUriKeydown"
            style="background-color: rgb(34, 34, 34); color: #ffffff"
          >
          <button type="button" class="btn btn-outline-secondary" @click="addUri">{{ $t('add') }}</button>
        </div>
      </div>

      <div class="form-floating" style="padding-top: 10px; padding-bottom: 10px">
        <textarea
          class="form-control"
          id="desc"
          :placeholder="$t('description')"
          maxlength="1024"
          v-model="description"
          style="background-color: rgb(34, 34, 34); color: #ffffff"
        ></textarea>
        <label for="desc">{{ $t('description') }}</label>
      </div>

      <br/>

      <button class="w-100 btn btn-lg btn-primary" @click="submit">{{ $t('create') }}</button>
    </div>
  </div>
</template>

<style scoped>
.oauth-form-container {
  width: 100%;
  max-width: 560px;
  padding: 15px;
  margin: auto;
}

.uri-list {
  border: 1px solid #444;
  border-radius: 6px;
  overflow: hidden;
}

.uri-item {
  padding: 6px 10px;
  border-bottom: 1px solid #444;
  background-color: rgb(34, 34, 34);
}

.uri-item:last-child {
  border-bottom: none;
}

.uri-text {
  word-break: break-all;
  color: #ffffff;
  font-size: 0.9rem;
  text-align: left;
}
</style>