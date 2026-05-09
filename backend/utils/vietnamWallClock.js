/**
 * AVAILABLE_SLOTS lưu Date + StartTime/EndTime theo "giờ tường" Việt Nam.
 * Dùng Asia/Ho_Chi_Minh cho ngày/giờ hiện tại; chuyển mốc kết thúc slot sang UTC bằng offset cố định +7 (VN không DST).
 */

const VN_IANA = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * @returns {{ ymd: string, hms: string }} YYYY-MM-DD và HH:mm:ss theo giờ Việt Nam
 */
function getVietnamYmdHms(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_IANA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value || "00";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  const hms = `${get("hour")}:${get("minute")}:${get("second")}`;
  return { ymd, hms };
}

/**
 * Mốc kết thúc khung giờ (Date + EndTime) hiểu là giờ VN → Date tuyệt đối.
 */
function vnWallEndToUtcInstant(dateOnly, endTime) {
  if (dateOnly == null || endTime == null) return null;
  const ymd = String(dateOnly).slice(0, 10);
  const [y, mo, da] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !mo || !da) return null;
  const t = String(endTime).trim();
  const tparts = t.split(":");
  const hh = parseInt(tparts[0], 10);
  const mm = parseInt(tparts[1], 10);
  const ss = parseInt(tparts[2], 10);
  if (Number.isNaN(hh)) return null;
  const mmi = Number.isNaN(mm) ? 0 : mm;
  const ssi = Number.isNaN(ss) ? 0 : ss;
  return new Date(Date.UTC(y, mo - 1, da, hh, mmi, ssi) - VN_OFFSET_MS);
}

/** Slot đã hết (đã qua giờ kết thúc trong ngày tại VN). */
function isSlotPastEnd(slot) {
  if (!slot || slot.Date == null || slot.EndTime == null) return true;
  const end = vnWallEndToUtcInstant(slot.Date, slot.EndTime);
  if (!end || Number.isNaN(end.getTime())) return true;
  return end.getTime() <= Date.now();
}

module.exports = {
  getVietnamYmdHms,
  vnWallEndToUtcInstant,
  isSlotPastEnd,
};
