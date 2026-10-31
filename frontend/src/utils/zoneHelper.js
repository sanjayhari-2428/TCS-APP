/**
 * Helper to convert Household IDs (HH001, HH002, etc.) to intuitive Zone labels:
 * HH001 -> Zone A
 * HH002 -> Zone B
 * HH003 -> Zone C
 * ...
 * HH026 -> Zone Z
 * HH027 -> Zone AA
 * HH050 -> Zone AX
 */
export function getZoneLabel(id) {
  if (!id) return 'Zone A';
  const match = String(id).match(/\d+/);
  if (!match) return String(id);
  const num = parseInt(match[0], 10) - 1;
  if (num < 0) return 'Zone A';
  if (num < 26) {
    return `Zone ${String.fromCharCode(65 + num)}`;
  }
  const first = String.fromCharCode(65 + Math.floor(num / 26) - 1);
  const second = String.fromCharCode(65 + (num % 26));
  return `Zone ${first}${second}`;
}

/**
 * Helper to convert user search or input back to Household ID (e.g. "Zone A" -> "HH001", "Zone B" -> "HH002")
 */
export function parseZoneToHouseholdId(input) {
  if (!input) return '';
  const trimmed = input.trim().toUpperCase();
  if (trimmed.startsWith('HH')) return trimmed;
  
  const zoneMatch = trimmed.match(/^ZONE\s*([A-Z]{1,2})$/i);
  if (zoneMatch) {
    const letters = zoneMatch[1].toUpperCase();
    let index = 0;
    if (letters.length === 1) {
      index = letters.charCodeAt(0) - 65;
    } else if (letters.length === 2) {
      index = (letters.charCodeAt(0) - 65 + 1) * 26 + (letters.charCodeAt(1) - 65);
    }
    const num = index + 1;
    return `HH${String(num).padStart(3, '0')}`;
  }
  return trimmed;
}
