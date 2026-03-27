// Decode manufacture year from serial number based on brand

export function decodeSerialYear(brand, serial) {
  if (!brand || !serial || serial.length < 4) return null;

  const b = brand.toLowerCase();

  // Carrier / Bryant / Payne: Characters 1-4, format WWYY
  if (b.includes("carrier") || b.includes("bryant") || b.includes("payne")) {
    const yy = parseInt(serial.substring(2, 4));
    if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
  }

  // Trane / American Standard: First char = decade letter, second = year in decade
  if (b.includes("trane") || b.includes("american standard")) {
    const decades = { A: 1970, B: 1980, C: 1990, D: 2000, E: 2010, F: 2020, G: 2030 };
    const decade = decades[serial[0].toUpperCase()];
    const yearInDecade = parseInt(serial[1]);
    if (decade != null && !isNaN(yearInDecade)) return decade + yearInDecade;
  }

  // Lennox: First four digits are year
  if (b.includes("lennox")) {
    const year = parseInt(serial.substring(0, 4));
    if (!isNaN(year) && year > 1970 && year < 2040) return year;
  }

  // Goodman / Amana: First two digits are year
  if (b.includes("goodman") || b.includes("amana")) {
    const yy = parseInt(serial.substring(0, 2));
    if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
  }

  // Rheem / Ruud: Characters 7 and 8 are the year
  if (b.includes("rheem") || b.includes("ruud")) {
    if (serial.length >= 8) {
      const yy = parseInt(serial.substring(6, 8));
      if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
    }
  }

  // York / Heil / Tempstar / Arcoaire: First two digits are year
  if (b.includes("york") || b.includes("heil") || b.includes("tempstar") || b.includes("arcoaire")) {
    const yy = parseInt(serial.substring(0, 2));
    if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
  }

  // Daikin: Positions 3-6 encode YYMM
  if (b.includes("daikin")) {
    if (serial.length >= 6) {
      const yy = parseInt(serial.substring(2, 4));
      if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
    }
  }

  // Mitsubishi: First four chars YYWW
  if (b.includes("mitsubishi")) {
    const yy = parseInt(serial.substring(0, 2));
    if (!isNaN(yy)) return yy > 50 ? 1900 + yy : 2000 + yy;
  }

  return null;
}