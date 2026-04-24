/**
 * API Client — Live fetch wrappers for FAA ArcGIS + NRCS SDA
 * Includes localStorage caching fallback (Fix 7)
 */

const FAA_AIRPORT_URL = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0/query';
const FAA_RUNWAY_URL = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Runways/FeatureServer/0/query';
const NRCS_SDA_URL = 'https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest';

function parseDMS(dms) {
  if (!dms || typeof dms !== 'string') return 0;
  const match = dms.match(/(\d+)-(\d+)-(\d+\.?\d*)([NSEW])/);
  if (!match) return parseFloat(dms) || 0;
  let dec = parseInt(match[1]) + parseInt(match[2]) / 60 + parseFloat(match[3]) / 3600;
  if (match[4] === 'S' || match[4] === 'W') dec = -dec;
  return dec;
}

function cacheGet(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const { data, timestamp } = JSON.parse(item);
    return { data, timestamp: new Date(timestamp) };
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: new Date().toISOString() }));
  } catch {}
}

export async function fetchAirport(icao) {
  const cacheKey = `faa_airport_${icao}`;
  try {
    const url = `${FAA_AIRPORT_URL}?where=ICAO_ID='${icao}'&outFields=*&f=json`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!json.features || json.features.length === 0) throw new Error('Airport not found');
    const a = json.features[0].attributes;
    const result = {
      icao, name: a.NAME, lat: parseDMS(a.LATITUDE), lon: parseDMS(a.LONGITUDE),
      elevation: a.ELEVATION, state: a.STATE, city: a.SERVCITY, globalId: a.GLOBAL_ID,
      live: true, fetchedAt: new Date().toISOString(),
    };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    const cached = cacheGet(cacheKey);
    if (cached) return { ...cached.data, live: false, cachedAt: cached.timestamp };
    throw err;
  }
}

export async function fetchRunways(globalId) {
  const cacheKey = `faa_runways_${globalId}`;
  try {
    const url = `${FAA_RUNWAY_URL}?where=AIRPORT_ID='${globalId}'&outFields=*&f=json`;
    const resp = await fetch(url);
    const json = await resp.json();
    const runways = (json.features || []).map(f => ({
      designator: f.attributes.DESIGNATOR,
      length: f.attributes.LENGTH,
      width: f.attributes.WIDTH,
      surface: f.attributes.COMP_CODE,
    }));
    cacheSet(cacheKey, runways);
    return { runways, live: true };
  } catch (err) {
    const cached = cacheGet(cacheKey);
    if (cached) return { runways: cached.data, live: false };
    return { runways: [], live: false, error: err.message };
  }
}

export async function fetchSoilProfile(lat, lon) {
  const cacheKey = `nrcs_soil_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const sql = `SELECT co.compname, co.comppct_r, ch.hzname,
    ch.hzdept_r AS TopCm, ch.hzdepb_r AS BotCm,
    ctg.texture, ch.sandtotal_r AS Sand,
    ch.silttotal_r AS Silt, ch.claytotal_r AS Clay,
    ch.ll_r AS LL, ch.pi_r AS PI,
    ch.sieveno200_r AS Pass200, ch.ksat_r AS Ksat,
    ch.dbthirdbar_r AS BulkD
    FROM component co
    INNER JOIN chorizon ch ON co.cokey = ch.cokey
    INNER JOIN chtexturegrp ctg ON ch.chkey = ctg.chkey AND ctg.rvindicator = 'Yes'
    WHERE co.cokey IN (
      SELECT co2.cokey FROM mapunit mu
      INNER JOIN component co2 ON mu.mukey = co2.mukey
      WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lon} ${lat})')
      ) AND co2.comppct_r >= 10
    ) ORDER BY co.comppct_r DESC, ch.hzdept_r ASC`;

  try {
    const resp = await fetch(NRCS_SDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, format: 'JSON' }),
    });
    const json = await resp.json();
    if (!json.Table || json.Table.length === 0) throw new Error('No soil data at this location');

    const horizons = json.Table.map(row => ({
      component: row[0], pct: row[1], hz: row[2],
      topCm: row[3], botCm: row[4], texture: row[5],
      sand: row[6], silt: row[7], clay: row[8],
      ll: row[9], pi: row[10], pass200: row[11],
      ksat: row[12], bulkD: row[13],
    }));

    const result = { horizons, dominant: horizons[0]?.component, live: true,
      fetchedAt: new Date().toISOString() };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    const cached = cacheGet(cacheKey);
    if (cached) return { ...cached.data, live: false, cachedAt: cached.timestamp };
    throw err;
  }
}
