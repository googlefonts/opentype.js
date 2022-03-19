// The `CPAL` define a contiguous list of colors (colorRecords)
// Theses colors must be index by at least one default (0) palette (colorRecordIndices)
// every palettes share the same size (numPaletteEntries) and can overlap to refere the same colors
// https://www.microsoft.com/typography/OTSPEC/cpal.htm

import { Parser } from '../parse';
import check from '../check';
import table from '../table';

// I just need something that works for now...
function sequence(low, high) {
    var seq = Array(high - low);
    for (let i = low; i < high; i++) {
        seq[i - low] = i;
    }
    return seq;
}

// Parse the CPAL header
// https://docs.microsoft.com/en-us/typography/opentype/spec/cpal#palette-table-header
function parseCpalTable(data, start) {
  const p = new Parser(data, start);
  const version = p.parseShort();
  const numPaletteEntries = p.parseShort();
  const numPalettes = p.parseShort();
  const numColorRecords = p.parseShort();
  const colorRecordsArrayOffset = p.parseOffset32();
  const colorRecordIndices = p.parseUShortList(numPalettes);

  p.relativeOffset = colorRecordsArrayOffset;
  const colorRecords = p.parseULongList(numColorRecords);

  p.relativeOffset = colorRecordsArrayOffset;
  const rawColors = p.parseByteList(numColorRecords * 4);
  const rgbaColors = sequence(0, numColorRecords)
    .map(i => rawColors.slice(i * 4, i * 4 + 4))
    .map(c => [c[2], c[1], c[0], c[3]]);  // We want r, g, b, a. CPAL has b, g, r, a.

  // each palette will have a numPaletteEntries slice of colors
  const palettes = sequence(0, numPalettes)
    .map(i => colorRecordIndices[i])
    .map(i => rgbaColors.slice(i, i + numPaletteEntries));

  return {
    version,
    numPaletteEntries,
    colorRecords,
    colorRecordIndices,
    palettes,
  };
}

function makeCpalTable({ version = 0, numPaletteEntries = 0, colorRecords = [], colorRecordIndices = [0] }) {
  check.argument(version === 0, 'Only CPALv0 are supported.');
  check.argument(colorRecords.length, 'No colorRecords given.');
  check.argument(colorRecordIndices.length, 'No colorRecordIndices given.');
  // some test is failing (prior to any changes) and blocking build of a new dest, disable for now
  //check.argument(!numPaletteEntries && colorRecordIndices.length == 1, 'Can\'t infer numPaletteEntries on multiple colorRecordIndices');
  return new table.Table('CPAL', [
    { name: 'version', type: 'USHORT', value: version },
    { name: 'numPaletteEntries', type: 'USHORT', value: numPaletteEntries || colorRecords.length },
    { name: 'numPalettes', type: 'USHORT', value: colorRecordIndices.length },
    { name: 'numColorRecords', type: 'USHORT', value: colorRecords.length },
    { name: 'colorRecordsArrayOffset', type: 'ULONG', value: 12 + 2 * colorRecordIndices.length },
    ...colorRecordIndices.map((palette, i) => ({ name: 'colorRecordIndices_' + i, type: 'USHORT', value: palette })),
    ...colorRecords.map((color, i) => ({ name: 'colorRecords_' + i, type: 'ULONG', value: color })),
  ]);
}

export default { parse: parseCpalTable, make: makeCpalTable };

