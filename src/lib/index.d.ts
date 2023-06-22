export type Producer = (emit: (data: string) => void, ping: () => void) => void | Promise<void>
