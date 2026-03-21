<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import CreateAnswerKeysDialog from '../dialogs/CreateAnswerKeysDialog.vue'
import EditAnswerKeysDialog from '../dialogs/EditAnswerKeysDialog.vue'
import DeleteAnswerKeyDialog from '../dialogs/DeleteAnswerKeyDialog.vue'
import ViewQrCodeDialog from '../dialogs/ViewQrCodeDialog.vue'
import ViewAnswerDialog from '../dialogs/ViewAnswerDialog.vue'

const answerKeysStore = useAnswerKeysStore()
const { mobile } = useDisplay()

// Dialogs state
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showQrCodeDialog = ref(false)
const showViewAnswerDialog = ref(false)

// View mode state
const viewMode = ref<'table' | 'card'>('table')

// Table headers
const headers = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
]

// Search and pagination
const search = ref('')
const itemsPerPage = ref(10)

// Computed properties
const loading = computed(() => answerKeysStore.loading)
const answerKeys = computed(() => answerKeysStore.answerKeys)

// Functions
const handleCreateAnswerKey = () => {
  showCreateDialog.value = true
}

const handleEditAnswerKey = (answerKey: AnswerKey) => {
  answerKeysStore.setSelectedAnswerKey(answerKey)
  showEditDialog.value = true
}

const handleDeleteAnswerKey = (answerKey: AnswerKey) => {
  answerKeysStore.setSelectedAnswerKey(answerKey)
  showDeleteDialog.value = true
}

const handleViewQRCode = (answerKey: AnswerKey) => {
  answerKeysStore.setSelectedAnswerKey(answerKey)
  showQrCodeDialog.value = true
}

const handleViewAnswer = (answerKey: AnswerKey) => {
  answerKeysStore.setSelectedAnswerKey(answerKey)
  showViewAnswerDialog.value = true
}

