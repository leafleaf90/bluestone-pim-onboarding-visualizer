<script setup lang="ts">
import {
  BLUESTONE_DEVKIT_REPO_URL,
  BLUESTONE_FLUENCY_SKILLS_INSTALL
} from '~~/shared/devkit'
import { AGENT_SETUP_PROMPT } from '~~/shared/prompts'

type SetupFile = { name: string, relativePath: string, size: number, sizeLabel: string }
type FluencyStatus = {
  found: boolean
  path: string | null
  via: string | null
  repoUrl: string
  skillsInstall: string
}
type SetupPayload = {
  prospectDir: string
  files: SetupFile[]
  catalog: {
    ready: boolean
    path: string
    mtime: string | null
    convertedAt: string | null
    counts: Record<string, number> | null
  }
  keys: { mapi: boolean, papi: boolean, env: string }
  fluency: FluencyStatus
  convertCommand: string
}

const { data, refresh } = await useFetch<SetupPayload>('/api/setup', {
  getCachedData: () => undefined
})

const copied = ref(false)
const copiedInstall = ref(false)

const fluency = computed(() => data.value?.fluency)
const repoUrl = computed(() => fluency.value?.repoUrl || BLUESTONE_DEVKIT_REPO_URL)
const skillsInstall = computed(() => fluency.value?.skillsInstall || BLUESTONE_FLUENCY_SKILLS_INSTALL)

async function copyPrompt() {
  await navigator.clipboard.writeText(AGENT_SETUP_PROMPT)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function copyInstall() {
  await navigator.clipboard.writeText(skillsInstall.value)
  copiedInstall.value = true
  setTimeout(() => {
    copiedInstall.value = false
  }, 2000)
}

const fileCount = computed(() => data.value?.files.length ?? 0)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Set up this catalog
        </h1>
        <p class="text-sm text-muted mt-1 max-w-2xl">
          Empty starter. Drop source files in <code class="text-highlighted">prospect/</code>, run locally, then ask the agent to analyze, load SQLite, and propose a Bluestone PIM tree.
        </p>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-refresh-cw"
        @click="refresh()"
      >
        Refresh
      </UButton>
    </div>

    <UAlert
      v-if="!fileCount"
      color="warning"
      variant="subtle"
      icon="i-lucide-folder-open"
      title="No source files yet"
      description="Copy XML, Excel, CSV, or JSON into the prospect/ folder. Then paste the prompt below in Cursor."
    />
    <UAlert
      v-else-if="!data?.catalog.ready"
      color="info"
      variant="subtle"
      icon="i-lucide-sparkles"
      title="Files found — catalog not loaded"
      :description="`${fileCount} file${fileCount === 1 ? '' : 's'} in prospect/. Ask the agent to analyze them before running convert.`"
    />
    <UAlert
      v-else
      color="success"
      variant="subtle"
      icon="i-lucide-database"
      title="Catalog database is ready"
      description="Browse it, or keep mapping attributes into Bluestone PIM."
    />

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            1. Source files
          </h2>
        </template>
        <p class="text-sm text-muted mb-3">
          {{ data?.prospectDir }}
        </p>
        <ul v-if="fileCount" class="space-y-1 text-sm">
          <li
            v-for="file in data?.files"
            :key="file.relativePath"
            class="flex justify-between gap-3"
          >
            <span class="truncate text-highlighted">{{ file.relativePath }}</span>
            <span class="shrink-0 text-muted">{{ file.sizeLabel }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-muted">
          Folder is empty (README ignored).
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            2. Local SQLite
          </h2>
        </template>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Database</dt>
            <dd class="text-highlighted truncate">{{ data?.catalog.ready ? 'catalog.db' : 'Not created' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Converted</dt>
            <dd>{{ data?.catalog.convertedAt || '—' }}</dd>
          </div>
          <div
            v-for="(value, key) in data?.catalog.counts || {}"
            :key="key"
            class="flex justify-between gap-3"
          >
            <dt class="text-muted capitalize">{{ key }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
        <p class="text-xs text-muted mt-3">
          After the agent writes the converter: <code>{{ data?.convertCommand }}</code>
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            3. API keys
          </h2>
        </template>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Environment</dt>
            <dd>{{ data?.keys.env }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">MAPI</dt>
            <dd>
              <UBadge
                :color="data?.keys.mapi ? 'success' : 'warning'"
                variant="subtle"
                :label="data?.keys.mapi ? 'Loaded' : 'Missing'"
              />
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">PAPI</dt>
            <dd>
              <UBadge
                :color="data?.keys.papi ? 'success' : 'neutral'"
                variant="subtle"
                :label="data?.keys.papi ? 'Loaded' : 'Optional'"
              />
            </dd>
          </div>
        </dl>
        <p class="text-xs text-muted mt-3">
          Copy <code>.env.example</code> to <code>.env</code>. Never commit secrets. One organisation only.
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2">
            <h2 class="font-semibold">
              Bluestone Fluency
            </h2>
            <UBadge
              :color="fluency?.found ? 'success' : 'warning'"
              variant="subtle"
              :label="fluency?.found ? 'Found' : 'Not found'"
            />
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              icon="i-lucide-github"
              :to="repoUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              DevKit on GitHub
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :icon="copiedInstall ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyInstall"
            >
              {{ copiedInstall ? 'Copied' : 'Copy install' }}
            </UButton>
          </div>
        </div>
      </template>
      <p v-if="fluency?.found" class="text-sm text-muted">
        The agent can load Fluency from this machine ({{ fluency.via }}).
        <code class="block mt-2 text-highlighted break-all">{{ fluency.path }}</code>
      </p>
      <div v-else class="space-y-2 text-sm text-muted">
        <p>
          Fluency is not on this machine yet. The agent should not invent a generic PIM.
          Clone the DevKit or install the skill, then refresh.
        </p>
        <pre class="text-highlighted whitespace-pre-wrap">{{ skillsInstall }}</pre>
        <p>
          Or clone
          <a
            :href="repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-highlighted underline underline-offset-2"
          >{{ repoUrl }}</a>
          and point Cursor at <code>skills/bluestone-fluency/</code>.
          Optional override: <code>BLUESTONE_FLUENCY_PATH</code> in <code>.env</code>.
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">
            Prompt for the agent
          </h2>
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copyPrompt"
          >
            {{ copied ? 'Copied' : 'Copy' }}
          </UButton>
        </div>
      </template>
      <pre class="text-sm whitespace-pre-wrap text-highlighted">{{ AGENT_SETUP_PROMPT }}</pre>
    </UCard>
  </div>
</template>
