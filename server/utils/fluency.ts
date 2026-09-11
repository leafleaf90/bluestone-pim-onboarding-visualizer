import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import {
  BLUESTONE_DEVKIT_REPO_URL,
  BLUESTONE_FLUENCY_RELATIVE,
  BLUESTONE_FLUENCY_SKILLS_INSTALL
} from '~~/shared/devkit'

export type FluencyStatus = {
  found: boolean
  path: string | null
  via: string | null
  repoUrl: string
  skillsInstall: string
}

function looksLikeFluency(dir: string) {
  return existsSync(join(dir, 'SKILL.md')) && existsSync(join(dir, 'model.md'))
}

function candidates(): { via: string, path: string }[] {
  const list: { via: string, path: string }[] = []
  const env = String(process.env.BLUESTONE_FLUENCY_PATH || '').trim()
  if (env) {
    list.push({
      via: 'BLUESTONE_FLUENCY_PATH',
      path: isAbsolute(env) ? env : resolve(process.cwd(), env)
    })
  }
  list.push(
    { via: 'Cursor skills', path: join(homedir(), '.cursor', 'skills', 'bluestone-fluency') },
    { via: 'Agent skills', path: join(homedir(), '.agents', 'skills', 'bluestone-fluency') },
    {
      via: 'sibling clone',
      path: resolve(process.cwd(), '..', 'bluestone-pim-ai-devkit', BLUESTONE_FLUENCY_RELATIVE)
    },
    {
      via: 'sibling clone',
      path: resolve(process.cwd(), '..', 'bluestone-pim-ai-devkit-public', BLUESTONE_FLUENCY_RELATIVE)
    }
  )
  return list
}

export function fluencyStatus(): FluencyStatus {
  for (const candidate of candidates()) {
    if (looksLikeFluency(candidate.path)) {
      return {
        found: true,
        path: candidate.path,
        via: candidate.via,
        repoUrl: BLUESTONE_DEVKIT_REPO_URL,
        skillsInstall: BLUESTONE_FLUENCY_SKILLS_INSTALL
      }
    }
  }
  return {
    found: false,
    path: null,
    via: null,
    repoUrl: BLUESTONE_DEVKIT_REPO_URL,
    skillsInstall: BLUESTONE_FLUENCY_SKILLS_INSTALL
  }
}
