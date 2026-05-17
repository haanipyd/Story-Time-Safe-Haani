export interface Flashcard {
  id: string;
  word: string;
  emoji: string;
  category: string;
  color: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  emoji: string;
  cards: Flashcard[];
}

export const FLASHCARD_SETS: FlashcardSet[] = [
  {
    id: "fruits",
    title: "Fruits",
    emoji: "🍎",
    cards: [
      { id: "fr1", word: "Apple", emoji: "🍎", category: "fruits", color: "#E17055" },
      { id: "fr2", word: "Banana", emoji: "🍌", category: "fruits", color: "#FDCB6E" },
      { id: "fr3", word: "Orange", emoji: "🍊", category: "fruits", color: "#FF9F43" },
      { id: "fr4", word: "Mango", emoji: "🥭", category: "fruits", color: "#F39C12" },
      { id: "fr5", word: "Grapes", emoji: "🍇", category: "fruits", color: "#A29BFE" },
      { id: "fr6", word: "Strawberry", emoji: "🍓", category: "fruits", color: "#FF6B81" },
      { id: "fr7", word: "Watermelon", emoji: "🍉", category: "fruits", color: "#55EFC4" },
      { id: "fr8", word: "Pineapple", emoji: "🍍", category: "fruits", color: "#00B894" },
      { id: "fr9", word: "Coconut", emoji: "🥥", category: "fruits", color: "#81ECEC" },
      { id: "fr10", word: "Chilli", emoji: "🌶️", category: "fruits", color: "#D63031" },
    ],
  },
  {
    id: "animals",
    title: "Animals",
    emoji: "🐾",
    cards: [
      { id: "an1", word: "Cat", emoji: "🐱", category: "animals", color: "#E17055" },
      { id: "an2", word: "Dog", emoji: "🐶", category: "animals", color: "#FDCB6E" },
      { id: "an3", word: "Elephant", emoji: "🐘", category: "animals", color: "#B2BEC3" },
      { id: "an4", word: "Lion", emoji: "🦁", category: "animals", color: "#F59E0B" },
      { id: "an5", word: "Monkey", emoji: "🐵", category: "animals", color: "#8B5E3C" },
      { id: "an6", word: "Cow", emoji: "🐄", category: "animals", color: "#00B894" },
      { id: "an7", word: "Parrot", emoji: "🦜", category: "animals", color: "#00CEC9" },
      { id: "an8", word: "Rabbit", emoji: "🐰", category: "animals", color: "#FD79A8" },
      { id: "an9", word: "Fish", emoji: "🐟", category: "animals", color: "#74B9FF" },
      { id: "an10", word: "Duck", emoji: "🦆", category: "animals", color: "#F6E58D" },
    ],
  },
  {
    id: "colors",
    title: "Colors",
    emoji: "🎨",
    cards: [
      { id: "co1", word: "Red", emoji: "🔴", category: "colors", color: "#FF4757" },
      { id: "co2", word: "Blue", emoji: "🔵", category: "colors", color: "#3742FA" },
      { id: "co3", word: "Green", emoji: "🟢", category: "colors", color: "#2ED573" },
      { id: "co4", word: "Yellow", emoji: "🟡", category: "colors", color: "#D4A017" },
      { id: "co5", word: "Orange", emoji: "🟠", category: "colors", color: "#FF6348" },
      { id: "co6", word: "Purple", emoji: "🟣", category: "colors", color: "#7D5FFF" },
      { id: "co7", word: "Pink", emoji: "🩷", category: "colors", color: "#FF6B81" },
      { id: "co8", word: "Brown", emoji: "🟤", category: "colors", color: "#A0522D" },
    ],
  },
  {
    id: "numbers",
    title: "1-2-3",
    emoji: "🔢",
    cards: [
      { id: "nu1", word: "One", emoji: "1️⃣", category: "numbers", color: "#6C5CE7" },
      { id: "nu2", word: "Two", emoji: "2️⃣", category: "numbers", color: "#0984E3" },
      { id: "nu3", word: "Three", emoji: "3️⃣", category: "numbers", color: "#00B894" },
      { id: "nu4", word: "Four", emoji: "4️⃣", category: "numbers", color: "#FDCB6E" },
      { id: "nu5", word: "Five", emoji: "5️⃣", category: "numbers", color: "#E17055" },
      { id: "nu6", word: "Six", emoji: "6️⃣", category: "numbers", color: "#D63031" },
      { id: "nu7", word: "Seven", emoji: "7️⃣", category: "numbers", color: "#00CEC9" },
      { id: "nu8", word: "Eight", emoji: "8️⃣", category: "numbers", color: "#A29BFE" },
      { id: "nu9", word: "Nine", emoji: "9️⃣", category: "numbers", color: "#FD79A8" },
      { id: "nu10", word: "Ten", emoji: "🔟", category: "numbers", color: "#55EFC4" },
    ],
  },
];

export function getAllCards(): Flashcard[] {
  return FLASHCARD_SETS.flatMap((s) => s.cards);
}

export function getSetById(id: string): FlashcardSet | undefined {
  return FLASHCARD_SETS.find((s) => s.id === id);
}
