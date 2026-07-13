---
name: Audio concurrency & lifecycle hardening
description: All concurrency, race-condition, and lifecycle protocols for the Expo audio player.
---

## The problem class
React Strict Mode double-invokes effects in development. Combined with async `Audio.Sound.createAsync`, this causes two concurrent `playStory()` calls to both complete and create separate Audio.Sound instances. The second instance is orphaned — `soundRef.current` only holds the last one assigned, so pause/play only controls one while the other plays freely.

## The gen-counter pattern (core fix)
```ts
const loadGenRef = useRef(0);

const playStory = useCallback(async (story) => {
  const gen = ++loadGenRef.current;         // advance BEFORE any await
  // ... setup, clear interval, unload ...
  const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
  if (gen !== loadGenRef.current) {         // check AFTER the await
    sound.unloadAsync().catch(() => {});
    return;                                 // stale — bail without touching state
  }
  soundRef.current = sound;
  // ... attach listener, playAsync ...
}, [...]);
```

**Why `shouldPlay: false`:** If we used `shouldPlay: true`, a stale load would already be audibly playing before the gen check could stop it. With `false`, we check gen first, then call `playAsync()` only if current.

## Why NOT a hard re-entrancy lock
A boolean `isLoadingRef` that returns early breaks Strict Mode:
- Effect 1 calls `playStory` → sets lock → starts async
- Strict Mode cleanup runs → advances gen
- Effect 2 calls `playStory` → sees lock → **returns early → audio never plays**
- Effect 1 finally clears lock after gen-mismatch bail → no one retries

**Rule:** Use gen counter for all code-level concurrency. Expose `isLoading` state only for UI disabling to prevent user double-taps.

## stale-instance guard in status callback
Close over BOTH `sound` (the specific object) and `gen`. Check both before updating state:
```ts
sound.setOnPlaybackStatusUpdate((status) => {
  if (sound !== soundRef.current) return;  // not the active instance
  if (gen !== loadGenRef.current) return;  // stale generation
  // safe to update state
});
```

## seek-bar suppression during scrub (isSeekingRef)
The status callback fires every 500ms and updates `elapsedSeconds`. During a scrub drag, this fights the bar position. Fix: `isSeekingRef` set true on drag-start, false on drag-end — in BOTH PanResponder callbacks AND web pointer handlers.
- Use a `setIsSeekingRef` ref in player so PanResponder (created once) always calls the latest version.
- Expose `setIsSeeking(bool)` from AudioContext to player.

## unloadSound order
1. `soundRef.current = null` FIRST → status callbacks immediately see no active instance
2. `sound.setOnPlaybackStatusUpdate(null)` → remove listener
3. `sound.stopAsync()`
4. `sound.unloadAsync()`

## stop() must advance gen
`stop()` calls `loadGenRef.current += 1` before anything else. This ensures any in-flight `playStory` createAsync will see a gen mismatch and bail before assigning to `soundRef`.

## finally block gen check
The `finally` block only clears `isLoading` state if `gen === loadGenRef.current`. If a newer gen is in flight, it will clear `isLoading` when it finishes. `stop()` always clears `isLoading` directly.
