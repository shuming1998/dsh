import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function hasEnterprisePlugin(): boolean {
  try {
    require.resolve('dsh-desktop-enterprise/package.json')
    return true
  } catch {
    return false
  }
}

/**
 * Desktop profile overlay. Analytics and the official account page stay off.
 * The official sidebar brand is replaced by the product client UI.
 * The normal profile also mounts workbenches.
 * Safe Mode keeps the account and brand overlay only.
 */
const DESKTOP_PRODUCT_PATCH_BASE = `- id: desktop-product-telemetry
  disabled: true
- id: product-analytics
  disabled: true
- id: ui-settings-account
  disabled: true
- id: ui-brand-official
  disabled: true
- id: deepseek-account
  config:
    desktopPlatform: null
- insert:
    - id: dsh-desktop-client-ui
      name: dsh-desktop-client-ui
`

const DESKTOP_ENTERPRISE_ROW = `    - id: dsh-desktop-enterprise
      name: dsh-desktop-enterprise
`

const DESKTOP_WORKBENCH_ROW = `    - id: dsh-desktop-workbenches
      name: dsh-desktop-workbenches
      config:
        root: !!js dshHomePath('desktop-workbenches')
`

export const DESKTOP_SAFE_PRODUCT_PATCH = DESKTOP_PRODUCT_PATCH_BASE

export function buildDesktopProductPatch(): string {
  const enterprise = hasEnterprisePlugin() ? DESKTOP_ENTERPRISE_ROW : ''
  return `${DESKTOP_PRODUCT_PATCH_BASE}${enterprise}${DESKTOP_WORKBENCH_ROW}`
}

export const DESKTOP_PRODUCT_PATCH = buildDesktopProductPatch()

// Windows development only. The packaged overlay never includes this row.
const WINDOWS_DEV_HMR_DISABLE = `# @deepseek-ai/dsh-hmr waits forever for a watcher ready event on Windows.
- id: hmr
  disabled: true
`

export type DesktopProductPatchMode = 'desktop' | 'safe'

export async function writeDesktopProductPatch(
  dshHome: string,
  mode: DesktopProductPatchMode = 'desktop',
  options?: { skipBlockingHmr?: boolean }
): Promise<string> {
  await mkdir(dshHome, { recursive: true })
  const path = join(dshHome, 'desktop-product.patch.yml')
  const base = mode === 'safe' ? DESKTOP_SAFE_PRODUCT_PATCH : buildDesktopProductPatch()
  const text = options?.skipBlockingHmr === true ? `${base}${WINDOWS_DEV_HMR_DISABLE}` : base
  await writeFile(path, text)
  return path
}
