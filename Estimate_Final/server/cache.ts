type Entry<T> = { value: T; expiresAt: number };

export class LruTtlCache<K, V> {
  private store = new Map<K, Entry<V>>();
  private order: K[] = [];
  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: K): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.delete(key);
      return undefined;
    }
    this.touch(key);
    return e.value;
  }

  set(key: K, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.touch(key);
    this.evictIfNeeded();
  }

  private touch(key: K) {
    const idx = this.order.indexOf(key);
    if (idx !== -1) this.order.splice(idx, 1);
    this.order.push(key);
  }

  private evictIfNeeded() {
    while (this.order.length > this.maxEntries) {
      const oldest = this.order.shift();
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  private delete(key: K) {
    this.store.delete(key);
    const idx = this.order.indexOf(key);
    if (idx !== -1) this.order.splice(idx, 1);
  }
}


