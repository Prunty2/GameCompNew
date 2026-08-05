import lakeChartUrl from "./assets/lake-chart.png";
import guideUrl from "./assets/tutorial-guide.png";
import "./tutorial-demo.css";

type GuideSide = "left" | "right";
type SceneKind = "arrival" | "evidence" | "route" | "choice" | "handoff";

interface DialogueScene {
  readonly chapter: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly kind: SceneKind;
  readonly side: GuideSide;
  readonly note?: string;
  readonly facts?: readonly string[];
  readonly choices?: readonly string[];
}

const scenes: readonly DialogueScene[] = [
  {
    chapter: "First light",
    eyebrow: "Brindle Harbor · 06:12",
    title: "You made it across.",
    body: "Name’s Rook. I keep the survey ledgers—and most things here from drifting off overnight. Your boat looks rough, but the lake’s forgiving in daylight.",
    note: "Short dialogue · Standard prompt",
    kind: "arrival",
    side: "left",
  },
  {
    chapter: "Read the lake",
    eyebrow: "Survey lesson · Sunward Shoal",
    title: "Evidence first. Always.",
    body: "Every fishing ground tells you what can live there. Read the depth, temperature, oxygen, turbidity, and habitat before you choose a fish. A good guess starts with the water—not the picture in the field guide.",
    facts: ["Depth", "Temperature", "Oxygen", "Turbidity", "Habitat"],
    note: "Long dialogue · Evidence chips",
    kind: "evidence",
    side: "right",
  },
  {
    chapter: "First assignment",
    eyebrow: "The Morning Order · 1 of 3",
    title: "Survey. Catch. Deliver.",
    body: "Take the skiff east to Sunward Shoal. Confirm the Reedfin from the readings, guide your hook to one healthy fish, then bring it to Gloam Ferry before its freshness falls.",
    facts: ["01 · Survey the shoal", "02 · Catch one Reedfin", "03 · Reach Gloam Ferry"],
    note: "Mission dialogue · Sequential objectives",
    kind: "route",
    side: "left",
  },
  {
    chapter: "Check your thinking",
    eyebrow: "Water survey · Your call",
    title: "What matters most here?",
    body: "The water is shallow, warm, clear, and rich in reeds. Which clue would you use first to support a Reedfin prediction?",
    choices: ["The reed habitat and broad fins", "The distant harbor lights"],
    note: "Decision dialogue · Two scalable choices",
    kind: "choice",
    side: "right",
  },
  {
    chapter: "Cast off",
    eyebrow: "Rook’s field note · Keep this close",
    title: "The lake keeps a record.",
    body: "Catch carefully. Release what you don’t need. And if the fog comes down, follow the markers—not the shapes between them. I’ll meet you at the ledger when the delivery is done.",
    note: "Closing dialogue · Emphatic handoff",
    kind: "handoff",
    side: "left",
  },
];

function getDemoRoot(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#tutorial-demo");
  if (!element) throw new Error("Tutorial demo root is missing.");
  return element;
}

const root = getDemoRoot();

let sceneIndex = 0;
let sideOverride: GuideSide | null = null;

function sceneSide(scene: DialogueScene): GuideSide {
  return sideOverride ?? scene.side;
}

function renderFacts(scene: DialogueScene): string {
  if (!scene.facts) return "";
  return `<ul class="dialogue-facts dialogue-facts--${scene.kind}" aria-label="Key information">
    ${scene.facts.map((fact) => `<li>${fact}</li>`).join("")}
  </ul>`;
}

function renderChoices(scene: DialogueScene): string {
  if (!scene.choices) return "";
  return `<div class="dialogue-choices" role="group" aria-label="Dialogue choices">
    ${scene.choices.map((choice, index) => `<button class="choice-button" type="button" data-choice="${index}"><span>${String.fromCharCode(65 + index)}</span>${choice}</button>`).join("")}
  </div>`;
}

