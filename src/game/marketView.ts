import {
  BEACH_SPOT_RESIDENTS,
  FISH,
  WORLD_SPOT_RESIDENTS,
  type FishSpecies,
  type HarborId,
} from "./balance";
import {
  bulkSalePreview,
  marketHistory,
  marketQuote,
  salePreview,
  type MarketHistoryPoint,
  type MarketTrend,
} from "./market";
import type { Simulation } from "./simulation";

export function marketBoardMarkup(
  simulation: Simulation,
  harborId: HarborId,
  selectedSpecies: FishSpecies,
  detailOpen: boolean,
  fishAtlasUrl: string,
  beachFishAtlasUrl: string,
): string {
  const speciesList = Object.values(WORLD_SPOT_RESIDENTS[simulation.world]).flat();
  const discovered = speciesList.filter((species) => (
    simulation.progress.discovered.includes(species)
  ));
  const selected = discovered.includes(selectedSpecies) ? selectedSpecies : discovered[0] ?? "bluegill";

  if (detailOpen) {
    return `<section class="market-board is-detail-view" aria-label="Fish market">
      ${marketDetailMarkup(simulation, harborId, selected, fishAtlasUrl, beachFishAtlasUrl)}
    </section>`;
  }

  const listings = speciesList.map((species, index) => {
    if (!simulation.progress.discovered.includes(species)) {
      return `<div class="market-listing is-locked" role="listitem" aria-label="Undiscovered fish, locked" style="--market-card-index: ${index}">
        <span class="market-locked-fish-wrap" aria-hidden="true">
          ${fishIcon(species, fishAtlasUrl, beachFishAtlasUrl, "market-listing-fish")}
          <span class="market-lock-question">?</span>
        </span>
        <span class="market-listing-copy"><strong>Undiscovered</strong><span class="market-lock-pill">Locked</span></span>
      </div>`;
    }
    const quote = marketQuote(species, harborId, simulation.progress.marketDay, simulation.seed);
    const cargoCount = simulation.cargo.filter((item) => item.species === species).length;
    const tutorialTarget = (
      simulation.progress.marketTutorialStep === "inspect"
      || simulation.progress.marketTutorialStep === "sell"
    ) && species === "bluegill";
    const isTracked = simulation.progress.marketTarget === species;
    const cargoLabel = cargoCount > 0 ? `, ${cargoCount} in cargo` : "";
    const cargoBadge = cargoCount > 0
      ? `<span class="market-cargo-count" aria-label="${cargoCount} ${FISH[species].name} in cargo">×${cargoCount}</span>`
      : "";
    const trackingBadge = isTracked
      ? `<span class="market-tracking-badge" aria-label="Tracking ${FISH[species].name}">!</span>`
      : "";
    return `<button class="market-listing ${tutorialTarget ? "is-tutorial-target" : ""}" type="button" data-action="select-market-fish" data-species="${species}" aria-label="${FISH[species].name}, ${quote.price} shells${cargoLabel}${isTracked ? ", tracked" : ""}" style="--market-card-index: ${index}">
      <span class="market-listing-fish-wrap">${trackingBadge}${fishIcon(species, fishAtlasUrl, beachFishAtlasUrl, "market-listing-fish")}${cargoBadge}</span>
      <span class="market-listing-copy"><strong>${FISH[species].name}</strong><span class="market-price-pill"><span class="ui-icon icon-shells" aria-hidden="true"></span>${quote.price}</span></span>
    </button>`;
  }).join("");

  const bulkSale = bulkSalePreview(
    simulation.cargo,
    harborId,
    simulation.progress.marketDay,
    simulation.seed,
  );
  const sellAllLabel = bulkSale.quantity === 0
    ? "No fresh fish to sell"
    : `Sell all ${bulkSale.quantity} fish for ${bulkSale.total} shells`;
  const sellAllContent = bulkSale.quantity === 0
    ? sellAllLabel
    : `Sell all ${bulkSale.quantity} fish <span aria-hidden="true">·</span> <span class="market-sell-all-total">${bulkSale.total}<span class="ui-icon icon-shells" aria-hidden="true"></span></span>`;

  return `<section class="market-board is-catalogue-view" aria-label="Fish market">
    <header class="market-board-heading">
      <h3>Fish market</h3>
      <button class="market-sell-all-button ${bulkSale.quantity > 0 ? "is-active" : ""}" type="button" data-action="sell-all-market-fish" aria-label="${sellAllLabel}" ${bulkSale.quantity === 0 ? "disabled" : ""}>${sellAllContent}</button>
    </header>
    <div class="market-list" role="list" aria-label="Fish prices and locked discoveries">${listings}</div>
  </section>`;
}

