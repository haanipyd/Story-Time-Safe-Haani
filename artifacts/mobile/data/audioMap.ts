/**
 * AUDIO MAP — connect stories to real audio files here.
 *
 * TWO ways to add audio:
 *
 * 1. LOCAL FILE (recommended for production)
 *    - Drop your .mp3 or .m4a file into:  assets/audio/
 *    - Then add an entry like:
 *        s1: require("../assets/audio/sleepy-elephant.mp3"),
 *
 * 2. REMOTE URL (great for testing)
 *    - Host your file anywhere (Dropbox, S3, your server, etc.)
 *    - Then add an entry like:
 *        s1: { uri: "https://your-cdn.com/sleepy-elephant.mp3" },
 *
 * Stories with no entry here fall back to simulated (timer-based) playback
 * so the app always works even without audio files.
 *
 * Supported formats: MP3, AAC/M4A, WAV, OGG (device-dependent)
 */

import { type AVPlaybackSource } from "expo-av";

export const STORY_AUDIO: Record<string, AVPlaybackSource> = {
  // ── Paste your entries below ──────────────────────────────────────────────
  //
  // s1: require("../assets/audio/sleepy-elephant.mp3"),
  // s2: require("../assets/audio/moonlight-adventure.mp3"),
  // s3: { uri: "https://example.com/audio/rainbow-fish.mp3" },
  //
  // ─────────────────────────────────────────────────────────────────────────
};
