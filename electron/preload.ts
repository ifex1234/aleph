import { contextBridge, ipcRenderer } from "electron"

/**
 * The single renderer-facing bridge. Every `src/compat/*` module talks to the
 * main process through these channels; nothing else is exposed.
 */
const api = {
  invoke: (command: string, args?: Record<string, unknown>) =>
    ipcRenderer.invoke("aleph:invoke", command, args ?? {}),

  // Synchronous one-shot: the main process resolves it from the sender's
  // WebContents id, so each window learns its own label ("main" or
  // "broadcast-<outputId>").
  windowLabel: (): string => ipcRenderer.sendSync("aleph:label"),

  addEventListener: (handler: (event: string, payload: unknown) => void) => {
    const wrapped = (_e: unknown, data: { event: string; payload: unknown }) => {
      handler(data.event, data.payload)
    }
    ipcRenderer.on("aleph:event", wrapped)
    return () => {
      ipcRenderer.removeListener("aleph:event", wrapped)
    }
  },

  emit: (event: string, payload: unknown) => {
    ipcRenderer.send("aleph:emit", event, payload)
  },

  emitTo: (label: string, event: string, payload: unknown) =>
    ipcRenderer.invoke("aleph:emit-to", label, event, payload),
}

contextBridge.exposeInMainWorld("aleph", api)

export type PreloadApi = typeof api
