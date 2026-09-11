<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({
  title: 'Bluestone onboarding visualizer',
  description: 'Load a prospect catalog locally, then map and sync it into Bluestone PIM.'
})

const route = useRoute()
const { loading: pageLoading } = usePageLoading()

type SetupMeta = {
  catalog?: { ready?: boolean, counts?: Record<string, number> | null }
  keys?: { mapi?: boolean }
}

const { data: setup } = useFetch<SetupMeta>('/api/setup', {
  lazy: true,
  getCachedData: () => undefined
})

const catalogReady = computed(() => Boolean(setup.value?.catalog?.ready))
const countLabel = computed(() => {
  const counts = setup.value?.catalog?.counts
  if (!counts) return null
  const [key, value] = Object.entries(counts)[0] ?? []
  if (key == null || value == null) return null
  return `${value} ${key}`
})

const navItems = computed(() => [{
  label: 'Setup',
  to: '/',
  icon: 'i-lucide-list-checks',
  active: route.path === '/' || route.path.startsWith('/setup')
}, {
  label: 'Catalog',
  to: catalogReady.value ? '/catalog' : undefined,
  icon: 'i-lucide-layout-grid',
  disabled: !catalogReady.value,
  active: route.path.startsWith('/catalog')
}, {
  label: 'PIM',
  to: '/pim',
  icon: 'i-lucide-cloud-upload',
  active: route.path.startsWith('/pim')
}])
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="var(--ui-primary)"
      :height="3"
      :throttle="80"
    />

    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex shrink-0 items-center gap-2 font-semibold text-highlighted whitespace-nowrap"
        >
          <UIcon name="i-lucide-boxes" class="size-5 shrink-0 text-primary" />
          <span>Onboarding visualizer</span>
        </NuxtLink>
      </template>

      <UNavigationMenu :items="navItems" />

      <template #right>
        <UBadge
          v-if="catalogReady"
          color="success"
          variant="subtle"
          :label="countLabel || 'Catalog ready'"
        />
        <UBadge
          v-else
          color="warning"
          variant="subtle"
          label="No catalog"
        />
        <UBadge
          :color="setup?.keys?.mapi ? 'success' : 'warning'"
          variant="subtle"
          :label="setup?.keys?.mapi ? 'MAPI' : 'No keys'"
        />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-6 relative min-h-[50vh]">
        <div
          v-if="pageLoading"
          class="absolute inset-0 z-20 flex items-center justify-center bg-default/80 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div class="flex flex-col items-center gap-3 text-muted">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-8 animate-spin text-primary"
            />
            <p class="text-sm font-medium text-highlighted">
              Loading…
            </p>
          </div>
        </div>
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
