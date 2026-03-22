<script setup lang="ts">
import { ref } from 'vue'

// Define the sections available in HomeView
interface Section {
  id: string
  title: string
  icon: string
  color: string
}

const sections: Section[] = [
  {
    id: 'announcements',
    title: 'Announcements',
    icon: 'mdi-bullhorn',
    color: 'primary'
  },
  {
    id: 'analytics',
    title: 'Score Analytics',
    icon: 'mdi-chart-bar',
    color: 'success'
  },
  {
    id: 'quiz',
    title: 'Quiz Overview',
    icon: 'mdi-file-document-multiple',
    color: 'info'
  },
  {
    id: 'logs',
    title: 'Activity Logs',
    icon: 'mdi-history',
    color: 'warning'
  }
]

// Track the active section
const activeSection = ref<string>('announcements')

// Track collapsed state
const isCollapsed = ref<boolean>(true)

// Handle section navigation
const navigateToSection = (sectionId: string) => {
  activeSection.value = sectionId

  // Find the section element and scroll to it
  const element = document.querySelector(`.${sectionId}-section`)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    })
  }
}

// Track which section is currently visible
const handleSectionVisibility = () => {
  const sections = [
    'announcements-section',
    'analytics-section',
    'quiz-section',
    'logs-section'
  ]

  for (const sectionClass of sections) {
    const element = document.querySelector(`.${sectionClass}`)
    if (element) {
      const rect = element.getBoundingClientRect()
      const isVisible = rect.top >= 0 && rect.top <= window.innerHeight / 2

      if (isVisible) {
        const sectionId = sectionClass.replace('-section', '')
        if (activeSection.value !== sectionId) {
          activeSection.value = sectionId
        }
        break
      }
    }
  }
}

// Add scroll listener to track current section
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('scroll', handleSectionVisibility, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleSectionVisibility)
})

