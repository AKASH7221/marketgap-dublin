import { rank, calculate } from "./model.mjs";

const element = id => document.getElementById(id);
const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-IE", { style: "percent", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1 });
const format = (value, formatter, suffix = "") => value === null ? "—" : formatter.format(value) + suffix;
const budget = element("budget");
const form = element("finance");
let selected = "Rathmines";
let visible = [];
let map;
let ready = false;
let pins = [];

function metric(label, value) {
  const card = document.createElement("div");
  card.className = "metric";
  const text = document.createElement("span");
  text.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  card.append(text, strong);
  return card;
}

function renderSelection() {
  const area = visible.find(item => item.name === selected);
  element("detailTitle").textContent = area?.name ?? "No matching locations";
  element("detailText").textContent = area
    ? `Illustrative minimum investment ${euros.format(area.cost)} · Score ${area.score}/100`
    : "Change the category, search or investment budget to see a location analysis.";
  element("detailMetrics").replaceChildren(...(area ? [
    metric("Demand / 100", area.demand),
    metric("Competition gap / 100", area.gap),
    metric("Accessibility / 100", area.access),
  ] : []));
  for (const button of document.querySelectorAll("[data-area]")) {
    button.setAttribute("aria-pressed", String(button.dataset.area === selected));
  }
}

function selectArea(area) {
  selected = area.name;
  renderSelection();
  if (ready) map.easeTo({ center: area.point, zoom: Math.max(map.getZoom(), 14.5) });
}

function updateMap() {
  if (!ready) return;
  pins.forEach(pin => pin.remove());
  pins = visible.map(area => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-pin";
    button.dataset.area = area.name;
    button.textContent = area.score;
    button.setAttribute("aria-label", `${area.name}, demo score ${area.score} out of 100`);
    button.onclick = () => selectArea(area);
    return new maplibregl.Marker({ element: button }).setLngLat(area.point).addTo(map);
  });
  map.getSource("opportunities").setData({
    type: "FeatureCollection",
    features: visible.map(area => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: area.point },
      properties: { weight: area.score / 100 },
    })),
  });
}

function renderExplore() {
  element("budgetValue").textContent = euros.format(Number(budget.value));
  visible = rank(element("category").value, Number(budget.value), element("areaSearch").value);
  if (!visible.some(area => area.name === selected)) selected = visible[0]?.name;
  element("count").textContent = `${visible.length} of 8 areas`;
  const buttons = visible.map(area => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result";
    button.dataset.area = area.name;
    const label = document.createElement("span");
    label.textContent = area.name;
    const cost = document.createElement("small");
    cost.textContent = `From ${euros.format(area.cost)}`;
    label.append(cost);
    const score = document.createElement("strong");
    score.textContent = `${area.score}/100`;
    button.append(label, score);
    button.onclick = () => selectArea(area);
    return button;
  });
  element("results").replaceChildren(...buttons);
  if (!buttons.length) element("results").textContent = "No areas match your filters.";
  updateMap();
  renderSelection();
}

function renderFinance() {
  const target = element("financeResults");
  const values = Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key, value === "" ? NaN : Number(value)]));
  const result = form.checkValidity() ? calculate(values) : null;
  if (!result) {
    target.textContent = "Enter a valid value in each field to see estimates.";
    return;
  }
  target.replaceChildren(
    metric("Monthly revenue", euros.format(result.revenue)),
    metric("Monthly operating profit", euros.format(result.profit)),
    metric("Operating margin", format(result.margin, percent)),
    metric("Break-even customers / day", format(result.breakEven, number)),
    metric("Simple payback", format(result.payback, number, " months")),
    metric("Simple annual ROI", format(result.annualRoi, percent)),
  );
}

