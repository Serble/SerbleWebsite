<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getUserApps, deleteOAuthApp } from '@/assets/js/serble.js';

export default {
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const apps = ref(null);

    onMounted(async () => {
      const result = await getUserApps();
      console.log('getUserApps result:', result);
      if (result.success) {
        console.log('Apps data:', result.apps);
        apps.value = result.apps;
      } else {
        console.error('Failed to load apps:', result.error);
        apps.value = [];
      }
    });

    async function onDelete(appId) {
      const result = await deleteOAuthApp(appId);
      if (result.success) {
        apps.value = apps.value.filter(a => a.Id !== appId);
      }
    }

    function onEdit(appId) {
      router.push('/oauthapps/edit?appid=' + appId);
    }

    function onNew() {
      router.push('/oauthapps/new');
    }

    function copySecret(secret) {
      navigator.clipboard.writeText(secret);
    }

    return { apps, onDelete, onEdit, onNew, copySecret };
  }
};
</script>

<template>
  <div class="text-center">
    <h3>{{ $t('your-oauth-apps') }}</h3>

    <div v-if="apps === null">
      <p>{{ $t('loading') }}</p>
    </div>

    <div v-else-if="apps.length === 0">
      <p>{{ $t('no-apps') }}</p>
    </div>

    <div v-else style="padding-left: 50px; padding-right: 50px;">
      <div class="row align-items-md-stretch">
        <div v-for="app in apps" :key="app.Id" class="col-md-6" style="padding-bottom: 20px;">
          <div class="h-100 p-5 bg-dark border rounded-3">
            <h2>{{ app.Name }}</h2>
            <p>{{ app.Description }}</p>
            <p>{{ $t('id') }}: {{ app.Id }}</p>
            <p>{{ $t('client-secret') }}: <button class="btn btn-link" @click="copySecret(app.ClientSecret)">{{ $t('click-to-copy') }}</button></p>
            <div class="mb-2">
              <strong>{{ $t('redirect-uris') }}:</strong>
              <ul class="redirect-uri-list mt-1 mb-0">
                <li v-for="uri in (app.RedirectUri || '').split(';').map(u => u.trim()).filter(Boolean)" :key="uri" class="redirect-uri-item">{{ uri }}</li>
              </ul>
            </div>
            <button class="btn btn-outline-secondary" type="button" @click="onEdit(app.Id)">{{ $t('edit') }}</button>
            <button class="btn btn-outline-danger" type="button" @click="onDelete(app.Id)">{{ $t('delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <button class="btn btn-lg btn-success" @click="onNew">{{ $t('new-app') }}</button>
  </div>
  <br/>
</template>

<style scoped>
.redirect-uri-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.redirect-uri-item {
  word-break: break-all;
  font-size: 0.85rem;
  color: #ccc;
  padding: 2px 0;
}
</style>