// Toggle collapsed state
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <v-sheet
    :class="['tab-folder-container', { 'collapsed': isCollapsed }]"
    color="transparent"
    elevation="0"
  >
    <!-- Folder Tabs -->
    <div class="folder-tabs">
      <v-sheet
        v-for="(section, index) in sections"
        :key="section.id"
        :class="[
          'folder-tab',
          { 'active': activeSection === section.id },
          { 'collapsed': isCollapsed },
          `tab-${section.color}`
        ]"
        @click="navigateToSection(section.id)"
        :style="{
          zIndex: activeSection === section.id ? 10 : 9 - index,
          transform: `translateY(${index * -2}px)`
        }"
        color="transparent"
        elevation="0"
      >
        <!-- Tab Content -->
        <div class="tab-content">
          <v-icon
            :color="activeSection === section.id ? 'white' : section.color"
            :size="$vuetify.display.mobile && isCollapsed ? 14 : 20"
            class="tab-icon"
          >
            {{ section.icon }}
          </v-icon>
        </div>

        <!-- Tab Edge Effect -->
        <div class="tab-edge"></div>
      </v-sheet>
    </div>

    <!-- Collapse/Expand Button -->
    <v-btn
      class="collapse-btn-visual"
      @click="toggleCollapse"
      :size="$vuetify.display.mobile ? 'x-small' : 'small'"
      variant="elevated"
      elevation="2"
      rounded="0"
    >
      <v-icon :size="$vuetify.display.mobile ? 14 : 18" color="grey-darken-1">
        {{ isCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
      </v-icon>
    </v-btn>
  </v-sheet>
</template>

<style scoped>
.tab-folder-container {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: auto;
}

.folder-tabs {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-bottom: 8px;
}

.folder-tab {
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: right center;
  min-width: 48px;
  height: 48px;
  border-radius: 12px 0 0 12px;
  background: linear-gradient(135deg, var(--tab-color-light), var(--tab-color));
  border: 1px solid var(--tab-color);
  border-right: none;
  overflow: hidden;
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

/* Color variations for different sections */
.tab-primary {
  --tab-color: rgb(25, 118, 210);
  --tab-color-light: rgba(25, 118, 210, 0.1);
  --tab-color-rgb: 25, 118, 210;
}

.tab-success {
  --tab-color: rgb(76, 175, 80);
  --tab-color-light: rgba(76, 175, 80, 0.1);
  --tab-color-rgb: 76, 175, 80;
}

.tab-info {
  --tab-color: rgb(3, 169, 244);
  --tab-color-light: rgba(3, 169, 244, 0.1);
  --tab-color-rgb: 3, 169, 244;
}

.tab-warning {
  --tab-color: rgb(255, 152, 0);
  --tab-color-light: rgba(255, 152, 0, 0.1);
  --tab-color-rgb: 255, 152, 0;
}

/* Collapsed state styles - more transparent and compact */
.folder-tab.collapsed {
  min-width: 36px !important;
  max-width: 36px !important;
  height: 36px !important;
  opacity: 0.6;
  background: linear-gradient(135deg,
    rgba(var(--tab-color-rgb), 0.05),
    rgba(var(--tab-color-rgb), 0.15)
  );
  border: 1px solid rgba(var(--tab-color-rgb), 0.2);
  backdrop-filter: blur(5px);
}

.folder-tab.collapsed:hover {
  transform: translateX(-2px) scale(1.05);
  opacity: 0.8;
  min-width: 36px !important;
  max-width: 36px !important;
  height: 36px !important;
}

.folder-tab.collapsed.active {
  transform: translateX(-4px) scale(1.1);
  opacity: 1;
  min-width: 36px !important;
  max-width: 36px !important;
  height: 36px !important;
  background: linear-gradient(135deg,
    rgba(var(--tab-color-rgb), 0.2),
    rgba(var(--tab-color-rgb), 0.4)
  );
}

/* Normal expanded state styles - icons only */
.folder-tab:not(.collapsed):hover {
  transform: translateX(-6px) scale(1.02);
  box-shadow: -3px 3px 12px rgba(0, 0, 0, 0.15);
}

.folder-tab:not(.collapsed).active {
  background: linear-gradient(135deg, var(--tab-color), var(--tab-color-dark, var(--tab-color)));
  transform: translateX(-8px) scale(1.05);
  box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.2);
}

.tab-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
}

.folder-tab.collapsed .tab-content {
  padding: 6px;
}

.folder-tab.collapsed .tab-icon {
  font-size: 16px !important;
}

.tab-icon {
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.tab-edge {
  position: absolute;
  top: 0;
  right: -1px;
  width: 2px;
  height: 100%;
  background: var(--tab-color);
  border-radius: 0 2px 2px 0;
  transition: width 0.3s ease;
}

.folder-tab.active .tab-edge {
  width: 4px;
  background: rgba(255, 255, 255, 0.8);
}

.collapse-btn-visual {
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% 0 0 50% !important;
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  transition: all 0.3s ease !important;
  cursor: pointer;
}

.collapse-btn-visual:hover {
  background: rgba(255, 255, 255, 1) !important;
  transform: translateX(-2px);
  box-shadow: -3px 3px 10px rgba(0, 0, 0, 0.12) !important;
}

/* Collapsed state for button */
.tab-folder-container.collapsed .collapse-btn-visual {
  min-width: 24px !important;
  width: 24px !important;
  height: 24px !important;
  opacity: 0.7;
}

.tab-folder-container.collapsed .collapse-btn-visual:hover {
  opacity: 1;
  transform: translateX(-1px);
}

/* Responsive design - Mobile (Vuetify md and below) */
@media (max-width: 959px) {
  .tab-folder-container {
    top: auto;
    bottom: 90px;
    right: 0;
    transform: none;
  }

  .folder-tab {
    min-width: 40px;
    height: 40px;
  }

  .folder-tab.collapsed {
    min-width: 32px !important;
    height: 32px !important;
  }

  .tab-content {
    padding: 8px;
  }

  .folder-tab.collapsed .tab-content {
    padding: 4px;
  }
}

/* Small mobile devices */
@media (max-width: 599px) {
  .tab-folder-container {
    bottom: 80px;
    right: 0;
  }

  .folder-tab {
    min-width: 36px;
    height: 36px;
  }

  .folder-tab.collapsed {
    min-width: 28px !important;
    height: 28px !important;
  }

  .tab-content {
    padding: 6px;
  }

  .folder-tab.collapsed .tab-content {
    padding: 3px;
  }

  .collapse-btn-visual {
    min-width: 28px !important;
    width: 28px !important;
    height: 28px !important;
  }

  .tab-folder-container.collapsed .collapse-btn-visual {
    min-width: 20px !important;
    width: 20px !important;
    height: 20px !important;
  }
}

/* Animation for smooth transitions */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.tab-folder-container {
  animation: slideIn 0.5s ease-out;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .collapse-btn-visual {
    background: rgba(30, 30, 30, 0.9);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .collapse-btn-visual:hover {
    background: rgba(30, 30, 30, 1);
  }  .folder-tab {
    box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.3);
  }

  .folder-tab:hover,
  .folder-tab.active {
    box-shadow: -6px 6px 20px rgba(0, 0, 0, 0.4);
  }
}
</style>