function initMap() {
  const status = element("mapStatus");
  const mode = element("mapMode");
  const heat = element("heatmap");
  const opacity = element("opacity");
  const unavailable = () => {
    status.hidden = false;
    status.textContent = "The street map is unavailable. Rankings and the calculator are still available.";
  };
  try {
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      bounds: [[-6.31, 53.28], [-6.22, 53.38]],
      fitBoundsOptions: { padding: 35 },
      maxPitch: 65, maxZoom: 20,
    });
  } catch {
    unavailable();
    return;
  }
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.scrollZoom.disable();
  map.on("error", () => { if (!ready) unavailable(); });
  const loadTimeout = setTimeout(unavailable, 18000);
  map.once("load", () => {
    clearTimeout(loadTimeout);
    status.hidden = true;
    const style = map.getStyle();
    const buildings = style.layers.find(layer => layer["source-layer"] === "building" && layer.type === "fill");
    const label = style.layers.find(layer => layer.type === "symbol");
    const extrusion = style.layers.find(layer => layer.type === "fill-extrusion" && layer["source-layer"] === "building");
    const buildingLayer = extrusion?.id ?? (buildings && "marketgap-buildings");
    if (extrusion) map.setLayoutProperty(extrusion.id, "visibility", "none");
    if (buildings && !extrusion) {
      map.addLayer({
        id: "marketgap-buildings", type: "fill-extrusion", source: buildings.source,
        "source-layer": "building", minzoom: 15,
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": "#cfcbc0",
          "fill-extrusion-height": ["coalesce", ["to-number", ["get", "render_height"], 0], 0],
          "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"], 0], 0],
          "fill-extrusion-opacity": 0.85,
        },
      }, label?.id);
    }
    map.addSource("opportunities", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "demo-heat", type: "heatmap", source: "opportunities",
      layout: { visibility: "none" },
      paint: {
        "heatmap-opacity": 0.5,
        "heatmap-weight": ["get", "weight"],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 24, 16, 55],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(22,185,126,0)", 0.25, "#4adeb3", 0.6, "#13ae78", 1, "#0f6a54"],
      },
    }, label?.id);
    const vectorSource = buildings?.source ?? extrusion?.source;
    if (vectorSource && !style.layers.some(layer => layer["source-layer"] === "housenumber")) {
      const fonts = style.layers.find(layer => Array.isArray(layer.layout?.["text-font"]))?.layout["text-font"];
      map.addLayer({
        id: "marketgap-addresses", type: "symbol", source: vectorSource,
        "source-layer": "housenumber", minzoom: 17,
        layout: {
          "text-field": ["get", "housenumber"],
          ...(fonts && { "text-font": fonts }),
          "text-size": 10,
        },
        paint: { "text-color": "#4b5860", "text-halo-color": "#ffffff", "text-halo-width": 1 },
      });
    }
    ready = true;
    mode.disabled = !buildingLayer;
    heat.disabled = false;
    mode.onclick = () => {
      const tilted = mode.getAttribute("aria-pressed") !== "true";
      mode.setAttribute("aria-pressed", String(tilted));
      mode.textContent = tilted ? "Street view" : "3D view";
      if (buildingLayer) {
        map.setLayoutProperty(buildingLayer, "visibility", tilted ? "visible" : "none");
      }
      map.easeTo({ pitch: tilted ? 55 : 0, zoom: tilted ? Math.max(15.5, map.getZoom()) : map.getZoom() });
    };
    heat.onchange = () => {
      map.setLayoutProperty("demo-heat", "visibility", heat.checked ? "visible" : "none");
      opacity.disabled = !heat.checked;
    };
    opacity.oninput = () => map.setPaintProperty("demo-heat", "heatmap-opacity", Number(opacity.value));
    updateMap();
    renderSelection();
  });
}

for (const id of ["category", "budget", "areaSearch"]) element(id).addEventListener("input", renderExplore);
form.addEventListener("input", renderFinance);
form.addEventListener("submit", event => event.preventDefault());
renderExplore();
renderFinance();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initMap, { once: true });
else initMap();