const toggleAnswerKeyStatus = async (answerKey: AnswerKey) => {
  await answerKeysStore.toggleAnswerKeyStatus(answerKey.id!, !answerKey.is_active)
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (isActive: boolean) => {
  return isActive ? 'success' : 'error'
}

const getStatusText = (isActive: boolean) => {
  return isActive ? 'Active' : 'Inactive'
}

// Auto toggle view mode based on screen size
watch(mobile, (isMobile) => {
  viewMode.value = isMobile ? 'card' : 'table'
}, { immediate: true })

// Lifecycle
onMounted(() => {
  answerKeysStore.fetchAnswerKeys()
})
</script>

<template>
  <v-container fluid class="pa-6">

      <v-card-title class="text-h5 font-weight-bold d-flex align-center justify-space-between my-5">
        <div>
          <v-icon class="mr-2" color="primary">mdi-key</v-icon>
          Answer Key Management
        </div>
        <v-btn
          color="primary"
          @click="handleCreateAnswerKey"
          prepend-icon="mdi-plus"
        >
          Create Answer Key
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div class="text-subtitle-1 mb-4">
          Manage answer keys for your quizzes
        </div>

        <!-- Search and filters -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Search answer keys..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="d-flex justify-end align-center gap-2">
              <!-- View Mode Toggle -->
              <v-btn-toggle
                v-model="viewMode"
                mandatory
                variant="outlined"
                density="compact"
                class="mr-2"
              >
                <v-btn
                  value="table"
                  icon="mdi-table"
                  size="small"
                  :disabled="mobile"
                />
                <v-btn
                  value="card"
                  icon="mdi-card-multiple"
                  size="small"
                />
              </v-btn-toggle>

              <v-btn
                variant="outlined"
                @click="answerKeysStore.fetchAnswerKeys()"
                prepend-icon="mdi-refresh"
                :loading="loading"
              >
                Refresh
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- Table View -->
        <v-data-table
          v-if="viewMode === 'table'"
          :headers="headers"
          :items="answerKeys"
          :loading="loading"
          :search="search"
          :items-per-page="itemsPerPage"
          class="elevation-1"
        >
          <template v-slot:item.title="{ item }">
            <div class="font-weight-medium">{{ item.title }}</div>
          </template>

          <template v-slot:item.description="{ item }">
            <div class="text-truncate" style="max-width: 200px;">
              {{ item.description || 'No description' }}
            </div>
          </template>

          <template v-slot:item.is_active="{ item }">
            <v-chip
              :color="getStatusColor(item.is_active)"
              size="small"
              variant="flat"
            >
              {{ getStatusText(item.is_active) }}
            </v-chip>
          </template>

          <template v-slot:item.created_at="{ item }">
            <div class="text-body-2">
              {{ formatDate(item.created_at) }}
            </div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex justify-center align-center gap-1">
              <v-tooltip text="View & Edit Answers">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-eye"
                    size="small"
                    variant="text"
                    color="info"
                    @click="handleViewAnswer(item)"
                  />
                </template>
              </v-tooltip>

              <v-tooltip text="View QR Code">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-qrcode"
                    size="small"
                    variant="text"
                    @click="handleViewQRCode(item)"
                  />
                </template>
              </v-tooltip>

              <v-tooltip text="Edit">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="handleEditAnswerKey(item)"
                  />
                </template>
              </v-tooltip>

              <v-tooltip :text="item.is_active ? 'Deactivate' : 'Activate'">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    :icon="item.is_active ? 'mdi-pause' : 'mdi-play'"
                    size="small"
                    variant="text"
                    :color="item.is_active ? 'warning' : 'success'"
                    @click="toggleAnswerKeyStatus(item)"
                  />
                </template>
              </v-tooltip>

              <v-tooltip text="Delete">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="handleDeleteAnswerKey(item)"
                  />
                </template>
              </v-tooltip>
            </div>
          </template>

          <template v-slot:no-data>
            <div class="text-center pa-6">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-key-outline</v-icon>
              <div class="text-h6 mb-2">No Answer Keys Found</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Create your first answer key to get started
              </div>
              <v-btn color="primary" @click="handleCreateAnswerKey">
                Create Answer Key
              </v-btn>
            </div>
          </template>
        </v-data-table>

        <!-- Card View -->
        <div v-else-if="viewMode === 'card'">
          <v-progress-linear v-if="loading" indeterminate class="mb-4" />

          <div v-if="!loading && answerKeys.length === 0" class="text-center pa-6">
            <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-key-outline</v-icon>
            <div class="text-h6 mb-2">No Answer Keys Found</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Create your first answer key to get started
            </div>
            <v-btn color="primary" @click="handleCreateAnswerKey">
              Create Answer Key
            </v-btn>
          </div>

          <v-row v-else>
            <v-col
              v-for="item in answerKeys.filter(item =>
                search === '' ||
                item.title?.toLowerCase().includes(search.toLowerCase()) ||
                item.description?.toLowerCase().includes(search.toLowerCase())
              )"
              :key="item.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card class="answer-key-card" elevation="2">
                <v-card-title class="text-h6 pb-2">
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-truncate">{{ item.title }}</span>
                    <v-chip
                      :color="getStatusColor(item.is_active)"
                      size="small"
                      variant="flat"
                    >
                      {{ getStatusText(item.is_active) }}
                    </v-chip>
                  </div>
                </v-card-title>

                <v-card-subtitle class="pb-2">
                  {{ formatDate(item.created_at) }}
                </v-card-subtitle>

                <v-card-text class="pt-0">
                  <p class="text-body-2 text-medium-emphasis">
                    {{ item.description || 'No description provided' }}
                  </p>
                </v-card-text>

                <v-card-actions class="pt-0">
                  <div class="d-flex flex-wrap gap-1 w-100 justify-center">
                    <v-tooltip text="View & Edit Answers">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-eye"
                          size="small"
                          variant="tonal"
                          color="info"
                          @click="handleViewAnswer(item)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip text="View QR Code">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-qrcode"
                          size="small"
                          variant="tonal"
                          @click="handleViewQRCode(item)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip text="Edit">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-pencil"
                          size="small"
                          variant="tonal"
                          color="primary"
                          @click="handleEditAnswerKey(item)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip :text="item.is_active ? 'Deactivate' : 'Activate'">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          :icon="item.is_active ? 'mdi-pause' : 'mdi-play'"
                          size="small"
                          variant="tonal"
                          :color="item.is_active ? 'warning' : 'success'"
                          @click="toggleAnswerKeyStatus(item)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip text="Delete">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-delete"
                          size="small"
                          variant="tonal"
                          color="error"
                          @click="handleDeleteAnswerKey(item)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>


    <!-- Dialogs -->
    <CreateAnswerKeysDialog
      v-model="showCreateDialog"
    />

    <EditAnswerKeysDialog
      v-model="showEditDialog"
    />

    <DeleteAnswerKeyDialog
      v-model="showDeleteDialog"
    />

    <ViewQrCodeDialog
      v-model="showQrCodeDialog"
    />

    <ViewAnswerDialog
      v-model="showViewAnswerDialog"
    />
  </v-container>
</template>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-chip {
  font-weight: 500;
}

.v-btn {
  transition: all 0.2s ease;
}

.v-btn:hover {
  transform: translateY(-1px);
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.answer-key-card {
  height: 100%;
  transition: all 0.3s ease;
}

.answer-key-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
}

.answer-key-card .v-card-title {
  line-height: 1.2;
  word-break: break-word;
}

.answer-key-card .v-card-text p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 60px;
}

.v-btn-toggle {
  border-radius: 6px;
}
</style>