function render(): void {
  const scene = scenes[sceneIndex];
  const side = sceneSide(scene);
  const progress = ((sceneIndex + 1) / scenes.length) * 100;
  const nextLabel = sceneIndex === scenes.length - 1 ? "Replay demo" : "Continue";

  root.innerHTML = `
    <section class="dialogue-demo" data-side="${side}" data-kind="${scene.kind}" style="--lake-chart: url('${lakeChartUrl}')">
      <div class="lake-atmosphere" aria-hidden="true"></div>
      <header class="demo-header">
        <div class="demo-id">
          <span class="demo-mark" aria-hidden="true">F</span>
          <div><strong>Tutorial dialogue</strong><small>Standalone visual prototype</small></div>
        </div>
        <button class="side-toggle" type="button" aria-label="Move Rook to the ${side === "left" ? "right" : "left"} side">
          <span aria-hidden="true">⇄</span> Swap sides
        </button>
      </header>

      <div class="scene-stage">
        <figure class="guide-portrait" aria-label="Rook, Brindle Harbor surveyor">
          <div class="guide-halo" aria-hidden="true"></div>
          <img src="${guideUrl}" alt="Rook, a stocky harbor surveyor in an orange beanie and weathered navy jacket, holding a field notebook" />
          <figcaption><strong>Rook</strong><span>Harbor surveyor</span></figcaption>
        </figure>

        <article class="dialogue-panel dialogue-panel--${scene.kind}" aria-live="polite" aria-labelledby="dialogue-title">
          <div class="dialogue-index" aria-label="Scene ${sceneIndex + 1} of ${scenes.length}">
            <span>${String(sceneIndex + 1).padStart(2, "0")}</span><i></i><span>${String(scenes.length).padStart(2, "0")}</span>
          </div>
          <p class="dialogue-eyebrow">${scene.eyebrow}</p>
          <h1 id="dialogue-title">${scene.title}</h1>
          <p class="dialogue-copy">${scene.body}</p>
          ${renderFacts(scene)}
          ${renderChoices(scene)}
          <footer class="dialogue-footer">
            <span class="dialogue-note">${scene.note ?? scene.chapter}</span>
            <nav class="dialogue-actions" aria-label="Dialogue navigation">
              <button class="nav-button nav-button--back" type="button" ${sceneIndex === 0 ? "disabled" : ""} aria-label="Previous dialogue">←</button>
              <button class="nav-button nav-button--next" type="button">${nextLabel}<span aria-hidden="true">→</span></button>
            </nav>
          </footer>
          <div class="panel-corner" aria-hidden="true"></div>
        </article>
      </div>

      <footer class="demo-progress">
        <span>${scene.chapter}</span>
        <div class="progress-track" aria-hidden="true"><i style="width: ${progress}%"></i></div>
        <div class="scene-dots" role="group" aria-label="Choose demo scene">
          ${scenes.map((_, index) => `<button type="button" data-scene="${index}" aria-label="Show scene ${index + 1}" ${index === sceneIndex ? "aria-current=\"step\"" : ""}></button>`).join("")}
        </div>
      </footer>
    </section>`;

  root.querySelector<HTMLButtonElement>(".nav-button--back")?.addEventListener("click", () => showScene(sceneIndex - 1));
  root.querySelector<HTMLButtonElement>(".nav-button--next")?.addEventListener("click", () => showScene(sceneIndex === scenes.length - 1 ? 0 : sceneIndex + 1));
  root.querySelector<HTMLButtonElement>(".side-toggle")?.addEventListener("click", () => {
    sideOverride = side === "left" ? "right" : "left";
    render();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach((button) => {
    button.addEventListener("click", () => showScene(Number(button.dataset.scene)));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll(".choice-button").forEach((choice) => choice.removeAttribute("data-selected"));
      button.dataset.selected = "true";
      window.setTimeout(() => showScene(sceneIndex + 1), 280);
    });
  });
}

function showScene(index: number): void {
  if (index < 0 || index >= scenes.length) return;
  sceneIndex = index;
  sideOverride = null;
  render();
  root.querySelector<HTMLElement>(".dialogue-panel")?.focus({ preventScroll: true });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "Enter") showScene(sceneIndex === scenes.length - 1 ? 0 : sceneIndex + 1);
  if (event.key === "ArrowLeft") showScene(sceneIndex - 1);
});

render();
