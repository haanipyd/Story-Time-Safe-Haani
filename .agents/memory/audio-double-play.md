---
name: Audio double-play race condition
description: Why two audio instances play simultaneously in the Expo app and how the generation counter fixes it.
---

## The rule
Every `playStory` call must increment a generation counter (`loadGenRef.current++`) **before** any `await`. After `Audio.Sound.createAsync` resolves, check `gen === loadGenRef.current` before assigning `soundRef.current` or starting playback. If they don't match, call `sound.unloadAsync()` and return immediately.

**Why:** React Strict Mode (active in Expo dev builds) intentionally double-invokes `useEffect` to surface side-effects. The player's `useEffect(() => { playStory(initStory); }, [initStory?.id])` fires **twice** in rapid succession. Both calls reach `unloadSound()` while `soundRef.current` is still `null` (the first `createAsync` hasn't resolved yet), so both proceed to create their own `Audio.Sound` instance. Both instances start playing — one controlled by `soundRef`, one orphaned. Pause only affects the controlled one; the orphan keeps running. The status-update callbacks from both instances fight over `elapsedSeconds`, causing the progress bar to flicker.

**How to apply:** Applies any time `Audio.Sound.createAsync` (or any async audio loader) is called inside a React effect or event handler that can be invoked more than once before the previous async work completes. The pattern:

```ts
const loadGenRef = useRef(0);

const playStory = useCallback(async (story) => {
  const gen = ++loadGenRef.current;
  await unloadSound();
  // ... setup state ...
  const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
  if (gen !== loadGenRef.current) { sound.unloadAsync().catch(() => {}); return; }
  soundRef.current = sound;
  await sound.playAsync();
}, [...]);
```

Also: `stop()` must increment `loadGenRef.current` to cancel any in-flight load.
