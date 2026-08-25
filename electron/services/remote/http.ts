import http from "node:http"
import { dispatch, parseHttpCommand, statusSnapshot } from "./dispatcher"
import { APP_VERSION } from "../logger"
import { info, warn } from "../logger"

/**
 * HTTP remote-control API — the axum equivalent. Same endpoints:
 *   GET  /api/v1/health
 *   GET  /api/v1/status
 *   POST /api/v1/command   (+ undocumented /api/v1/control alias)
 */

const DEFAULT_PORT = 8080

export class HttpServer {
  private server: http.Server | null = null
  private port = DEFAULT_PORT

  isRunning(): boolean {
    return this.server !== null
  }
  boundPort(): number {
    return this.port
  }

  async start(port?: number): Promise<number> {
    await this.stopInternal()
    const server = http.createServer((req, res) => {
      this.handle(req, res).catch((e) => {
        warn("[http] handler error:", e)
      })
    })

    const requested = port ?? DEFAULT_PORT
    await new Promise<void>((resolve, reject) => {
      const onError = (e: Error): void => {
        cleanup()
        reject(e)
      }
      const onListening = (): void => {
        cleanup()
        resolve()
      }
      const cleanup = (): void => {
        server.removeListener("error", onError)
        server.removeListener("listening", onListening)
      }
      server.once("error", onError)
      server.once("listening", onListening)
      server.listen(requested, "0.0.0.0")
    })

    this.server = server
    this.port = (server.address() as { port: number }).port
    info(`[http] listening on 0.0.0.0:${this.port}`)
    return this.port
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Permissive CORS, matching the Rust tower-http layer.
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "*")
    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    const url = (req.url ?? "").split("?")[0]

    if (req.method === "GET" && url === "/api/v1/health") {
      json(res, { status: "ok", service: "aleph", version: APP_VERSION })
      return
    }

    if (req.method === "GET" && url === "/api/v1/status") {
      json(res, statusSnapshot)
      return
    }

    if (
      req.method === "POST" &&
      (url === "/api/v1/command" || url === "/api/v1/control")
    ) {
      let body = ""
      for await (const chunk of req) body += chunk
      try {
        const parsed = JSON.parse(body || "{}") as Record<string, unknown>
        const cmd = parseHttpCommand(parsed)
        if (!cmd) {
          json(res, { success: false, error: `Unknown command: ${String(parsed.command)}` }, 400)
          return
        }
        dispatch(cmd)
        json(res, { success: true })
      } catch (e) {
        json(res, { success: false, error: String(e) }, 400)
      }
      return
    }

    json(res, { error: "Not found" }, 404)
  }

  async stop(): Promise<void> {
    await this.stopInternal()
    info("[http] stopped")
  }

  private stopInternal(): Promise<void> {
    const server = this.server
    this.server = null
    if (!server) return Promise.resolve()
    return new Promise((resolve) => {
      server.close(() => resolve())
      // Force-close idle keep-alive sockets.
      setImmediate(() => server.emit("close"))
    })
  }
}

function json(res: http.ServerResponse, payload: unknown, status = 200): void {
  const body = JSON.stringify(payload)
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(body)
}
