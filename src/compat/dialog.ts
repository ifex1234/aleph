export interface OpenDialogOptions {
  multiple?: boolean
  directory?: boolean
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

type OpenReturn<T extends OpenDialogOptions | undefined> = T extends {
  multiple: true
}
  ? string[] | null
  : string | null

/**
 * Mirrors @tauri-apps/plugin-dialog#open — resolves to a path string (or an
 * array with `multiple`), or null when the dialog was cancelled.
 */
export async function open<T extends OpenDialogOptions = OpenDialogOptions>(
  options?: T
): Promise<OpenReturn<T>> {
  const { invoke } = await import("./core")
  return invoke<string | string[] | null>("__dialog_open", {
    options: options ?? {},
  }) as Promise<OpenReturn<T>>
}

/** Mirrors @tauri-apps/plugin-dialog#save — resolves to a path or null. */
export async function save(
  options: SaveDialogOptions = {}
): Promise<string | null> {
  const { invoke } = await import("./core")
  return invoke<string | null>("__dialog_save", { options })
}
