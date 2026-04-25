export type Threat = {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  etaDays: number;
  x: number;
  y: number;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  threats: Threat[];
};