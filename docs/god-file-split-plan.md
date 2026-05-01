# God File Split Plan

This plan captures the current module boundaries after the first extraction pass and the next safe splits.

## Completed Boundaries

- `WebDemo/scripts/keywords-graph-api.js` owns same-origin keyword graph API calls.
- `WebDemo/scripts/keywords-ai-panel.js` owns the keywords page AI side panel.
- `WebDemo/scripts/main-drag-drop.js` owns landing page product drag/drop collection behavior.
- `WebDemo/scripts/main-map-data.js` owns landing page chatbot map location data.
- `WebDemo/scripts/main-product-data.js` owns landing page product metadata generated from dropped images.
- `WebDemo/scripts/dashboard-storage.js` owns dashboard storage fallback reads.
- `WebDemo/scripts/dashboard-map-data.js` owns product dashboard map locations and store coordinates.
- `WebDemo/scripts/financials.js` and `WebDemo/scripts/campaigns.js` hold logic extracted from inline page scripts.
- `WebDemo/scripts/keywords-data.js` owns curated keyword graph data, article metadata, groups, and categories.
- `WebDemo/scripts/keywords-graph-utils.js` owns pure keyword graph utility functions.
- `WebDemo/scripts/keywords-linear-view.js` owns linear/list view HTML rendering helpers.

## Next Frontend Splits

### `WebDemo/scripts/keywords.js`

Target modules:

- `keywords-data.js` for default nodes, links, categories, and article metadata. Done.
- `keywords-graph-utils.js` for pure graph neighborhood/search helpers. Done.
- `keywords-linear-view.js` for linear/list view HTML rendering helpers. Done.
- `keywords-bubble-view.js` for D3 bubble graph rendering and zoom/fullscreen controls.
- `keywords-linear-view.js` for linear connected-keyword rendering.
- `keywords-filters.js` for group filters, search, and disabled-node state.

### `WebDemo/scripts/main.js`

Target modules:

- `main-chat.js` for chat widget state and Luxury Intelligence rendering.
- `main-map-data.js` for map location data. Done.
- `main-product-data.js` for product metadata generated from dropped images. Done.
- `main-map.js` for Leaflet setup and map view behavior.
- `main-gallery.js` for media gallery state, navigation, and storage events.
- `main-products.js` for product cards and product component toggles.

### `WebDemo/scripts/product-dashboard.js`

Target modules:

- `dashboard-chat.js` for the explore/map chat panels.
- `dashboard-gallery.js` for media cards, drawer behavior, and favorites.
- `dashboard-map-data.js` for static location/store data. Done.
- `dashboard-map.js` for Leaflet map rendering and product locations.
- `dashboard-products.js` for product drawer and library rendering.

### `WebDemo/styles/dashboard.css`

Target files:

- `styles/tokens.css` for colors, spacing, fonts, and reusable variables.
- `styles/layout.css` for app shell, sidebar, appbar, and responsive layout.
- `styles/components/*.css` for buttons, drawers, cards, modals, and forms.
- `styles/pages/*.css` for dashboard, product dashboard, financials, campaigns, and keywords page overrides.

## Split Rules

- Move one behavior cluster at a time and keep script tag order explicit in the owning HTML page.
- Preserve existing global APIs until all callers are migrated, then remove the global.
- Run `node --check` for every touched script and the HTML script-reference smoke check after each split.
- Avoid moving generated or archived code; `WebDemo` is the active frontend source.