function marketDetailMarkup(
  simulation: Simulation,
  harborId: HarborId,
  species: FishSpecies,
  fishAtlasUrl: string,
  beachFishAtlasUrl: string,
): string {
  const fish = FISH[species];
  const quote = marketQuote(species, harborId, simulation.progress.marketDay, simulation.seed);
  const history = marketHistory(species, harborId, simulation.progress.marketDay, simulation.seed);
  const sale = salePreview(simulation.cargo, species, quote.price);
  const isTracked = simulation.progress.marketTarget === species;
  const trackTarget = simulation.progress.marketTutorialStep === "track" && species === "bluegill";
  const sellTarget = simulation.progress.marketTutorialStep === "sell" && species === "bluegill";
  return `<article class="market-detail" aria-labelledby="market-detail-title">
    <div class="market-detail-layout">
      <section class="market-fish-summary" aria-label="${fish.name} sale summary">
        ${fishIcon(species, fishAtlasUrl, beachFishAtlasUrl, "market-detail-fish")}
        <div class="market-fish-heading"><h3 id="market-detail-title">${fish.name}</h3></div>
        <div class="market-summary-pills">
          <span class="market-price-pill is-large"><span class="ui-icon icon-shells" aria-hidden="true"></span><strong>${quote.price}</strong><small>each</small></span>
        </div>
        <button class="market-track-button ${isTracked ? "is-tracked" : ""} ${trackTarget ? "is-tutorial-target" : ""}" type="button" data-action="track-market-fish" data-species="${species}" aria-pressed="${isTracked}">${isTracked ? "✓ Tracking this fish" : `Track ${fish.name}`}</button>
        <button class="primary-button market-sell-button ${sellTarget ? "is-tutorial-target" : ""}" type="button" data-action="sell-market-fish" data-species="${species}" ${sale.quantity === 0 ? "disabled" : ""}>${sale.quantity === 0 ? "No fresh fish to sell" : `Sell ${sale.quantity} fish · ${sale.total} shells`}</button>
      </section>
      <section class="market-chart-shell" aria-labelledby="price-history-title">
        <div class="market-chart-heading">
          <h4 id="price-history-title">7-day price</h4>
          <span class="market-trend is-${quote.trend}" aria-label="${trendAria(quote.changePercent)}">${trendSymbol(quote.trend)} ${trendLabel(quote.trend)} ${formatChange(quote.changePercent)}</span>
        </div>
        ${priceGraph(history, fish.name)}
      </section>
    </div>
  </article>`;
}

function fishIcon(
  species: FishSpecies,
  fishAtlasUrl: string,
  beachFishAtlasUrl: string,
  className: string,
): string {
  const [column, row] = FISH[species].atlasCell;
  const beachSpecies = Object.values(BEACH_SPOT_RESIDENTS).some((residents) => residents.includes(species));
  const atlasUrl = beachSpecies ? beachFishAtlasUrl : fishAtlasUrl;
  return `<span class="market-fish-icon ${className}" role="img" aria-label="${FISH[species].name}" style="--fish-atlas-url: url(&quot;${atlasUrl}&quot;); --fish-atlas-x: ${column * 50}%; --fish-atlas-y: ${row * 50}%"></span>`;
}

function priceGraph(history: MarketHistoryPoint[], fishName: string): string {
  const prices = history.map((point) => point.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const range = Math.max(1, maximum - minimum);
  const points = history.map((point, index) => {
    const x = 34 + (index / Math.max(1, history.length - 1)) * 332;
    const y = 176 - ((point.price - minimum) / range) * 126;
    return { ...point, x, y };
  });
  const path = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const currentDay = history.at(-1)?.day ?? 1;
  const guides = points.map((point) => `<line class="graph-guide" x1="${point.x}" y1="42" x2="${point.x}" y2="176"></line>`).join("");
  const labels = points.map((point) => `<text x="${point.x}" y="207" text-anchor="middle">${point.day === currentDay ? "TODAY" : `${point.day - currentDay}d`}</text>`).join("");
  const dots = points.map((point) => {
    const daysAgo = currentDay - point.day;
    const dayLabel = daysAgo === 0 ? "Today" : `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
    return `<circle cx="${point.x}" cy="${point.y}" r="5"><title>${dayLabel}: ${point.price} shells</title></circle>`;
  }).join("");
  const description = history.map((point) => {
    const daysAgo = currentDay - point.day;
    const dayLabel = point.day === currentDay
      ? "today"
      : `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
    return `${dayLabel}, ${point.price} shells`;
  }).join("; ");
  return `<svg class="market-price-graph" viewBox="0 0 400 220" role="img" aria-label="${fishName} price history: ${description}">
    ${guides}
    <line class="graph-axis" x1="34" y1="176" x2="366" y2="176"></line>
    <polyline points="${path}"></polyline>${dots}${labels}
    <text class="graph-value graph-value-high" x="34" y="30">${maximum} shells</text>
    <text class="graph-value" x="34" y="194">${minimum}</text>
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
