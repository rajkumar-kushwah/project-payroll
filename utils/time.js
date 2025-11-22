// utils/time.js
import mongoose from "mongoose";


// Convert "HH:mm" string -> Date object of same day
export const hhmmToDate = (dateStr, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
};

// Minutes difference between 2 dates
export const minutesBetween = (start, end) => {
  return Math.max(0, Math.floor((end - start) / 60000));
};

// Convert minutes → decimal hours (e.g. 510 → 8.5)
export const minutesToHoursDecimal = (mins) => {
  return +(mins / 60).toFixed(2);
};
