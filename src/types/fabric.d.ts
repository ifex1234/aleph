/* eslint-disable @typescript-eslint/no-explicit-any -- ambient shim for an untyped dependency */
/**
 * Type surface for fabric@7, whose published package points its "types"
 * field at a missing file in this environment. Runtime imports resolve to
 * the real package (vite); this file only satisfies tsc for the small API
 * surface the app uses (design-canvas).
 */
export type TMat2D = number[]

export class FabricObject {
  [key: string]: any
  constructor(options?: Record<string, unknown>)
  set(key: string | Record<string, unknown>, value?: unknown): this
  getCenterPoint(): Point
  on(event: string, handler: (e?: unknown) => void): this
  off(event?: string, handler?: (e?: unknown) => void): this
}

/** Loosely-typed fabric event object passed to canvas handlers. */
export interface FabricEvent {
  target?: FabricObject
  selected?: FabricObject[]
  deselected?: FabricObject[]
  transform?: Record<string, unknown>
  [key: string]: any
}

export class Canvas {
  [key: string]: any
  constructor(element: HTMLCanvasElement | string, options?: Record<string, unknown>)
  on(event: string, handler: (e: FabricEvent) => void): this
  off(event?: string, handler?: (e: FabricEvent) => void): this
}

export class Rect extends FabricObject {}

export class Object extends FabricObject {}

export class Shadow {
  [key: string]: any
  constructor(options?: string | Record<string, unknown>)
}

export class Pattern {
  [key: string]: any
  constructor(options?: Record<string, unknown>)
}

export class Point {
  x: number
  y: number
  constructor(x: number, y: number)
}

export const util: any
