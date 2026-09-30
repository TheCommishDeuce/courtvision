/** Tennis / IOC country codes (as stored in players.country) → English names. */

// Codes where the IOC / tennis code is not the ISO alpha-2 code plus a letter.
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

let names: Intl.DisplayNames | null = null;
try {
  names = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  names = null;
}

/** "ITA" → "Italy"; unknown codes come back unchanged. */
export function countryName(ioc: string | null | undefined): string {
  if (!ioc) return '';
  const code = ioc.toUpperCase();
  const iso2 = IOC_TO_ISO2[code] ?? code.slice(0, 2);
  try {
    const name = names?.of(iso2);
    return name && name !== iso2 ? name : code;
  } catch {
    return code;
  }
}
