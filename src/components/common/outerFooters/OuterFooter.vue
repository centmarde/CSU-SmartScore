<template>
  <v-footer
    v-if="config?.showFooter && footerConfig"
    app
    class="text-white"
    color="surface-light"
  >
    <v-container :class="isMobile ? 'py-2' : undefined">
      <v-row align="center" justify="space-between">
        <v-col cols="12" md="6">
          <div class="d-flex align-center">
            <v-icon class="me-2" :icon="footerConfig.icon" :size="isMobile ? 'default' : 'large'" />
            <div>
              <div :class="isMobile ? 'text-body-1 font-weight-bold' : 'text-h6 font-weight-bold'">
                {{ footerConfig.companyName }}
              </div>
              <div class="text-caption">
                {{ footerConfig.tagline }}
              </div>
            </div>
          </div>
        </v-col>

        <v-col class="text-md-end text-center" cols="12" md="6">
      <div :class="isMobile ? 'mb-1' : 'mb-2'">
            <v-btn
              v-for="social in footerConfig.socialLinks"
              :key="social.platform"
              :aria-label="social.label"
              class="me-2"
              color="on-primary"
              icon
              variant="text"
              @click="openLink(social.url)"
            >
        <v-icon :icon="social.icon" :size="isMobile ? 'small' : 'default'" />
            </v-btn>
          </div>

          <div class="text-caption">
            {{ currentYear }} © {{ footerConfig.copyright }}
          </div>
        </v-col>
      </v-row>
      <!-- Thesis Team Section -->
      <template v-if="footerConfig.thesisTeam?.enabled">
        <v-divider :class="isMobile ? 'my-2' : 'my-4'" />

        <!-- Desktop: show full team section. Mobile: collapse to keep footer short. -->
        <template v-if="!isMobile">
          <v-row>
            <v-col cols="12">
              <div class="text-center mb-4">
                <div class="text-h6 font-weight-bold">
                  {{ footerConfig.thesisTeam.title }}
                </div>
                <div class="text-caption text-grey-lighten-1">
                  {{ footerConfig.thesisTeam.subtitle }}
                </div>
              </div>

              <v-row justify="center">
                <v-col
                  v-for="member in footerConfig.thesisTeam.members"
                  :key="member.name"
                  cols="12"
                  sm="6"
                  md="3"
                  class="d-flex justify-center"
                >
                  <div class="d-flex align-center mb-3">
                    <v-avatar
                      :image="member.avatar"
                      size="48"
                      class="me-3"
                      color="primary"
                    >
                      <v-icon
                        v-if="!member.avatar"
                        icon="mdi-account"
                        size="24"
                      />
                    </v-avatar>

                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-bold">
                        {{ member.name }}
                      </div>
                      <div class="text-caption text-grey-lighten-1">
                        {{ member.role }}
                      </div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </template>

        <v-expansion-panels v-else variant="accordion" class="bg-transparent">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <span class="text-body-2 font-weight-medium">{{ footerConfig.thesisTeam.title }}</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="text-caption text-grey-lighten-1 mb-2">
                {{ footerConfig.thesisTeam.subtitle }}
              </div>

              <v-row>
                <v-col
                  v-for="member in footerConfig.thesisTeam.members"
                  :key="member.name"
                  cols="12"
                  class="py-1"
                >
                  <div class="d-flex align-center">
                    <v-avatar
                      :image="member.avatar"
                      size="36"
                      class="me-2"
                      color="primary"
                    >
                      <v-icon v-if="!member.avatar" icon="mdi-account" size="18" />
                    </v-avatar>
                    <div>
                      <div class="text-body-2 font-weight-medium">{{ member.name }}</div>
                      <div class="text-caption text-grey-lighten-1">{{ member.role }}</div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </template>
      <v-divider :class="isMobile ? 'my-2' : 'my-4'" />

      <v-row>
        <v-col class="text-center" cols="12">
          <div class="text-caption">
            Built with
            <template
              v-for="(tech, index) in footerConfig.technologies"
              :key="tech.name"
            >
              <v-icon
                class="mx-1"
                :color="tech.color"
                :icon="tech.icon"
                :size="isMobile ? 'x-small' : 'small'"
              />
              {{ tech.name }}
              <span v-if="index < footerConfig.technologies.length - 1">
                &
              </span>
            </template>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script lang="ts" setup>
import type { UIConfig } from "@/controller/landingController";
import { computed } from "vue";
import { useDisplay } from "vuetify";

interface Props {
  config?: UIConfig | null;
}

const props = defineProps<Props>();

const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);

const footerConfig = computed(() => props.config?.footer);
const currentYear = computed(() => new Date().getFullYear());

function openLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
</script>
