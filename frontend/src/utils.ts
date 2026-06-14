/** Shared formatting helpers and UI constants */

export function fmtTime(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Convert an IOC / Tennis-style country code to a flag emoji + code string.
 * e.g. "USA" → "🇺🇸 USA", "GER" → "🇩🇪 GER", "SUI" → "🇨🇭 SUI"
 */
const IOC_TO_ISO2: Record<string, string> = {
  // Codes where IOC/tennis code differs from ISO 3166-1 alpha-2
  AHO: 'CW', ALG: 'DZ', ANG: 'AO', ANT: 'AG', ARU: 'AW',
  BAH: 'BS', BAN: 'BD', BAR: 'BB', BDI: 'BI', BER: 'BM',
  BOT: 'BW', BRN: 'BH', BRU: 'BN', BUL: 'BG', BUR: 'BF',
  CAF: 'CF', CAM: 'KH', CAY: 'KY', CHI: 'CL', CHL: 'CL',
  CHN: 'CN', CIV: 'CI', CMR: 'CM', COD: 'CD', CRC: 'CR',
  CRO: 'HR', CUB: 'CU', CUW: 'CW', DEN: 'DK', DEU: 'DE',
  DOM: 'DO', ECA: 'EC', ESA: 'SV', FIJ: 'FJ', FRG: 'DE',
  GAB: 'GA', GBR: 'GB', GER: 'DE', GHA: 'GH', GRC: 'GR',
  GRE: 'GR', GRN: 'GD', GUA: 'GT', GUD: 'GP', HAI: 'HT',
  HON: 'HN', INA: 'ID', IRI: 'IR', ISV: 'VI', KGZ: 'KG',
  KOR: 'KR', KSA: 'SA', KUW: 'KW', LAT: 'LV', LBA: 'LY',
  LBN: 'LB', LIB: 'LR', LIE: 'LI', LVA: 'LV', MAD: 'MG',
  MAR: 'MA', MAS: 'MY', MDA: 'MD', MKD: 'MK', MLI: 'ML',
  MLT: 'MT', MON: 'MC', MOZ: 'MZ', MRI: 'MU', NAM: 'NA',
  NCL: 'NC', NED: 'NL', NGR: 'NG', NIC: 'NI', NLD: 'NL',
  NMI: 'MP', OMA: 'OM', PAR: 'PY', PHI: 'PH', PNG: 'PG',
  POC: 'PF', POR: 'PT', PRY: 'PY', PUR: 'PR', RHO: 'ZW',
  RSA: 'ZA', ROU: 'RO', SAM: 'WS', SCG: 'RS', SEN: 'SN',
  SGP: 'SG', SIN: 'SG', SLE: 'SL', SLO: 'SI', SMR: 'SM',
  SOL: 'SB', SRI: 'LK', SUD: 'SD', SUI: 'CH', SVK: 'SK',
  TAN: 'TZ', TCH: 'CZ', THA: 'TH', TJK: 'TJ', TKM: 'TM',
  TOG: 'TG', TPE: 'TW', TRI: 'TT', TTO: 'TT', TUR: 'TR',
  TWN: 'TW', UAE: 'AE', UGA: 'UG', UNK: 'XK', URS: 'RU',
  URU: 'UY', VEN: 'VE', VIE: 'VN', YUG: 'RS', ZAM: 'ZM',
  // 3-letter ISO codes that match their first two letters already work,
  // but a few need explicit mapping
  ECU: 'EC', EGY: 'EG', ESP: 'ES', EST: 'EE', GEO: 'GE',
  HKG: 'HK', IRL: 'IE', ISL: 'IS', ISR: 'IL', JOR: 'JO',
  JPN: 'JP', KAZ: 'KZ', KEN: 'KE', MNE: 'ME', NOR: 'NO',
  NPL: 'NP', NZL: 'NZ', PAK: 'PK', PAN: 'PA', PER: 'PE',
  POL: 'PL', QAT: 'QA', REU: 'RE', RUS: 'RU', RWA: 'RW', SRB: 'RS',
  SWE: 'SE', SYR: 'SY', TUN: 'TN', UKR: 'UA', UZB: 'UZ',
  ZIM: 'ZW',
  AGO: 'AO', AND: 'AD', ARM: 'AM', AUT: 'AT',
  BIH: 'BA', BLR: 'BY',
  JAM: 'JM', MEX: 'MX',
};

function iocToFlag(ioc: string): string {
  const iso2 = IOC_TO_ISO2[ioc] ?? ioc.slice(0, 2);
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E5 + c.charCodeAt(0) - 64))
    .join('');
}

export function countryDisplay(ioc: string | null | undefined): string {
  if (!ioc) return '';
  return `${iocToFlag(ioc)} ${ioc}`;
}

export const lastName = (name: string): string => name.split(' ').pop() ?? name;

/**
 * Tailwind classes for a surface tag. Callers that historically defaulted
 * unknown surfaces to the hard-court style pass 'ba-surface-hard' as fallback.
 */
export function surfaceClass(
  surface?: string,
  fallback = 'bg-[var(--bone-3)] text-[var(--ink-2)]',
): string {
  const s = (surface || '').toLowerCase();
  if (s.includes('clay')) return 'ba-surface-clay';
  if (s.includes('grass')) return 'ba-surface-grass';
  if (s.includes('hard')) return 'ba-surface-hard';
  return fallback;
}

export const SURFACE_COLOR: Record<string, string> = {
  Hard: 'bg-[#d8edf8] text-[#0a6fa4]',
  Clay: 'bg-[#f3dfd3] text-[#a9552b]',
  Grass: 'bg-[#dcead9] text-[#3e7340]',
  Carpet: 'bg-[var(--paper-3)] text-[var(--ink-2)]',
};
