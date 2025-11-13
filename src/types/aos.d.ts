declare module 'aos' {
  export interface AosOptions {
    offset?: number
    delay?: number
    duration?: number
    easing?: string
    once?: boolean
    mirror?: boolean
    anchorPlacement?: string
  }

  export default class AOS {
    static init(options?: AosOptions): void
    static refresh(): void
    static refreshHard(): void
  }
}

