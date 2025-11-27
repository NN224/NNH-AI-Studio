# 🔴 CRITICAL FIX: In-Memory Cache Unbounded Growth

## 📋 Problem Summary

**Issue ID:** CRITICAL-006
**Severity:** 🔴 CRITICAL - MEMORY LEAK (OOM Risk)
**Priority:** P0 (Immediate)
**Estimated Time:** 4 hours

---

## 🎯 Problem

File: `lib/cache/cache-manager.ts` Line 55
In-memory cache has no size limit → can cause OOM crashes

---

## 🐛 Current Code

```typescript
const inMemoryCache = new Map<string, CacheEntry>()
// ❌ NO SIZE LIMIT! Can grow forever
```

---

## ✅ Fix: Implement LRU Eviction

```typescript
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete it first (we'll add it at the end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end (most recent)
    this.cache.set(key, value);

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Use LRU cache instead of plain Map
const inMemoryCache = new LRUCache<string, CacheEntry>(1000);
```

---

## 🔍 Steps

1. Create LRU class in `cache-manager.ts`
2. Replace `Map` with `LRUCache`
3. Set appropriate `maxSize` (1000-5000 entries)
4. Add cache size monitoring
5. Test cache eviction works

---

## ✅ Acceptance Criteria

- [ ] LRU eviction implemented
- [ ] Max cache size enforced (1000 entries)
- [ ] Oldest entries evicted when full
- [ ] Cache hit/miss still work
- [ ] Add monitoring for cache size
- [ ] Memory usage stays constant under load

---

**Testing:**

```typescript
// Stress test
for (let i = 0; i < 10000; i++) {
  setCacheValue(`test-${i}`, { data: 'test' }, 60000);
}

console.log(inMemoryCache.size); // Should be ≤ 1000
```

---

**Status:** 🔴 NOT STARTED
**Time:** 4 hours
