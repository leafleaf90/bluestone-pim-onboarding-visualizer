<script setup lang="ts">
type PimStatus = {
  connection: 'connected' | 'not_connected'
  tenantLabel: string
  target: string | null
  papiReady: boolean
  recentRunCount: number
  note: string
}

type PimRuns = {
  runs: Array<{
    id: string
    createdAt: string
    type: string
    mode: string
    status: string
    title: string
    summary: string
    stepCount: number
    warningCount: number
  }>
}

const { data: status, refresh: refreshStatus } = await useFetch<PimStatus>('/api/pim/status', {
  getCachedData: () => undefined
})
const { data: runs, refresh: refreshRuns } = await useFetch<PimRuns>('/api/pim/runs', {
  query: { limit: 20 },
  getCachedData: () => undefined
})

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshRuns()])
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Bluestone PIM
        </h1>
        <p class="text-sm text-muted mt-1 max-w-2xl">
          One organisation. Mapping and sync land here after the agent wires them to <code class="text-highlighted">server/utils/mapi</code>.
        </p>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-refresh-cw"
        @click="refreshAll"
      >
        Refresh
      </UButton>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Connection
          </h2>
        </template>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted">Status</span>
            <UBadge
              :color="status?.connection === 'connected' ? 'success' : 'warning'"
              variant="subtle"
              :label="status?.tenantLabel || 'Unknown'"
            />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted">PAPI</span>
            <UBadge
              :color="status?.papiReady ? 'success' : 'neutral'"
              variant="subtle"
              :label="status?.papiReady ? 'Ready' : 'Not set'"
            />
          </div>
          <p class="text-muted">
            {{ status?.note }}
          </p>
          <UButton
            to="/"
            color="neutral"
            variant="outline"
            size="sm"
          >
            Key checklist
          </UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Mapping
          </h2>
        </template>
        <p class="text-sm text-muted">
          No mapping profile yet. After the catalog is loaded, the agent should propose FAMILY / GROUP / VARIANT (and CLA vs VLA) using Bluestone Fluency, then add a wizard that writes through the bundled MAPI helpers — not a new write module.
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Sync history
        </h2>
      </template>
      <p
        v-if="!runs?.runs.length"
        class="text-sm text-muted"
      >
        No runs stored in <code>data/pim.db</code> yet ({{ status?.recentRunCount ?? 0 }}).
      </p>
      <ul
        v-else
        class="divide-y divide-default"
      >
        <li
          v-for="run in runs.runs"
          :key="run.id"
          class="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium text-highlighted">
              {{ run.title }}
            </p>
            <p class="text-sm text-muted">
              {{ run.summary }}
            </p>
          </div>
          <div class="flex items-center gap-2 text-sm text-muted">
            <UBadge
              color="neutral"
              variant="subtle"
              :label="run.status"
            />
            <span>{{ formatWhen(run.createdAt) }}</span>
          </div>
        </li>
      </ul>
    </UCard>
  </div>
</template>
