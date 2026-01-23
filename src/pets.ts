// Pet animation system - modular pets that dance when music plays

export interface Pet {
  id: string;
  name: string;
  frames: string[];
}

export const PET_ANIMATION_INTERVAL_MS = 300;

export const PETS: Pet[] = [
  {
    id: "cat",
    name: "Cat",
    frames: [
      "♪  /^--^\\   ~",
      "♫  /^--^\\  ~ ",
      "♪  /^--^\\ ~  ",
      "♫  /^--^\\~   ",
    ],
  },
  {
    id: "dog",
    name: "Dog",
    frames: ["♪ ∪･ω･∪  /", "♫ ∪･ω･∪ / ", "♪ ∪･ω･∪  \\", "♫ ∪･ω･∪ \\ "],
  },
  {
    id: "bunny",
    name: "Bunny",
    frames: ["♪ /(=･x･=)\\", "♫ \\(=･x･=)/", "♪ /(=･x･=)\\", "♫ \\(=･x･=)/"],
  },
  {
    id: "bird",
    name: "Bird",
    frames: [
      "♪ ⋛⋋( ՞ਊ ՞)⋌⋚",
      "♫ ⋚⋌( ՞ਊ ՞)⋋⋛",
      "♪ ⋛⋋( ՞ਊ ՞)⋌⋚",
      "♫ ⋚⋌( ՞ਊ ՞)⋋⋛",
    ],
  },
  {
    id: "fish",
    name: "Fish",
    frames: ["♪ ><(((º>   ", "♫  ><(((º>  ", "♪   ><(((º> ", "♫  ><(((º>  "],
  },
  {
    id: "bear",
    name: "Bear",
    frames: ["♪ ʕ•ᴥ•ʔ /", "♫ ʕ•ᴥ•ʔ/ ", "♪ ʕ•ᴥ•ʔ \\", "♫ ʕ•ᴥ•ʔ\\ "],
  },
  {
    id: "none",
    name: "None",
    frames: [""],
  },
];

export const DEFAULT_PET_ID = "cat";

export function getPetById(id: string): Pet | undefined {
  return PETS.find((pet) => pet.id === id);
}

export function getPetFrame(pet: Pet, frameIndex: number): string {
  if (pet.frames.length === 0) return "";
  return pet.frames[frameIndex % pet.frames.length];
}

export function getNextPetId(currentId: string): string {
  const currentIndex = PETS.findIndex((pet) => pet.id === currentId);
  const nextIndex = (currentIndex + 1) % PETS.length;
  return PETS[nextIndex].id;
}
