import { SG_POSTAL_REGEX } from './validation.ts';

export interface OneMapAddressResult {
  postalCode: string;
  buildingName: string;
  streetAddress: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  source: 'onemap' | 'singapore-district-fallback';
}

// Reference Singapore postal sector coordinates if OneMap public endpoint is unreachable
const SG_SECTOR_FALLBACK: Record<
  string,
  { neighborhood: string; street: string; building: string; lat: number; lng: number }
> = {
  '01': { neighborhood: 'Raffles Place / Marina Bay', street: 'Marina Boulevard', building: 'Marina Bay Residences', lat: 1.2797, lng: 103.854 },
  '08': { neighborhood: 'Tanjong Pagar / Outram', street: 'Cantonment Road', building: 'Pinnacle@Duxton', lat: 1.2768, lng: 103.8414 },
  '09': { neighborhood: 'Telok Blangah / HarbourFront', street: 'Telok Blangah Rise', building: 'Telok Blangah Heights', lat: 1.2727, lng: 103.8213 },
  '10': { neighborhood: 'Bukit Merah / Redhill', street: 'Henderson Road', building: 'Henderson Spring', lat: 1.2874, lng: 103.8199 },
  '11': { neighborhood: 'Pasir Panjang / Kent Ridge', street: 'South Buona Vista Road', building: 'Kent Ridge Hill', lat: 1.2896, lng: 103.7817 },
  '12': { neighborhood: 'Clementi / West Coast', street: 'Clementi Avenue 3', building: 'Clementi Ridges', lat: 1.3149, lng: 103.7652 },
  '14': { neighborhood: 'Queenstown / Commonwealth', street: 'Dawson Road', building: 'SkyVille@Dawson', lat: 1.2956, lng: 103.8091 },
  '15': { neighborhood: 'Tiong Bahru / Alexandra', street: 'Tiong Bahru Road', building: 'Tiong Bahru View', lat: 1.2858, lng: 103.8278 },
  '16': { neighborhood: 'Tiong Bahru / Havelock', street: 'Tiong Bahru Road', building: 'Blk 55 Tiong Bahru', lat: 1.2848, lng: 103.8315 },
  '22': { neighborhood: 'Newton / Orchard', street: 'Orchard Road', building: 'Cairnhill Crest', lat: 1.3055, lng: 103.8371 },
  '23': { neighborhood: 'River Valley / Orchard', street: 'River Valley Road', building: 'Valley Park', lat: 1.2943, lng: 103.8321 },
  '24': { neighborhood: 'Tanglin / River Valley', street: 'Tanglin Road', building: 'Tanglin Regency', lat: 1.2981, lng: 103.8239 },
  '25': { neighborhood: 'Bukit Timah / Farrer Road', street: 'Farrer Road', building: 'Leedon Residence', lat: 1.3175, lng: 103.8037 },
  '26': { neighborhood: 'Bukit Timah / Sixth Ave', street: 'Sixth Avenue', building: 'Sixth Avenue Ville', lat: 1.3309, lng: 103.7966 },
  '27': { neighborhood: 'Holland Village / Buona Vista', street: 'Holland Drive', building: 'Holland Village Residences', lat: 1.3095, lng: 103.7937 },
  '28': { neighborhood: 'Bukit Timah / Botanic Gardens', street: 'Dunearn Road', building: 'Watten Estate', lat: 1.3266, lng: 103.8124 },
  '30': { neighborhood: 'Novena / Thomson', street: 'Thomson Road', building: 'Novena Suites', lat: 1.3204, lng: 103.8438 },
  '31': { neighborhood: 'Toa Payoh', street: 'Toa Payoh Central', building: 'Toa Payoh Crest', lat: 1.3326, lng: 103.8473 },
  '38': { neighborhood: 'Geylang / Aljunied', street: 'Sims Avenue', building: 'Sims Urban Oasis', lat: 1.3173, lng: 103.8806 },
  '42': { neighborhood: 'Katong / Joo Chiat', street: 'East Coast Road', building: 'Katong Regency', lat: 1.3054, lng: 103.9044 },
  '43': { neighborhood: 'Mountbatten / Tanjong Rhu', street: 'Meyer Road', building: 'Meyer Mansion', lat: 1.2988, lng: 103.8834 },
  '44': { neighborhood: 'Marine Parade / East Coast', street: 'Marine Parade Central', building: 'Marine Terrace', lat: 1.3025, lng: 103.9061 },
  '46': { neighborhood: 'Bedok / Upper East Coast', street: 'Bedok North Avenue 1', building: 'Bedok Residences', lat: 1.324, lng: 103.9301 },
  '52': { neighborhood: 'Tampines', street: 'Tampines Street 21', building: 'Tampines Palmspring', lat: 1.3532, lng: 103.9522 },
  '53': { neighborhood: 'Hougang / Serangoon', street: 'Hougang Avenue 10', building: 'Hougang Meadow', lat: 1.3712, lng: 103.8923 },
  '55': { neighborhood: 'Serangoon Gardens', street: 'Serangoon Avenue 2', building: 'Serangoon Central', lat: 1.3506, lng: 103.8721 },
  '57': { neighborhood: 'Bishan', street: 'Bishan Street 22', building: 'Natura Loft', lat: 1.3526, lng: 103.8482 },
  '60': { neighborhood: 'Jurong East', street: 'Jurong Gateway Road', building: 'J Gateway', lat: 1.3331, lng: 103.7422 },
  '68': { neighborhood: 'Choa Chu Kang / Bukit Panjang', street: 'Choa Chu Kang Loop', building: 'Northvale', lat: 1.3853, lng: 103.7443 },
  '73': { neighborhood: 'Woodlands', street: 'Woodlands Avenue 6', building: 'Woodlands Glen', lat: 1.4369, lng: 103.7864 },
  '76': { neighborhood: 'Yishun', street: 'Yishun Ring Road', building: 'Yishun Riverwalk', lat: 1.4294, lng: 103.835 },
  '82': { neighborhood: 'Punggol / Sengkang', street: 'Punggol Central', building: 'Waterway Terraces', lat: 1.4043, lng: 103.9021 },
};

