import type { Scenario } from "../types/game";

export const scenarios: Scenario[] = [
  {
    id: "training",
    title: "Training Run",
    description: "A small object with plenty of time.",
    threats: [
      { id: "a", name: "Asteroid A", risk: "Low", etaDays: 15, x: 200, y: -100 }
    ]
  },
  {
    id: "big-rock",
    title: "Big Rock, Bad Timing",
    description: "Large asteroid, little time.",
    threats: [
      { id: "b", name: "Asteroid B", risk: "High", etaDays: 5, x: -150, y: -200 }
    ]
  },
  {
    id: "twin",
    title: "Twin Threat",
    description: "Two asteroids, limited resources.",
    threats: [
      { id: "c", name: "Asteroid C", risk: "Medium", etaDays: 10, x: 250, y: -150 },
      { id: "d", name: "Asteroid D", risk: "High", etaDays: 6, x: -200, y: -250 }
    ]
  }
];
