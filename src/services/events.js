// A tiny pub/sub so screens can refetch data after something changes.
const listeners = new Set()

export function onDataChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitDataChange() {
  listeners.forEach((fn) => fn())
}
