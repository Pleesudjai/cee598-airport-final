/**
 * TAF Client — Lookup TAF operations from pre-loaded JSON
 * Data indexed by 3-letter LOCID (no K prefix)
 */

let tafOps = null;
let tafBased = null;

export async function loadTAFData() {
  if (!tafOps) {
    const [opsResp, baResp] = await Promise.all([
      fetch('/src/data/taf_operations.json'),
      fetch('/src/data/taf_based_aircraft.json'),
    ]);
    tafOps = await opsResp.json();
    tafBased = await baResp.json();
  }
}

function icaoToLocid(icao) {
  if (!icao) return '';
  const code = icao.toUpperCase().trim();
  return code.startsWith('K') && code.length === 4 ? code.slice(1) : code;
}

export function getOperations(icao) {
  if (!tafOps) return null;
  const locid = icaoToLocid(icao);
  const data = tafOps[locid];
  if (!data) return null;
  return data.historical || [];
}

export function getForecast(icao) {
  if (!tafOps) return null;
  const locid = icaoToLocid(icao);
  const data = tafOps[locid];
  if (!data) return null;
  return data.forecast || [];
}

export function getBasedAircraft(icao) {
  if (!tafBased) return null;
  const locid = icaoToLocid(icao);
  return tafBased[locid] || null;
}

export function computeGrowthRate(icao, startYear = null, endYear = null) {
  const ops = getOperations(icao);
  if (!ops || ops.length < 2) return 0;

  const sorted = [...ops].sort((a, b) => a.year - b.year);
  const start = startYear ? sorted.find(o => o.year >= startYear) : sorted[0];
  const end = endYear ? sorted.findLast(o => o.year <= endYear) : sorted[sorted.length - 1];

  if (!start || !end || start.year === end.year) return 0;

  const totalStart = start.ac + start.at + start.ga + start.mil + start.loc_ga + start.loc_mil;
  const totalEnd = end.ac + end.at + end.ga + end.mil + end.loc_ga + end.loc_mil;

  if (totalStart <= 0) return 0;
  const years = end.year - start.year;
  return Math.pow(totalEnd / totalStart, 1 / years) - 1;
}

export function getTotalOps(opsRow) {
  if (!opsRow) return 0;
  return (opsRow.ac || 0) + (opsRow.at || 0) + (opsRow.ga || 0) +
         (opsRow.mil || 0) + (opsRow.loc_ga || 0) + (opsRow.loc_mil || 0);
}
