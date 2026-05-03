export interface PreferenceCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  lightColor: string;
  description: string;
}

export const CATEGORIES: PreferenceCategory[] = [
  {
    id: "bedtime",
    label: "Bedtime Stories",
    icon: "moon-outline",
    color: "#7B6BA8",
    lightColor: "#EDE8F5",
    description: "Soft stories for drifting off to sleep",
  },
  {
    id: "adventure",
    label: "Adventure Tales",
    icon: "compass-outline",
    color: "#E87B3F",
    lightColor: "#FDF0E8",
    description: "Exciting journeys and brave heroes",
  },
  {
    id: "animal",
    label: "Animal Stories",
    icon: "paw-outline",
    color: "#5B8C5A",
    lightColor: "#E8F2E8",
    description: "Tales of friendly creatures",
  },
  {
    id: "songs",
    label: "Songs & Rhymes",
    icon: "musical-notes-outline",
    color: "#D4A827",
    lightColor: "#FDF6DC",
    description: "Sing-along songs and fun rhymes",
  },
  {
    id: "mythology",
    label: "Mythology & Folktales",
    icon: "sparkles-outline",
    color: "#3A7A8C",
    lightColor: "#E0EFF2",
    description: "Ancient tales and magical stories",
  },
  {
    id: "learning",
    label: "Learning",
    icon: "book-outline",
    color: "#4A90D9",
    lightColor: "#E3F0FD",
    description: "Numbers, letters, and colors",
  },
  {
    id: "yoga",
    label: "Yoga & Movement",
    icon: "body-outline",
    color: "#C48DC8",
    lightColor: "#F5EBF7",
    description: "Gentle movement and stretching",
  },
  {
    id: "nature",
    label: "Nature & Science",
    icon: "leaf-outline",
    color: "#4A7C59",
    lightColor: "#E5F0E8",
    description: "Wonders of the natural world",
  },
  {
    id: "funny",
    label: "Funny Stories",
    icon: "happy-outline",
    color: "#E8826B",
    lightColor: "#FDEEE9",
    description: "Silly tales that make you giggle",
  },
  {
    id: "classic",
    label: "Classic Fairy Tales",
    icon: "library-outline",
    color: "#A07040",
    lightColor: "#F5EFE5",
    description: "Timeless stories everyone loves",
  },
];

export const getCategoryById = (id: string) =>
  CATEGORIES.find((c) => c.id === id);
