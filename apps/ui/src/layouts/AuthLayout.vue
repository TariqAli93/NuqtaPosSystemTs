<template>
  <v-app>
    <v-main class="auth-layout bg-surface">
      <!-- Right: Form Area -->
      <section class="auth-form-area">
        <router-view />
      </section>

      <!-- Left: Brand panel -->
      <aside class="auth-brand">
        <div class="auth-brand__overlay" />
        <img
          src="@/assets/auth-illustration.jpg"
          alt=""
          class="auth-brand__img"
          aria-hidden="true"
        />
        <div class="auth-brand__content">
          <h1 class="auth-brand__title">{{ t('common.appName') }}</h1>
          <p class="auth-brand__tagline">{{ t('common.appTagline') }}</p>
        </div>
      </aside>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
</script>

<style scoped lang="scss">
.auth-layout {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

/* ---------- Brand panel (left) ---------- */
.auth-brand {
  position: relative;
  flex: 1;
  display: none;
  background: #0f172a;
}
@media (min-width: 960px) {
  .auth-brand {
    display: flex;
    align-items: flex-end;
  }
}

.auth-brand__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1;
}

.auth-brand__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.2) 100%);
  z-index: 1;
}

.auth-brand__content {
  position: relative;
  z-index: 2;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.auth-brand__logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

.auth-brand__title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.auth-brand__tagline {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  max-width: 40ch;
  line-height: 1.6;
}

/* ---------- Form area (right) ---------- */
.auth-form-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
  max-width: 100%;
}
@media (min-width: 960px) {
  .auth-form-area {
    width: 480px;
    flex-shrink: 0;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.05);
    z-index: 10;
  }
}
</style>
