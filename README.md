# MarketGap Dublin

A static business-location explorer for Dublin. The interface and application logic are original. It uses MapLibre GL JS and OpenFreeMap for the live street basemap, with no database, account or API key required.

## Run locally

1. From this directory, run `python -m http.server 8000` (Windows launcher alternative: `py -m http.server 8000`).
2. Open [localhost:8000](http://localhost:8000/). An internet connection is needed for the map and web fonts.

Run `node test.mjs` with Node.js to check the rankings and financial formulas. For a browser smoke test, select a business category, lower the budget, search for Rathmines, select a pin, toggle the heatmap and change a calculator input. Check the mobile layout by narrowing the browser. With the map CDN blocked, the results and calculator should still work.

## Publish the daily-update edition

This edition uses **GitHub Pages** for both the public site and the daily publishing job.

1. Create a **public** GitHub repository called `marketgap-dublin`.
2. Extract the ZIP and upload its contents to the repository root. Preserve the `.github/workflows/publish.yml` path. If the browser upload skips hidden folders, use **Add file → Create new file**, enter that exact path, and paste the workflow from the extracted ZIP. Ensure `index.html` is at the root.
3. Under **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. The repository already includes a workflow.
4. Choose **Actions → Publish MarketGap Dublin → Run workflow**, select the default branch, and run it. This action publishes publicly. Once it succeeds, open the production address shown by GitHub Pages.
5. After checking the live site, go to **Settings → Secrets and variables → Actions → Variables**. Create the repository variable `ENABLE_DAILY_PUBLISH` with value `true`. The job is scheduled for 06:17 UTC daily (06:17 in winter and 07:17 in summer in Dublin). GitHub can delay scheduled jobs and disables them in inactive public repositories after 60 days. Use **Run workflow** to refresh or redeploy manually.

The workflow fetches Transport for Ireland's publicly posted service updates and publishes a Dublin-related selection of active headlines. The filter relies on operator and headline text, so it may miss alerts. The snapshot shows when the page was checked and displays an overdue message after 36 hours. If the source request or parsing fails, the workflow stops and the last deployment stays online. Transport notices do not affect simulated opportunity scores.

[GitHub Pages workflow setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [Transport for Ireland service updates](https://www.transportforireland.ie/plan-a-journey/service-updates/)

## Data and assumptions

- **Sourced geography:** The live [OpenFreeMap](https://openfreemap.org/) Liberty style is based on [OpenStreetMap](https://www.openstreetmap.org/copyright). Roads, street names, building footprints, address numbers, and points of interest follow local coverage and style zoom levels. Building heights depend on tile data. The map exposes source attribution. The basemap’s business labels are general map points of interest, with no verified competitor inventory.
- **Illustrative business data:** All opportunity inputs, scores, startup costs, heatmap weights, and calculator defaults are simulated. Pins identify approximate neighbourhood centres. The app does not ingest footfall, census, rents, business registers or transit feeds. The area search filters the eight demo neighbourhoods. Satellite and address geocoding are outside this version.
- **Scoring:** Score = 45% demand + 35% competition gap + 20% accessibility, rounded to the nearest integer. Category changes the estimated cost and gap. Results must fit the selected budget. The heatmap displays the filtered points weighted by score.
- **Finance:** Revenue = customers × spend × trading days. Operating profit = revenue less variable costs and fixed costs. Break-even customers per day is rounded up. Payback and annual operating ROI use steady monthly profit. Tax, depreciation, financing and one-off expenses are excluded. A dash indicates an undefined result.

## Files

`index.html` and `style.css` define the interface, `app.mjs` handles the map and interactions, `model.mjs` holds sample inputs and calculation logic, and `test.mjs` checks the model.
