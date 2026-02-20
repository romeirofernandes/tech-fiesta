/**
 * Market Price Import Service
 * Pulls livestock / poultry commodity prices from AGMARKNET
 * (api.agmarknet.gov.in/v1/daily-price-arrival/report)
 *
 * Response shape:
 *  { status, message, data: { columns, records: [{ data: [...], pagination: [...] }] } }
 *
 * Each entry in data[]:
 *  { cmdt_name, max_price, min_price, grade_name, state_name, market_name,
 *    model_price, arrival_date, variety_name, cmdt_grp_name, district_name, unit_name_price }
 *
 * Prices are per-animal (Rs./Unit).
 */

const MarketPrice = require('../models/MarketPrice');
const {
  AGMARKNET_COMMODITY_IDS,
  AGMARKNET_COMMODITIES,
  MARKET_COMMODITY_LABELS,
} = require('../constants/biEnums');

const BASE_URL = 'https://api.agmarknet.gov.in/v1/daily-price-arrival/report';
// Fetch the last 10 records per commodity
const PER_PAGE = 10;

/**
 * Helper: format a JS Date as YYYY-MM-DD for the AGMARKNET API query params.
 */
function fmtDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a price string like "52,000.00" → 52000
 */
function parsePrice(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Parse arrival_date "DD-MM-YYYY" → JS Date (midnight UTC)
 */
function parseArrivalDate(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Import prices for a single commodity from AGMARKNET.
 * Date range: (today − 1 year) → today.
 *
 * @param {string} commodity  One of AGMARKNET_COMMODITIES (e.g. 'cow', 'egg')
 * @returns {{ imported, skipped, commodity, commodityLabel, totalFetched }}
 */
async function importPrices(commodity) {
  const commodityId = AGMARKNET_COMMODITY_IDS[commodity];
  if (commodityId == null) {
    throw new Error(
      `Invalid/unsupported AGMARKNET commodity: "${commodity}". ` +
      `Must be one of: ${AGMARKNET_COMMODITIES.join(', ')}`
    );
  }

  // Date range: 1 year back from today
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const fromDate = fmtDate(oneYearAgo);
  const toDate = fmtDate(now);

  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    data_type: '100004',
    group: '13',
    commodity: String(commodityId),
    state: '[100000]',
    district: '[100001]',
    market: '[100002]',
    grade: '[100003]',
    variety: '[100007]',
    page: '1',
    limit: String(PER_PAGE),
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`[MarketPriceImport] Fetching latest: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`AGMARKNET API returned ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (!json.status) {
    throw new Error(`AGMARKNET API error: ${json.message || 'Unknown error'}`);
  }

  let records = [];
  if (json.data?.records?.[0]) {
    records = json.data.records[0].data || [];
  }

  const totalFetched = records.length;
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  console.log(`[MarketPriceImport] Latest fetch: ${records.length} records for ${commodity}`);

  if (records.length === 0) {
    return {
      imported: 0,
      updated: 0,
      skipped: 1,
      commodity,
      commodityLabel: MARKET_COMMODITY_LABELS[commodity] || commodity,
      totalFetched,
      message: 'No records returned from AGMARKNET for this commodity',
    };
  }

  for (const rec of records) {
    try {
      const dateObj = parseArrivalDate(rec.arrival_date);
      if (!dateObj) { totalSkipped++; continue; }

      const modalPrice = parsePrice(rec.model_price);
      if (modalPrice == null || modalPrice <= 0) { totalSkipped++; continue; }

      const marketName = rec.market_name || '';

      // Upsert by (commodity + date + market + source) so each distinct
      // market/date combination is its own record, but re-imports update
      // rather than duplicate.
      const filter = {
        commodity,
        source: 'agmarknet',
        date: dateObj,
        market: marketName,
      };
      const update = {
        $set: {
          commodityLabel: rec.cmdt_name || MARKET_COMMODITY_LABELS[commodity] || commodity,
          modalPrice,
          minPrice: parsePrice(rec.min_price),
          maxPrice: parsePrice(rec.max_price),
          unit: rec.unit_name_price || 'Rs./Unit',
          state: rec.state_name || '',
          district: rec.district_name || '',
          variety: rec.variety_name || '',
          sourceUrl: url,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          commodity,
          source: 'agmarknet',
          date: dateObj,
          market: marketName,
          createdAt: new Date(),
        },
      };

      const result = await MarketPrice.updateOne(filter, update, { upsert: true });

      const upsertedId = result.upsertedId?._id || result.upsertedId;
      if (upsertedId) {
        totalImported++;
      } else {
        totalUpdated++;
      }
    } catch (err) {
      console.error(`[MarketPriceImport] Skipping record:`, err.message);
      totalSkipped++;
    }
  }

  return {
    imported: totalImported,
    updated: totalUpdated,
    skipped: totalSkipped,
    commodity,
    commodityLabel: MARKET_COMMODITY_LABELS[commodity] || commodity,
    totalFetched,
  };
}

/**
 * Import prices for ALL AGMARKNET commodities in sequence.
 * @returns {{ results: Array, totalImported, totalSkipped }}
 */
async function importAll() {
  const results = [];
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const commodity of AGMARKNET_COMMODITIES) {
    try {
      const result = await importPrices(commodity);
      results.push(result);
      totalImported += result.imported;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped;
    } catch (err) {
      console.error(`[MarketPriceImport] Failed for ${commodity}:`, err.message);
      results.push({ commodity, error: err.message, imported: 0, updated: 0, skipped: 0 });
    }
  }

  return { results, totalImported, totalUpdated, totalSkipped };
}

module.exports = { importPrices, importAll };
