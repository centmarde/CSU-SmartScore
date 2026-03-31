
<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import LoginForm from "@/components/auth/LoginForm.vue";
import RegisterForm from "@/components/auth/RegisterForm.vue";
import { useAuthUserStore } from "@/stores/authUser";
import { useTheme } from "@/composables/useTheme";
import { useAuthPageController } from "@/controller/authPageController";

// Composables
const router = useRouter();
const route = useRoute();
const authStore = useAuthUserStore();
const { isThemeLoaded, themeLoadError, isLoadingTheme, initializeTheme } = useTheme();
const { data: authPageData, loading: authPageLoading, error: authPageError, fetchAuthPageData } = useAuthPageController();

// Reactive state
const isLoginMode = ref(true);

// Computed properties for layout
const isQuoteOnLeft = computed(() => {
  return authPageData.value?.layout?.quotePosition === 'left';
});

const formSectionOrder = computed(() => {
  return isQuoteOnLeft.value ? 2 : 1;
});

const quoteSectionOrder = computed(() => {
  return isQuoteOnLeft.value ? 1 : 2;
});

// Methods
const switchToRegister = () => {
  isLoginMode.value = false;
  // Update URL without navigation
  router.replace({ query: { mode: "register" } });
};

const switchToLogin = () => {
  isLoginMode.value = true;
  // Update URL without navigation
  router.replace({ query: { mode: "login" } });
};

const toggleMode = () => {
  if (isLoginMode.value) {
    switchToRegister();
  } else {
    switchToLogin();
  }
};

const navigateHome = () => {
  router.push("/");
};

// Lifecycle
onMounted(async () => {
  // Load auth page data first
  await fetchAuthPageData();

  // Initialize dynamic theme configuration
  await initializeTheme();

  // Set initial mode based on query parameter
  const mode = route.query.mode;
  if (mode === "register") {
    isLoginMode.value = false;
  } else {
    isLoginMode.value = true;
  }
});

// This page uses the default layout and doesn't require authentication
</script>



<template>
  <!-- Theme Loading State -->
  <v-overlay
    v-if="isLoadingTheme || authPageLoading"
    class="auth-loading-overlay d-flex align-center justify-center"
  >
    <div class="auth-loading-content">
      <v-progress-circular
        indeterminate
        size="64"
        color="white"
      />
      <div class="text-h6 mt-4">
        {{ isLoadingTheme ? 'Loading theme...' : 'Loading page data...' }}
      </div>
    </div>
  </v-overlay>

  <!-- Error State -->
  <v-alert
    v-if="(themeLoadError || authPageError) && !isLoadingTheme && !authPageLoading"
    type="error"
    class="auth-error-alert"
    closable
  >
    <v-alert-title>Loading Error</v-alert-title>
    {{ themeLoadError || authPageError }}
  </v-alert>

  <!-- Main Content with Diagonal Design -->
  <div v-if="!isLoadingTheme && !authPageLoading && authPageData" class="auth-container">
    <div class="auth-wrapper"
         :class="{ 'auth-mobile-wrapper': $vuetify.display.mobile }"
    >
      <!-- Back to Home Button -->
      <v-btn
        class="auth-back-btn"
        variant="text"
        size="small"
        @click="navigateHome"
      >
        <v-icon start size="small">mdi-arrow-left</v-icon>
        Back to Home
      </v-btn>

      <!-- Form Section (Left Side with Diagonal) -->
      <div class="auth-form-section"
           :class="{ 'auth-mobile-form': $vuetify.display.mobile }"
      >
        <div class="auth-form-container">
          <!-- Auth Form Card -->
          <v-card class="auth-form-card" elevation="12">
            <v-card-text class="pa-6">
              <!-- Auth Form Container -->
              <transition name="auth-fade" mode="out-in">
                <div v-if="isLoginMode" key="login">
                  <LoginForm @switch-to-register="switchToRegister" />
                </div>
                <div v-else key="register">
                  <RegisterForm @switch-to-login="switchToLogin" />
                </div>
              </transition>
            </v-card-text>
          </v-card>

          <!-- Toggle Mode Section -->
          <div class="auth-social-container mt-4">
            <div class="text-center">
              <v-divider class="mb-4" color="white" opacity="0.3" />

              <!-- Toggle Mode Button -->
              <v-btn
                class="auth-toggle-btn"
                size="small"
                block
                @click="toggleMode"
              >
                <v-icon start>mdi-swap-horizontal</v-icon>
                Switch to {{ isLoginMode ? "Register" : "Login" }}
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Quote Section (Right Side) -->
      <div class="auth-quote-section"
           :class="{ 'auth-mobile-quote': $vuetify.display.mobile }"
      >
        <div class="auth-quote-container">
          <v-card class="auth-quote-card">
            <v-card-text class="text-center ms-10 ps-10">
              <v-icon
                size="64"
                color="primary"
                class="auth-quote-icon"
              >
                mdi-format-quote-open
              </v-icon>

              <div class="auth-quote-text">
                {{ authPageData.quote.text }}
              </div>

              <div class="auth-quote-author">
                — {{ authPageData.quote.author }}
                <span v-if="authPageData.quote.source" class="text-caption">
                  ({{ authPageData.quote.source }})
                </span>
              </div>

              <div v-if="authPageData.quote.motivationalText" class="auth-quote-motivational">
                {{ authPageData.quote.motivationalText }}
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
  </div>
</template>
