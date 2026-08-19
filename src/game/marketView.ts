import {
  FISH,
  HARBORS,
  type FishSpecies,
  type HarborId,
} from "./balance";
import {
  marketCondition,
  marketHistory,
  marketLocationText,
  marketQuote,
  salePreview,
  spotForSpecies,
  type MarketHistoryPoint,
  type MarketTrend,
} from "./market";
import type { Simulation } from "./simulation";

export function marketBoardMarkup(
  simulation: Simulation,
  harborId: HarborId,
  selectedSpecies: FishSpecies,
  fishAtlasUrl: string,
): string {
  const discovered = (Object.keys(FISH) as FishSpecies[]).filter((species) => (
    simulation.progress.discovered.includes(species)
  ));
  const selected = discovered.includes(selectedSpecies) ? selectedSpecies : discovered[0] ?? "bluegill";
  const condition = marketCondition(simulation.progress.marketDay, simulation.seed);
  const listings = discovered.map((species) => {
    const quote = marketQuote(species, harborId, simulation.progress.marketDay, simulation.seed);
    const tutorialTarget = simulation.progress.marketTutorialStep === "inspect" && species === "bluegill";
    return `<button class="market-listing ${selected === species ? "is-selected" : ""} ${tutorialTarget ? "is-tutorial-target" : ""}" type="button" data-action="select-market-fish" data-species="${species}" aria-pressed="${selected === species}">
      ${fishIcon(species, fishAtlasUrl, "market-listing-fish")}
      <span class="market-listing-copy"><strong>${FISH[species].name}</strong><small>${availabilityLabel(quote.availability)} · ${trendLabel(quote.trend)}</small></span>
      <span class="market-listing-price"><strong>${quote.price}</strong><small>shells</small><span class="market-trend is-${quote.trend}" aria-label="${trendAria(quote.changePercent)}">${trendSymbol(quote.trend)} ${formatChange(quote.changePercent)}</span></span>
    </button>`;
  }).join("");

  return `<section class="market-board" aria-label="Fish market">
    <header class="market-board-heading">
      <div><span class="panel-eyebrow">DAY ${simulation.progress.marketDay} · LOCAL EXCHANGE</span><h3>Today's catch prices</h3></div>
      <div class="market-condition" aria-label="Lake condition: ${condition.name}"><strong>${condition.name}</strong><span>${condition.description}</span></div>
    </header>
    <div class="market-layout">
      <section class="market-list-shell" aria-labelledby="market-list-title">
        <div class="market-list-heading"><h4 id="market-list-title">Discovered fish</h4><span>${discovered.length} of ${Object.keys(FISH).length}</span></div>
        <div class="market-list" role="list">${listings}</div>
      </section>
      ${marketDetailMarkup(simulation, harborId, selected, fishAtlasUrl)}
    </div>
  </section>`;
}

function marketDetailMarkup(
  simulation: Simulation,
  harborId: HarborId,
  species: FishSpecies,
  fishAtlasUrl: string,
): string {
  const fish = FISH[species];
  const quote = marketQuote(species, harborId, simulation.progress.marketDay, simulation.seed);
  const otherHarbor = HARBORS.find((harbor) => harbor.id !== harborId) ?? HARBORS[0]!;
  const otherQuote = marketQuote(species, otherHarbor.id, simulation.progress.marketDay, simulation.seed);
  const history = marketHistory(species, harborId, simulation.progress.marketDay, simulation.seed);
  const sale = salePreview(simulation.cargo, species, quote.price);
  const spot = spotForSpecies(species);
  const isTracked = simulation.progress.marketTarget === species;
  const trackTarget = simulation.progress.marketTutorialStep === "track" && species === "bluegill";
  const sellTarget = simulation.progress.marketTutorialStep === "sell" && species === "bluegill";
  return `<article class="market-detail" aria-labelledby="market-detail-title">
    <header class="market-detail-heading">
      ${fishIcon(species, fishAtlasUrl, "market-detail-fish")}
      <div><span class="panel-eyebrow">${fish.rarity} · line tier ${fish.depthTier}</span><h3 id="market-detail-title">${fish.name}</h3><p>${fish.shape}</p></div>
      <div class="market-current-price"><span>Whole fish</span><strong>${quote.price}</strong><small>shells</small></div>
    </header>
    <section class="market-chart-shell" aria-labelledby="price-history-title">
      <div class="market-chart-heading"><div><span class="panel-eyebrow">LOCAL QUOTE</span><h4 id="price-history-title">Seven-day price</h4></div><span class="market-trend is-${quote.trend}">${trendSymbol(quote.trend)} ${trendLabel(quote.trend)} ${formatChange(quote.changePercent)}</span></div>
      ${priceGraph(history, fish.name)}
    </section>
    <dl class="market-facts">
      <div><dt>Found at</dt><dd>${marketLocationText(species)}</dd></div>
      <div><dt>Access</dt><dd>${spot.requiresPermit ? "Outer Gloam permit · " : ""}Line tier ${fish.depthTier}</dd></div>
      <div><dt>Today's supply</dt><dd>${availabilityLabel(quote.availability)}</dd></div>
      <div><dt>${otherHarbor.name}</dt><dd>${otherQuote.price} shells ${otherQuote.price > quote.price ? "· higher" : otherQuote.price < quote.price ? "· lower" : "· same"}</dd></div>
    </dl>
    <section class="market-sale-summary" aria-label="Sale estimate">
      <div><span>In your hold</span><strong>${sale.quantity}</strong></div>
      <div><span>Average freshness</span><strong>${sale.quantity > 0 ? `${sale.averageFreshness}%` : "None"}</strong></div>
      <div><span>Freshness cost</span><strong>${sale.quantity > 0 ? `−${sale.freshnessLoss}` : "0"}</strong></div>
      <div class="market-sale-total"><span>You receive</span><strong>${sale.total} shells</strong></div>
    </section>
    <div class="market-detail-actions">
      <button class="market-track-button ${isTracked ? "is-tracked" : ""} ${trackTarget ? "is-tutorial-target" : ""}" type="button" data-action="track-market-fish" data-species="${species}" aria-pressed="${isTracked}">${isTracked ? "Tracking" : `Track ${fish.name}`}</button>
      <button class="primary-button market-sell-button ${sellTarget ? "is-tutorial-target" : ""}" type="button" data-action="sell-market-fish" data-species="${species}" ${sale.quantity === 0 ? "disabled" : ""}>${sale.quantity === 0 ? "No fresh catch to sell" : `Sell ${sale.quantity} for ${sale.total} shells`}</button>
    </div>
  </article>`;
}

