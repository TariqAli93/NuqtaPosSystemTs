<template>
  <v-app>
    <v-main class="auth-layout">
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

      <section class="auth-form-area bg-surface">
        <router-view />
      </section>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
</script>

<style scoped lang="scss">
.auth-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  min-height: 100vh;
  overflow: hidden;
}

/* ---------- Brand panel (left) ---------- */
.auth-brand {
  position: relative;
  display: flex;
  align-items: self-end;
  background: #0f172a;
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
  background: linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.3) 100%);
  z-index: 1;
}

.auth-brand__content {
  position: relative;
  z-index: 2;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-brand__logo {
  width: 75px;
  height: 75px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
}

.auth-brand__title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.02em;
}

.auth-brand__tagline {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  max-width: 36ch;
  line-height: 1.6;
}

/* ---------- Form area (right) ---------- */
.auth-form-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgb(var(--v-theme-surface));
}

/* ---------- Responsive ---------- */
@media (max-width: 960px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-brand {
    display: none;
  }

  .auth-form-area {
    min-height: 100vh;
  }
}
</style>
