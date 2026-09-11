<script setup lang="ts">
type SetupPayload = {
  catalog: { ready: boolean, counts: Record<string, number> | null }
}

const { data } = await useFetch<SetupPayload>('/api/setup', {
  getCachedData: () => undefined
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Catalog
      </h1>
      <p class="text-sm text-muted mt-1 max-w-2xl">
        Browse pages are generated per prospect after the converter exists. This starter does not ship a generic grid.
      </p>
    </div>

    <UEmpty
      v-if="!data?.catalog.ready"
      icon="i-lucide-layout-grid"
      title="No catalog database"
      description="Load source files from prospect/ first. The agent adds list and detail routes after you confirm the schema."
    >
      <template #actions>
        <UButton to="/">
          Back to setup
        </UButton>
      </template>
    </UEmpty>

    <UCard v-else>
      <template #header>
        <h2 class="font-semibold">
          Loaded counts
        </h2>
      </template>
      <dl v-if="data.catalog.counts" class="grid gap-2 sm:grid-cols-2 text-sm">
        <div
          v-for="(value, key) in data.catalog.counts"
          :key="key"
          class="flex justify-between gap-3 rounded-md bg-elevated px-3 py-2"
        >
          <dt class="capitalize text-muted">{{ key }}</dt>
          <dd class="font-medium text-highlighted">{{ value }}</dd>
        </div>
      </dl>
      <p v-else class="text-sm text-muted">
        catalog.db exists. Ask the agent to add list/detail pages for the entities in the schema.
      </p>
    </UCard>
  </div>
</template>