function fishIcon(species: FishSpecies, fishAtlasUrl: string, className: string): string {
  const [column, row] = FISH[species].atlasCell;
  return `<span class="market-fish-icon ${className}" role="img" aria-label="${FISH[species].name}" style="--fish-atlas-url: url(&quot;${fishAtlasUrl}&quot;); --fish-atlas-x: ${column * 50}%; --fish-atlas-y: ${row * 50}%"></span>`;
}

function priceGraph(history: MarketHistoryPoint[], fishName: string): string {
  const prices = history.map((point) => point.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const range = Math.max(1, maximum - minimum);
  const points = history.map((point, index) => {
    const x = 10 + (index / Math.max(1, history.length - 1)) * 180;
    const y = 72 - ((point.price - minimum) / range) * 54;
    return { ...point, x, y };
  });
  const path = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const currentDay = history.at(-1)?.day ?? 1;
  const labels = points.map((point) => `<text x="${point.x}" y="94" text-anchor="middle">${point.day === currentDay ? "TODAY" : `${point.day - currentDay}d`}</text>`).join("");
  const dots = points.map((point) => {
    const daysAgo = currentDay - point.day;
    const dayLabel = daysAgo === 0 ? "Today" : `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
    return `<circle cx="${point.x}" cy="${point.y}" r="2.8"><title>${dayLabel}: ${point.price} shells</title></circle>`;
  }).join("");
  const description = history.map((point) => {
    const daysAgo = currentDay - point.day;
    const dayLabel = point.day === currentDay
      ? "today"
      : `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
    return `${dayLabel}, ${point.price} shells`;
  }).join("; ");
  return `<svg class="market-price-graph" viewBox="0 0 200 100" role="img" aria-label="${fishName} price history: ${description}">
    <line x1="10" y1="72" x2="190" y2="72"></line>
    <line x1="10" y1="18" x2="10" y2="72"></line>
    <polyline points="${path}"></polyline>${dots}${labels}
    <text class="graph-value graph-value-high" x="12" y="15">${maximum}</text>
    <text class="graph-value" x="12" y="84">${minimum}</text>
  </svg>`;
}

function trendSymbol(trend: MarketTrend): string {
  return trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→";
}

function trendLabel(trend: MarketTrend): string {
  return trend === "rising" ? "Rising" : trend === "falling" ? "Falling" : "Steady";
}

function trendAria(change: number): string {
  return change === 0 ? "No change since yesterday" : `${Math.abs(change).toFixed(1)} percent ${change > 0 ? "higher" : "lower"} than yesterday`;
}

function formatChange(change: number): string {
  return `${Math.abs(change).toFixed(1)}%`;
}

function availabilityLabel(availability: "abundant" | "normal" | "scarce"): string {
  return availability === "abundant" ? "Plentiful" : availability === "scarce" ? "Hard to find" : "Usual supply";
}
