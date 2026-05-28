import type { Scenario } from "../types/game";

export const scenarios: Scenario[] = [
  {
    id: "training",
    title: "Training Run",
    description: "One small rock, plenty of runway. Good place to start.",
    threats: [
      { id: "a", name: "Rock Alpha", risk: "Low", etaDays: 15, x: 200, y: -100 }
    ]
  },
  {
    id: "big-rock",
    title: "Big Rock, Bad Timing",
    description: "Big rock, tight window. Move fast.",
    threats: [
      { id: "b", name: "Bogey Kilo", risk: "High", etaDays: 5, x: -150, y: -200 }
    ]
  },
  {
    id: "twin",
    title: "Twin Threat",
    description: "Two rocks, one plan each. Choose carefully.",
    threats: [
      { id: "c", name: "Rock Charlie", risk: "Medium", etaDays: 10, x: 250, y: -150 },
      { id: "d", name: "Bogey Delta", risk: "High", etaDays: 6, x: -200, y: -250 }
    ]
  }
];
