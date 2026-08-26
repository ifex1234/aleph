/**
 * Shared child-process helper for data scripts.
 *
 * Spawns a command with inherited stdio and rejects on non-zero exit.
 */

import { spawn } from "node:child_process"

export interface RunOptions {
  cwd?: string
  env?: Record<string, string>
}

export function run(cmd: string[], options: RunOptions = {}): Promise<void> {
  const { cwd, env } = options
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd[0]!, cmd.slice(1), {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: "inherit",
    })
    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed (exit ${code}): ${cmd.join(" ")}`))
    })
  })
}
