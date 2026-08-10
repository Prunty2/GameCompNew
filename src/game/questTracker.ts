import { FISH, harborById, spotById } from "./balance";
import { navigationGuidance, type Simulation } from "./simulation";

export interface QuestTrackerStep {
  label: string;
  detail: string;
  complete: boolean;
  current: boolean;
}

export interface QuestTrackerView {
  title: string;
  instruction: string;
  completedSteps: number;
  totalSteps: number;
  steps: QuestTrackerStep[];
}

export function questTrackerView(simulation: Simulation): QuestTrackerView | null {
  const contract = simulation.activeContract;
  if (!contract) return null;

  const fish = FISH[contract.species];
  const catchReady = simulation.cargo.some((item) => (
    item.species === contract.species && item.freshness >= contract.minimumFreshness
  ));
  const completedSteps = catchReady ? 2 : 1;
  const guidance = navigationGuidance(simulation);

  return {
    title: contract.title,
    instruction: guidance.instruction,
    completedSteps,
    totalSteps: 3,
    steps: [
      {
        label: "Assignment accepted",
        detail: harborById(contract.origin).name,
        complete: true,
        current: false,
      },
      {
        label: `Catch ${fish.name}`,
        detail: spotById(contract.spot).name,
        complete: catchReady,
        current: !catchReady,
      },
      {
        label: "Deliver specimen",
        detail: harborById(contract.destination).name,
        complete: false,
        current: catchReady,
      },
    ],
  };
}
