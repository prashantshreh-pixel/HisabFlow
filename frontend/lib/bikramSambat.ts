// Bikram Sambat (B.S.) Nepali Calendar Utility

const MONTHS_EN = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन',
  'भदौ', 'असोज', 'कात्तिक', 'मंसिर',
  'पुस', 'माघ', 'फागुन', 'चैत'
];

const NUMERALS_NP: Record<string, string> = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

export function toNepaliNumerals(num: number | string): string {
  return String(num).replace(/[0-9]/g, (w) => NUMERALS_NP[w] || w);
}

/**
 * Converts AD Gregorian date to Bikram Sambat (BS) date
 */
export function adToBs(dateInput: Date | string, inNepaliScript = false): { year: number; month: number; day: number; formatted: string } {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { year: 2083, month: 1, day: 1, formatted: inNepaliScript ? '२०८३ बैशाख १' : '2083 Baishakh 1' };
  }

  // Base reference point: April 14, 2026 AD -> 2083 Baishakh 1 BS
  const refAd = new Date(2026, 3, 14);
  const diffTime = d.getTime() - refAd.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  let bsYear = 2083;
  let bsMonth = 0; // Baishakh = 0
  let bsDay = 1 + diffDays;

  const monthLengths = [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30];

  while (bsDay > monthLengths[bsMonth]) {
    bsDay -= monthLengths[bsMonth];
    bsMonth++;
    if (bsMonth >= 12) {
      bsMonth = 0;
      bsYear++;
    }
  }

  while (bsDay < 1) {
    bsMonth--;
    if (bsMonth < 0) {
      bsMonth = 11;
      bsYear--;
    }
    bsDay += monthLengths[bsMonth];
  }

  const monthName = inNepaliScript ? MONTHS_NP[bsMonth] : MONTHS_EN[bsMonth];
  const yearStr = inNepaliScript ? toNepaliNumerals(bsYear) : String(bsYear);
  const dayStr = inNepaliScript ? toNepaliNumerals(bsDay) : String(bsDay);

  return {
    year: bsYear,
    month: bsMonth + 1,
    day: bsDay,
    formatted: inNepaliScript ? `${yearStr} ${monthName} ${dayStr}` : `${yearStr} ${monthName} ${dayStr}`,
  };
}

export function formatSmartDate(dateInput: Date | string, useBs = true, isNepaliLang = false): string {
  if (!useBs) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString(isNepaliLang ? 'ne-NP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const bs = adToBs(dateInput, isNepaliLang);
  return bs.formatted;
}
