<template>
  <v-container class="about-view py-6">
    <!-- ─── 1) Header Section ─── -->
    <v-sheet class="about-hero pa-6 rounded-xl mb-4">
      <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-4">
        <div class="d-flex align-center ga-4">
          <v-avatar size="56" color="primary" variant="tonal" rounded="lg">
            <v-icon size="28" icon="mdi-store" />
          </v-avatar>
          <div>
            <h1 class="hero-title mb-1">نقطة</h1>
            <p class="hero-subtitle mb-0">{{ t('about.subtitle') }}</p>
            <div class="d-flex align-center ga-2 mt-2">
              <v-chip size="small" color="primary" variant="flat" label> v{{ appVersion }} </v-chip>
              <v-chip v-if="buildHash" size="small" variant="outlined" label>
                {{ buildHash }}
              </v-chip>
            </div>
          </div>
        </div>

        <div class="d-flex ga-2 flex-wrap">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-content-copy"
            @click="copyDiagnostics"
          >
            {{ t('about.copyDiagnostics') }}
          </v-btn>
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-text-box-outline"
            @click="showChangelog = true"
          >
            {{ t('about.whatsNew') }}
          </v-btn>
        </div>
      </div>
    </v-sheet>

    <v-row dense>
      <!-- ─── Left Column ─── -->
      <v-col cols="12" md="6" class="d-flex flex-column ga-4">
        <!-- ─── 2) License Information ─── -->
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20" icon="mdi-license" color="primary" />
            {{ t('about.licenseTitle') }}
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-column ga-3">
              <div class="d-flex align-center justify-space-between">
                <span class="text-medium-emphasis">{{ t('about.licenseStatus') }}</span>
                <v-chip
                  :color="licenseStatusColor"
                  size="small"
                  variant="flat"
                  :prepend-icon="licenseStatusIcon"
                >
                  {{ licenseStatusLabel }}
                </v-chip>
              </div>

              <v-divider />

              <div class="info-row">
                <span class="text-medium-emphasis">{{ t('about.licensePlan') }}</span>
                <span class="font-weight-medium">{{ license.plan }}</span>
              </div>

              <div class="info-row">
                <span class="text-medium-emphasis">{{ t('about.licenseExpiry') }}</span>
                <span class="font-weight-medium">{{ license.expiresAt || '—' }}</span>
              </div>

              <div class="info-row">
                <span class="text-medium-emphasis">{{ t('about.appMode') }}</span>
                <v-chip
                  size="small"
                  :color="license.mode === 'cloud' ? 'info' : 'default'"
                  variant="tonal"
                  :prepend-icon="license.mode === 'cloud' ? 'mdi-cloud' : 'mdi-desktop-classic'"
                >
                  {{ license.mode === 'cloud' ? t('about.modeCloud') : t('about.modeOffline') }}
                </v-chip>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-key-variant"
              block
              @click="manageLicense"
            >
              {{ t('about.manageLicense') }}
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- ─── 3) Company / Developer Info ─── -->
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20" icon="mdi-domain" color="primary" />
            {{ t('about.companyTitle') }}
          </v-card-title>
          <v-card-text>
            <div class="text-h6 mb-1">CODEL</div>
            <div class="text-medium-emphasis text-body-2 mb-4">
              الدورة، مدينة دجلة، بغداد، العراق
            </div>

            <div class="d-flex flex-column ga-2">
              <v-btn
                variant="tonal"
                color="primary"
                prepend-icon="mdi-email-outline"
                href="mailto:business@codelapps.com"
                block
              >
                business@codelapps.com
              </v-btn>

              <v-btn
                variant="tonal"
                color="success"
                prepend-icon="mdi-whatsapp"
                href="https://wa.me/9647884841993"
                target="_blank"
                rel="noopener noreferrer"
                block
              >
                واتساب: 9647884841993+
              </v-btn>

              <v-btn
                variant="tonal"
                color="info"
                prepend-icon="mdi-phone"
                href="tel:+9647824082356"
                block
              >
                هاتف: 9647824082356+
              </v-btn>

              <v-btn
                variant="outlined"
                prepend-icon="mdi-web"
                href="https://codelapps.com/"
                target="_blank"
                rel="noopener noreferrer"
                block
              >
                codelapps.com
              </v-btn>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex ga-2 flex-wrap">
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-shield-lock-outline"
                href="https://codelapps.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('about.privacyPolicy') }}
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-file-document-outline"
                href="https://codelapps.com/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('about.termsConditions') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ─── Right Column ─── -->
      <v-col cols="12" md="6" class="d-flex flex-column ga-4">
        <!-- ─── 4) System Info (Diagnostics) ─── -->
        <v-card>
          <v-expansion-panels variant="accordion" flat>
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center ga-2">
                  <v-icon size="20" icon="mdi-monitor-dashboard" color="primary" />
                  <span class="text-subtitle-1 font-weight-medium">
                    {{ t('about.systemInfo') }}
                  </span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="d-flex flex-column ga-2 pt-1">
                  <div class="info-row" v-for="item in systemInfoList" :key="item.label">
                    <span class="text-medium-emphasis text-body-2">{{ item.label }}</span>
                    <code class="sys-value">{{ item.value }}</code>
                  </div>
                </div>
                <v-btn
                  class="mt-4"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-content-copy"
                  block
                  @click="copySystemInfo"
                >
                  {{ t('about.copySystemInfo') }}
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>

        <!-- ─── 5) Maintenance & Local Data ─── -->
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20" icon="mdi-database-cog-outline" color="primary" />
            {{ t('about.maintenanceTitle') }}
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-column ga-3">
              <div class="info-row">
                <span class="text-medium-emphasis">{{ t('about.backupLocation') }}</span>
                <code class="sys-value text-truncate" style="max-width: 200px">
                  {{ maintenance.backupPath }}
                </code>
              </div>

              <div class="info-row">
                <span class="text-medium-emphasis">{{ t('about.lastBackup') }}</span>
                <span class="font-weight-medium">{{ maintenance.lastBackup || '—' }}</span>
              </div>

              <v-divider />

              <div class="d-flex flex-column ga-2">
                <v-btn
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-folder-open-outline"
                  block
                  @click="openBackupFolder"
                >
                  {{ t('about.openBackupFolder') }}
                </v-btn>
                <v-btn
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-file-export-outline"
                  block
                  @click="exportLogs"
                >
                  {{ t('about.exportLogs') }}
                </v-btn>
                <v-btn
                  variant="outlined"
                  size="small"
                  color="warning"
                  prepend-icon="mdi-broom"
                  block
                  @click="clearCache"
                >
                  {{ t('about.clearCache') }}
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─── 6) Legal Section ─── -->
        <v-card>
          <v-expansion-panels variant="accordion" flat>
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center ga-2">
                  <v-icon size="20" icon="mdi-scale-balance" color="primary" />
                  <span class="text-subtitle-1 font-weight-medium">
                    {{ t('about.legalTitle') }}
                  </span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="d-flex flex-column ga-3 pt-1">
                  <p class="text-body-2 text-medium-emphasis">
                    {{ t('about.copyright') }}
                  </p>
                  <p class="text-body-2 text-medium-emphasis">
                    {{ t('about.legalNotice') }}
                  </p>
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-open-source-initiative"
                    @click="showOpenSourceLicenses = true"
                  >
                    {{ t('about.viewOpenSource') }}
                  </v-btn>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>

    <!-- ─── 7) Footer ─── -->
    <v-sheet class="about-footer mt-4 pa-4 rounded-xl text-center">
      <p class="text-body-2 text-medium-emphasis mb-1">
        {{ t('about.thankYou') }}
      </p>
      <p class="text-caption text-disabled mb-0">
        {{ t('about.supportContact') }}
        <a href="mailto:support@codelapps.com" class="text-primary text-decoration-none">
          support@codelapps.com
        </a>
      </p>
    </v-sheet>

    <!-- ─── Changelog Dialog ─── -->
    <v-dialog v-model="showChangelog" max-width="560" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-text-box-outline" />
          {{ t('about.whatsNew') }}
        </v-card-title>
        <v-card-text class="changelog-body">
          <div v-for="entry in changelogEntries" :key="entry.version" class="mb-4">
            <div class="d-flex align-center ga-2 mb-1">
              <v-chip size="x-small" color="primary" variant="flat" label>
                v{{ entry.version }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">{{ entry.date }}</span>
            </div>
            <ul class="changelog-list">
              <li v-for="(change, i) in entry.changes" :key="i" class="text-body-2">
                {{ change }}
              </li>
            </ul>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showChangelog = false">{{ t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── Open Source Licenses Dialog ─── -->
    <v-dialog v-model="showOpenSourceLicenses" max-width="560" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-open-source-initiative" />
          {{ t('about.viewOpenSource') }}
        </v-card-title>
        <v-card-text class="text-body-2">
          <p class="mb-3">{{ t('about.openSourceNotice') }}</p>
          <div v-for="lib in openSourceLibraries" :key="lib.name" class="mb-2">
            <strong>{{ lib.name }}</strong>
            <span class="text-medium-emphasis"> — {{ lib.license }}</span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showOpenSourceLicenses = false">
            {{ t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
import { useSettingsStore } from '@/stores/settingsStore';
import { computed, onMounted, ref } from 'vue';
import { notifyError, notifyInfo, notifySuccess } from '@/utils/notify';

// ─── Stores ───
const settingsStore = useSettingsStore();

// ─── Reactive state ───
const showChangelog = ref(false);
const showOpenSourceLicenses = ref(false);

// ─── Computed ───
const appVersion = computed(() => settingsStore.appVersion ?? '—');

// Build hash — in production this would come from env or IPC; mock for now
const buildHash = ref<string | null>('build-20260210');

// ─── License (mock — replace with real store/IPC when available) ───
const license = ref({
  status: 'active' as 'active' | 'expired' | 'inactive',
  plan: 'Pro',
  expiresAt: '2026-12-31',
  mode: 'offline' as 'offline' | 'cloud',
});

const licenseStatusColor = computed(() => {
  const map = { active: 'success', expired: 'error', inactive: 'warning' };
  return map[license.value.status];
});

const licenseStatusIcon = computed(() => {
  const map = {
    active: 'mdi-check-circle',
    expired: 'mdi-alert-circle',
    inactive: 'mdi-minus-circle',
  };
  return map[license.value.status];
});

const licenseStatusLabel = computed(() => {
  const map = {
    active: t('about.statusActive'),
    expired: t('about.statusExpired'),
    inactive: t('about.statusInactive'),
  };
  return map[license.value.status];
});

// ─── System info ───
const systemInfo = ref({
  os: '',
  arch: '',
  electronVersion: '',
  nodeVersion: '',
  chromiumVersion: '',
  dbPath: '',
});

function detectSystemInfo() {
  const ua = navigator.userAgent;

  // OS detection
  let os = t('about.unknownOS');
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Architecture
  const arch = ua.includes('x64') || ua.includes('Win64') ? 'x64' : navigator.platform || '—';

  // Electron/Chrome/Node from userAgent
  const electronMatch = ua.match(/Electron\/([\d.]+)/);
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  const nodeMatch = (window as any).process?.versions?.node;

  systemInfo.value = {
    os,
    arch,
    electronVersion: electronMatch?.[1] ?? '—',
    nodeVersion: nodeMatch ?? '—',
    chromiumVersion: chromeMatch?.[1] ?? '—',
    dbPath: '~/nuqta/data/nuqta.db',
  };
}

const systemInfoList = computed(() => [
  { label: t('about.sysOS'), value: systemInfo.value.os },
  { label: t('about.sysArch'), value: systemInfo.value.arch },
  { label: t('about.sysElectron'), value: systemInfo.value.electronVersion },
  { label: t('about.sysNode'), value: systemInfo.value.nodeVersion },
  { label: t('about.sysChromium'), value: systemInfo.value.chromiumVersion },
  { label: t('about.sysDB'), value: systemInfo.value.dbPath },
]);

// ─── Maintenance (mock) ───
const maintenance = ref({
  backupPath: '~/nuqta/backups',
  lastBackup: '2026-02-10 14:30',
});

// ─── Changelog (mock) ───
const changelogEntries = ref([
  {
    version: '1.4.2',
    date: '2026-02-01',
    changes: [
      'تحسين أداء نقطة البيع',
      'إصلاح مشكلة الطباعة في بعض الطابعات',
      'تحديث واجهة إدارة المخزون',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-01-15',
    changes: [
      'إضافة دعم الأقساط المتعددة',
      'تحسين تقارير المبيعات اليومية',
      'إضافة خيار النسخ الاحتياطي التلقائي',
    ],
  },
  {
    version: '1.3.0',
    date: '2025-12-01',
    changes: [
      'إضافة نظام إدارة العملاء',
      'دعم تعدد المستخدمين والصلاحيات',
      'تحسينات في الأمان والأداء',
    ],
  },
]);

// ─── Open source libraries ───
const openSourceLibraries = ref([
  { name: 'Vue.js', license: 'MIT' },
  { name: 'Vuetify', license: 'MIT' },
  { name: 'Electron', license: 'MIT' },
  { name: 'Drizzle ORM', license: 'Apache 2.0' },
  { name: 'better-sqlite3', license: 'MIT' },
  { name: 'Pinia', license: 'MIT' },
  { name: 'Vue Router', license: 'MIT' },
  { name: 'Tailwind CSS', license: 'MIT' },
]);

// ─── Actions ───
function showSnack(text: string, color = 'success') {
  if (color === 'error') {
    notifyError(text);
    return;
  }
  if (color === 'info') {
    notifyInfo(text);
    return;
  }
  notifySuccess(text);
}

function buildDiagnosticsString(): string {
  const lines = [
    `── نقطة - تقرير تشخيصي ──`,
    `الإصدار: ${appVersion.value}`,
    buildHash.value ? `رقم البناء: ${buildHash.value}` : '',
    ``,
    `── الترخيص ──`,
    `الحالة: ${licenseStatusLabel.value}`,
    `الخطة: ${license.value.plan}`,
    `تاريخ الانتهاء: ${license.value.expiresAt || '—'}`,
    `الوضع: ${license.value.mode === 'cloud' ? 'سحابي' : 'غير متصل'}`,
    ``,
    `── معلومات النظام ──`,
    ...systemInfoList.value.map((i) => `${i.label}: ${i.value}`),
    ``,
    `── الصيانة ──`,
    `مسار النسخ الاحتياطي: ${maintenance.value.backupPath}`,
    `آخر نسخة احتياطية: ${maintenance.value.lastBackup || '—'}`,
  ];
  return lines.filter(Boolean).join('\n');
}

async function copyDiagnostics() {
  try {
    await navigator.clipboard.writeText(buildDiagnosticsString());
    showSnack(t('about.copiedDiagnostics'));
  } catch {
    showSnack(t('about.copyFailed'), 'error');
  }
}

async function copySystemInfo() {
  try {
    const text = systemInfoList.value.map((i) => `${i.label}: ${i.value}`).join('\n');
    await navigator.clipboard.writeText(text);
    showSnack(t('about.copiedSystemInfo'));
  } catch {
    showSnack(t('about.copyFailed'), 'error');
  }
}

function manageLicense() {
  // TODO: wire to license management dialog/route when implemented
  showSnack(t('about.licenseComingSoon'), 'info');
}

function openBackupFolder() {
  // TODO: wire to shell.openPath via IPC
  showSnack(t('about.backupFolderOpened'), 'info');
}

function exportLogs() {
  // TODO: wire to log export IPC
  showSnack(t('about.logsExported'), 'info');
}

function clearCache() {
  // TODO: wire to cache clearing IPC
  showSnack(t('about.cacheCleared'));
}

// ─── Lifecycle ───
onMounted(async () => {
  await settingsStore.fetchAppVersion();
  detectSystemInfo();
});
</script>

<style scoped>
.about-view {
  max-width: 1080px;
}

/* ─ Hero ─ */
.about-hero {
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  background:
    radial-gradient(circle at 95% -10%, rgba(var(--v-theme-primary), 0.2), transparent 40%),
    linear-gradient(140deg, rgba(var(--v-theme-primary), 0.06), rgba(var(--v-theme-primary), 0.01));
}

.hero-title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  line-height: 1.15;
  font-weight: 800;
}

.hero-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.9rem;
}

/* ─ Footer ─ */
.about-footer {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

/* ─ Info rows ─ */
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* ─ System value monospace ─ */
.sys-value {
  font-size: 0.8rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  direction: ltr;
  text-align: left;
}

/* ─ Changelog ─ */
.changelog-body {
  max-height: 420px;
}

.changelog-list {
  padding-inline-start: 1.2rem;
  margin: 0;
}

.changelog-list li {
  margin-bottom: 2px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
</style>
