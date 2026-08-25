import { invoke } from "./core"

/** Mirrors @tauri-apps/api/path#appLogDir. */
export function appLogDir(): Promise<string> {
  return invoke<string>("__get_log_dir")
}

export const appDataDir = (): Promise<string> => invoke<string>("__get_data_dir")
export const resourceDir = (): Promise<string> => invoke<string>("__get_resource_dir")