function inferNeighborhoodFromAddress(address: string, postalCode: string): string {
  const sector = postalCode.slice(0, 2);
  if (SG_SECTOR_FALLBACK[sector]) {
    return SG_SECTOR_FALLBACK[sector].neighborhood;
  }
  const upper = address.toUpperCase();
  if (upper.includes('TIONG BAHRU')) return 'Tiong Bahru';
  if (upper.includes('HOLLAND')) return 'Holland Village';
  if (upper.includes('BUKIT TIMAH')) return 'Bukit Timah';
  if (upper.includes('EAST COAST') || upper.includes('KATONG') || upper.includes('JOO CHIAT'))
    return 'Katong & East Coast';
  if (upper.includes('TAMPINES')) return 'Tampines';
  if (upper.includes('BISHAN')) return 'Bishan';
  if (upper.includes('ORCHARD') || upper.includes('RIVER VALLEY')) return 'Orchard & River Valley';
  return `Singapore District ${sector}`;
}

export async function lookupSingaporePostalCode(
  rawPostalCode: string
): Promise<OneMapAddressResult> {
  const postalCode = rawPostalCode.trim();
  if (!SG_POSTAL_REGEX.test(postalCode)) {
    throw new Error('Invalid Singapore postal code. Must be exactly 6 digits.');
  }

  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
      postalCode
    )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as {
        found?: number;
        results?: Array<{
          BUILDING?: string;
          BLK_NO?: string;
          ROAD_NAME?: string;
          ADDRESS?: string;
          LATITUDE?: string;
          LONGITUDE?: string;
          POSTAL?: string;
        }>;
      };

      const match = data.results?.[0];
      if (match && match.LATITUDE && match.LONGITUDE) {
        const buildingRaw = match.BUILDING && match.BUILDING !== 'NIL' ? match.BUILDING : '';
        const streetRaw = [match.BLK_NO, match.ROAD_NAME]
          .filter((part) => part && part !== 'NIL')
          .join(' ')
          .trim();

        const buildingName =
          buildingRaw || (streetRaw ? `Block ${streetRaw}` : `Postal ${postalCode}`);
        const streetAddress = streetRaw || match.ADDRESS || `Singapore ${postalCode}`;

        return {
          postalCode,
          buildingName: toTitleCase(buildingName),
          streetAddress: toTitleCase(streetAddress),
          neighborhood: inferNeighborhoodFromAddress(
            `${buildingName} ${streetAddress}`,
            postalCode
          ),
          latitude: Number.parseFloat(match.LATITUDE),
          longitude: Number.parseFloat(match.LONGITUDE),
          source: 'onemap',
        };
      }
    }
  } catch (err) {
    console.warn('OneMap API lookup fallback triggered:', (err as Error).message);
  }

  // Fallback by Singapore postal sector (first 2 digits)
  const sector = postalCode.slice(0, 2);
  const fallback = SG_SECTOR_FALLBACK[sector] || {
    neighborhood: `Singapore Sector ${sector}`,
    street: `Sector ${sector} Avenue`,
    building: `Residence at ${postalCode}`,
    lat: 1.3521,
    lng: 103.8198,
  };

  return {
    postalCode,
    buildingName: fallback.building,
    streetAddress: `${fallback.street}, Singapore ${postalCode}`,
    neighborhood: fallback.neighborhood,
    latitude: fallback.lat,
    longitude: fallback.lng,
    source: 'singapore-district-fallback',
  };
}

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function toRadians(deg: number): number {
  return deg * (Math.PI / 180);
}

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
