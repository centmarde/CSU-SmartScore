<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type SampleType = 'accepted' | 'rejected';

interface Props {
  modelValue: boolean;
  initialSample?: SampleType;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  initialSample: 'accepted'
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const tabs = [
  {
    key: 'accepted' as const,
  title: 'Recommended',
    src: '/assets/sample-accepted.svg',
    hint: 'Clear, flat, numbered answers'
  },
  {
    key: 'rejected' as const,
  title: 'Not recommended',
    // This tab uses a slider to switch between multiple not-recommended examples.
    src: '',
    hint: 'Harder cases where AI extraction can fail'
  }
];

const notRecommendedSamples = [
  {
    title: 'Blurry / angled / no numbering',
    src: '/assets/sample-not-accepted.svg',
    hint: 'Blurry/angled/no numbering/dirty background'
  },
  {
    title: 'Complex / dense handwriting',
    src: '/assets/sample-not-recommended-real.svg',
    hint: 'Complex/dense handwriting (harder for AI to extract reliably)'
  }
];

const notRecommendedIndex = ref(0);

const initialTabIndex = computed(() =>
  Math.max(
    0,
    tabs.findIndex((t) => t.key === props.initialSample)
  )
);

const activeTab = ref(0);

// When dialog opens or initialSample changes, sync the active tab.
watch(
  () => [props.modelValue, props.initialSample] as const,
  ([isOpen]) => {
    if (isOpen) {
      activeTab.value = initialTabIndex.value;
    }
  },
  { immediate: true }
);

const handleClose = () => emit('update:modelValue', false);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-toolbar color="primary" density="comfortable">
        <v-btn icon variant="text" @click="handleClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>Image Samples</v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-0">
  <v-tabs v-model="activeTab" grow bg-color="white">
          <v-tab v-for="t in tabs" :key="t.key">
            {{ t.title }}
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="window">
          <!-- Recommended -->
          <v-window-item>
            <div class="content">
              <div class="hint">
                <v-chip size="small" variant="tonal">
                  {{ tabs[0].hint }}
                </v-chip>
              </div>

              <div class="viewer">
                <v-img :src="tabs[0].src" alt="Recommended sample" class="img" />
              </div>
            </div>
          </v-window-item>

          <!-- Not recommended (slider) -->
          <v-window-item>
            <div class="content">
              <div class="hint hint-slider">
                <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                  <v-chip size="small" variant="tonal">
                    {{ notRecommendedSamples[notRecommendedIndex].hint }}
                  </v-chip>
                  <div class="text-caption text-medium-emphasis">
                    {{ notRecommendedSamples[notRecommendedIndex].title }}
                  </div>
                </div>

                <v-slider
                  v-model="notRecommendedIndex"
                  :min="0"
                  :max="notRecommendedSamples.length - 1"
                  :step="1"
                  show-ticks="always"
                  tick-size="2"
                  hide-details
                  class="mt-3"
                />
              </div>

              <div class="viewer">
                <v-img
                  :src="notRecommendedSamples[notRecommendedIndex].src"
                  alt="Not recommended sample"
                  class="img"
                />
              </div>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.window {
  height: calc(100vh - 112px);
}

.content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.hint {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.hint-slider {
  padding-bottom: 6px;
}

.viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #0b1220;
}

.img {
  width: min(1200px, 100%);
  max-height: calc(100vh - 200px);
}
</style>
