/** Binary min-heap keyed by a numeric priority (used as the open set of Dijkstra and A*). */
export class MinHeap<T> {
  private items: T[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: T, priority: number): void {
    const items = this.items;
    const keys = this.keys;
    let i = items.length;
    items.push(item);
    keys.push(priority);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= priority) break;
      items[i] = items[parent];
      keys[i] = keys[parent];
      i = parent;
    }
    items[i] = item;
    keys[i] = priority;
  }

  /** Remove and return the entry with the smallest priority (undefined when empty). */
  pop(): { item: T; priority: number } | undefined {
    const items = this.items;
    const keys = this.keys;
    const n = items.length;
    if (n === 0) return undefined;
    const top = { item: items[0], priority: keys[0] };
    const lastItem = items.pop() as T;
    const lastKey = keys.pop() as number;
    if (n > 1) {
      let i = 0;
      const half = (n - 1) >> 1;
      while (i < half) {
        let child = 2 * i + 1;
        if (child + 1 < n - 1 && keys[child + 1] < keys[child]) child++;
        if (keys[child] >= lastKey) break;
        items[i] = items[child];
        keys[i] = keys[child];
        i = child;
      }
      items[i] = lastItem;
      keys[i] = lastKey;
    }
    return top;
  }
}
