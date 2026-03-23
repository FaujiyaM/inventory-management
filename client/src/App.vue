<template>
  <div class="app-shell">

    <!-- Vertical Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-name">{{ t('nav.companyName') }}</span>
        <span class="brand-sub">{{ t('nav.subtitle') }}</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">
          {{ t('nav.overview') }}
        </router-link>
        <router-link to="/inventory" class="nav-item" :class="{ active: $route.path === '/inventory' }">
          {{ t('nav.inventory') }}
        </router-link>
        <router-link to="/orders" class="nav-item" :class="{ active: $route.path === '/orders' }">
          {{ t('nav.orders') }}
        </router-link>
        <router-link to="/spending" class="nav-item" :class="{ active: $route.path === '/spending' }">
          {{ t('nav.finance') }}
        </router-link>
        <router-link to="/demand" class="nav-item" :class="{ active: $route.path === '/demand' }">
          {{ t('nav.demandForecast') }}
        </router-link>
        <router-link to="/reports" class="nav-item" :class="{ active: $route.path === '/reports' }">
          {{ t('reports.title') }}
        </router-link>
        <router-link to="/restocking" class="nav-item" :class="{ active: $route.path === '/restocking' }">
          {{ t('nav.restocking') }}
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <LanguageSwitcher />
        <ProfileMenu
          @show-profile-details="showProfileDetails = true"
          @show-tasks="showTasks = true"
        />
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-wrapper">
      <!-- Topbar with filters -->
      <div class="topbar">
        <FilterBar />
      </div>

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <!-- Modals (unchanged) -->
    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)
        if (isMockTask) {
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) currentUser.value.tasks.splice(index, 1)
        } else {
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)
        if (mockTask) {
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) apiTasks.value[index] = updatedTask
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
/* ─── Reset ─────────────────────────────────────────── */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--content-bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── Design tokens ──────────────────────────────────── */
:root {
  --sidebar-width: 240px;
  --topbar-height: 52px;

  /* Sidebar – dark */
  --sb-bg:          #1e1030;
  --sb-border:      #2d1d4a;
  --sb-text:        #a78bc4;
  --sb-text-active: #f3e8ff;
  --sb-hover-bg:    #2d1d4a;
  --sb-active-bg:   #2d1d4a;
  --sb-accent:      #a855f7;

  /* Content */
  --content-bg:      #f1f5f9;
  --content-padding: 28px;

  /* Surfaces */
  --surface:        #ffffff;
  --surface-border: #e2e8f0;
  --surface-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

  /* Typography */
  --text-primary:   #0f172a;
  --text-secondary: #64748b;
  --text-muted:     #94a3b8;

  /* Shape */
  --radius:    8px;
  --radius-lg: 12px;
}

/* ─── App shell ──────────────────────────────────────── */
.app-shell {
  display: flex;
  min-height: 100vh;
}

/* ─── Sidebar ────────────────────────────────────────── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--sb-bg);
  border-right: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: visible;
}

.sidebar-brand {
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--sb-border);
  flex-shrink: 0;
}

.brand-name {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.brand-sub {
  display: block;
  font-size: 0.68rem;
  color: var(--sb-text);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  flex: 1;
  padding: 10px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 9px 20px;
  font-size: 0.845rem;
  font-weight: 500;
  color: var(--sb-text);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background: var(--sb-hover-bg);
  color: var(--sb-text-active);
}

.nav-item.active {
  background: var(--sb-active-bg);
  color: var(--sb-text-active);
  border-left-color: var(--sb-accent);
}

.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--sb-border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ─── Main wrapper ───────────────────────────────────── */
.main-wrapper {
  margin-left: var(--sidebar-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--content-bg);
}

/* ─── Topbar (filter bar) ────────────────────────────── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--surface);
  border-bottom: 1px solid var(--surface-border);
  min-height: var(--topbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--content-padding);
  box-shadow: 0 1px 0 var(--surface-border);
}

/* ─── Page content ───────────────────────────────────── */
.main-content {
  padding: var(--content-padding);
  flex: 1;
}

/* ─── Page headers ───────────────────────────────────── */
.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.page-header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ─── Stats grid ─────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--surface);
  padding: 20px 22px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  box-shadow: var(--surface-shadow);
  transition: box-shadow 0.15s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  line-height: 1;
}

.stat-card.warning .stat-value { color: #ea580c; }
.stat-card.success .stat-value { color: #059669; }
.stat-card.danger  .stat-value { color: #dc2626; }
.stat-card.info    .stat-value { color: #7c3aed; }

/* ─── Cards ──────────────────────────────────────────── */
.card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  border: 1px solid var(--surface-border);
  box-shadow: var(--surface-shadow);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--surface-border);
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* ─── Tables ─────────────────────────────────────────── */
.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  border-bottom: 1px solid var(--surface-border);
}

thead tr {
  background: transparent;
}

th {
  text-align: left;
  padding: 0 12px 11px 0;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

td {
  padding: 12px 12px 12px 0;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-secondary);
  font-size: 0.855rem;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr {
  transition: background 0.1s;
}

tbody tr:hover {
  background: #f8fafc;
}

/* ─── Badges ─────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge.success    { background: #dcfce7; color: #166534; }
.badge.warning    { background: #fef9c3; color: #854d0e; }
.badge.danger     { background: #fee2e2; color: #991b1b; }
.badge.info       { background: #ede9fe; color: #5b21b6; }
.badge.increasing { background: #dcfce7; color: #166534; }
.badge.decreasing { background: #fee2e2; color: #991b1b; }
.badge.stable     { background: #ede9fe; color: #5b21b6; }
.badge.high       { background: #fee2e2; color: #991b1b; }
.badge.medium     { background: #fef9c3; color: #854d0e; }
.badge.low        { background: #ede9fe; color: #5b21b6; }
.badge.restocking { background: #f3e8ff; color: #6b21a8; }

/* ─── Loading / error ────────────────────────────────── */
.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 14px 18px;
  border-radius: var(--radius);
  margin: 1rem 0;
  font-size: 0.875rem;
}
</style>
