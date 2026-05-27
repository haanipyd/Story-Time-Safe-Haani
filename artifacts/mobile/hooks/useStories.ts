// Thin re-export so existing call sites (home.tsx etc.) don't need to change.
// All state and fetch logic lives in StoriesContext.
export type { RemoteStory } from "@/context/StoriesContext";
export { useStoriesContext as useStories } from "@/context/StoriesContext";
