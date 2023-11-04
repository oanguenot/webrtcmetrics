import { DIRECTION } from "./models";
import { filteredAverage, getSSRCDataFromBunch } from "./helper";

const getAbsoluteDelay = (roundTripTime, jitterDelay) => ((roundTripTime / 2) + jitterDelay + 20); // Add extra 20ms for packetisation delay

const computeScore = (r, forceToMinimal) => {
  if (forceToMinimal) {
    return 1;
  }

  if (r < 0) {
    return 1;
  }

  if (r > 100) {
    return 4.5;
  }

  return 1 + 0.035 * r + (7.0 / 1000000) * r * (r - 60) * (100 - r);
};

const getSSRCReportFrom = (ssrc, report, previousReport, beforeLastReport, direction) => {
  const currentSSRCReport = getSSRCDataFromBunch(ssrc, report, direction);
  const previousSSRCReport = getSSRCDataFromBunch(ssrc, previousReport, direction);
  const beforeLastSSRCReport = getSSRCDataFromBunch(ssrc, beforeLastReport, direction);

  return {
    currentSSRCReport,
    previousSSRCReport,
    beforeLastSSRCReport,
  };
};

const computeJitter = (ssrcReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange) => {
  const jitterValues = [];
  const currentValue = direction === DIRECTION.INBOUND ? ssrcReport[kind].delta_jitter_ms_in : ssrcReport[kind].delta_jitter_ms_out;
  // Current value weighted to 4
  jitterValues.push(currentValue, currentValue, currentValue, currentValue);
  if (smoothedRange > 1) {
    const previousValue = direction === DIRECTION.INBOUND ? (previousSSRCReport && previousSSRCReport[kind].delta_jitter_ms_in) || null : (previousSSRCReport && previousSSRCReport[kind].delta_jitter_ms_out) || null;
    // Previous value weighted to 2
    jitterValues.push(previousValue, previousValue);
  }
  if (smoothedRange > 2) {
    // Before last value weighted to 1
    jitterValues.push(direction === DIRECTION.INBOUND ? (beforeLastSSRCReport && beforeLastSSRCReport[kind].delta_jitter_ms_in) || null : (beforeLastSSRCReport && beforeLastSSRCReport[kind].delta_jitter_ms_out) || null);
  }
  return filteredAverage(jitterValues, 10);
};

const computeRTT = (report, ssrcReport, previousReport, previousSSRCReport, beforeLastReport, beforeLastSSRCReport, kind, direction, smoothedRange) => {
  const rttValues = [];
  const currentValue = direction === DIRECTION.INBOUND ? ssrcReport[kind].delta_rtt_ms_in || report.data.delta_rtt_connectivity_ms : ssrcReport[kind].delta_rtt_ms_out || report.data.delta_rtt_connectivity_ms;
  // Current value weighted to 4
  rttValues.push(currentValue, currentValue, currentValue, currentValue);
  if (smoothedRange > 1) {
    const previousValue = direction === DIRECTION.INBOUND ? (previousSSRCReport && (previousSSRCReport[kind].delta_rtt_ms_in || previousReport.data.delta_rtt_connectivity_ms)) || null : (previousSSRCReport && (previousSSRCReport[kind].delta_rtt_ms_in || previousReport.data.delta_rtt_connectivity_ms)) || null;
    // Previous value weighted to 2
    rttValues.push(previousValue, previousValue);
  }
  if (smoothedRange > 2) {
    // Before last value weighted to 1
    rttValues.push(direction === DIRECTION.INBOUND ? (beforeLastSSRCReport && (beforeLastSSRCReport[kind].delta_rtt_ms_in || beforeLastReport.data.delta_rtt_connectivity_ms)) || null : (beforeLastSSRCReport && (beforeLastSSRCReport[kind].delta_jitter_ms_out || beforeLastReport.data.delta_rtt_connectivity_ms)) || null);
  }
  return filteredAverage(rttValues, 100);
};

const computePacketsLossPercent = (ssrcReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange) => {
  const packetLossValues = [];
  const currentValue = direction === DIRECTION.INBOUND ? ssrcReport[kind].percent_packets_lost_in : ssrcReport[kind].percent_packets_lost_out;
  // Current value weighted to 4
  packetLossValues.push(currentValue, currentValue, currentValue, currentValue);
  if (smoothedRange > 1) {
    const previousValue = direction === DIRECTION.INBOUND ? (previousSSRCReport && previousSSRCReport[kind].percent_packets_lost_in) || null : (previousSSRCReport && previousSSRCReport[kind].percent_packets_lost_out) || null;
    // Previous value weighted to 2
    packetLossValues.push(previousValue, previousValue);
  }
  if (smoothedRange > 2) {
    // Before last value weighted to 1
    packetLossValues.push(direction === DIRECTION.INBOUND ? (beforeLastSSRCReport && beforeLastSSRCReport[kind].percent_packets_lost_in) || null : (beforeLastSSRCReport && beforeLastSSRCReport[kind].percent_packets_lost_out) || null);
  }
  return filteredAverage(packetLossValues, 0);
};

const computeFullEModelScore = (
  report,
  kind,
  previousReport,
  beforeLastReport,
  ssrc,
  direction = DIRECTION.INBOUND,
  smoothedRange = 3,
) => {
  const RoFB = 148; // RoFB is the signal-to-noise ratio
  const IsFB = 0; // IsFB is the simultaneous impairment factor
  let Idd = 0; // Idd id the delay impairment factor
  const A = 0; // A is the advantage factor

  const {
    currentSSRCReport,
    previousSSRCReport,
    beforeLastSSRCReport,
  } = getSSRCReportFrom(ssrc, report, previousReport, beforeLastReport, direction);
  const packetsLoss = computePacketsLossPercent(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const rtt = computeRTT(report, currentSSRCReport, previousReport, previousSSRCReport, beforeLastReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const jitter = computeJitter(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);

  const Ta = getAbsoluteDelay(rtt, jitter); // Overall one way delay (ms)
  const defaultEquipmentImpairmentFactor = 132;
  const defaultIe = 10.2; // 10.2 G.113 Amend 3
  const defaultBpl = 9.6; // G.113 Amend 3
  const Iee = defaultIe + ((defaultEquipmentImpairmentFactor - defaultIe) * (packetsLoss / (packetsLoss + defaultBpl)));

  if (Ta > 100) {
    const x = (Math.log(Ta) - Math.log(100)) / (Math.log(2));
    const a = x ** 6;
    const b = (1 + a) ** (1 / 6);
    const c = (x / 3) ** 6;
    const d = (1 + c) ** (1 / 6);
    Idd = 1.48 * 25 * (b - (3 * d) + 2);
  }

  const Rx = RoFB - IsFB - Idd - Iee + A;
  const R = Rx / 1.48;
  return computeScore(R);
};

const computeEModelMOS = (
  report,
  kind,
  previousReport,
  beforeLastReport,
  ssrc,
  direction = DIRECTION.INBOUND,
  smoothedRange = 3,
) => {
  const {
    currentSSRCReport,
    previousSSRCReport,
    beforeLastSSRCReport,
  } = getSSRCReportFrom(ssrc, report, previousReport, beforeLastReport, direction);
  const packetsLoss = computePacketsLossPercent(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const rtt = computeRTT(report, currentSSRCReport, previousReport, previousSSRCReport, beforeLastReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const jitter = computeJitter(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);

  const rx = Math.max(0, 93.2 - packetsLoss);
  const ry = 0.18 * rx * rx - 27.9 * rx + 1126.62;

  const d = getAbsoluteDelay(rtt, jitter);
  const h = d - 177.3 < 0 ? 0 : 1;

  const id = 0.024 * d + 0.11 * (d - 177.3) * h;

  const r = ry - id;

  return computeScore(r, packetsLoss > 30);
};

export const computeNarrowEModelScore = (
  report,
  kind,
  previousReport,
  beforeLastReport,
  ssrc,
  direction = DIRECTION.INBOUND,
  smoothedRange = 3,
) => {
  const RoFB = 93.2; // RoFB is the signal-to-noise ratio
  const IsFB = 0; // IsFB is the simultaneous impairment factor
  let Idd = 0; // Idd id the delay impairment factor
  const A = 0; // A is the advantage factor

  const {
    currentSSRCReport,
    previousSSRCReport,
    beforeLastSSRCReport,
  } = getSSRCReportFrom(ssrc, report, previousReport, beforeLastReport, direction);
  const packetsLoss = computePacketsLossPercent(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const rtt = computeRTT(report, currentSSRCReport, previousReport, previousSSRCReport, beforeLastReport, beforeLastSSRCReport, kind, direction, smoothedRange);
  const jitter = computeJitter(currentSSRCReport, previousSSRCReport, beforeLastSSRCReport, kind, direction, smoothedRange);

  const Ta = getAbsoluteDelay(rtt, jitter); // Overall one way delay (ms)
  const defaultEquipmentImpairmentFactor = 95;
  const defaultIe = 0;
  const defaultBpl = 4.3;
  const Iee = defaultIe + ((defaultEquipmentImpairmentFactor - defaultIe) * (packetsLoss / (packetsLoss + defaultBpl)));

  if (Ta > 100) {
    const x = (Math.log(Ta) - Math.log(100)) / (Math.log(2));
    const a = x ** 6;
    const b = (1 + a) ** (1 / 6);
    const c = (x / 3) ** 6;
    const d = (1 + c) ** (1 / 6);
    Idd = 25 * (b - (3 * d) + 2);
  }

  const Rx = RoFB - IsFB - Idd - Iee + A;
  return computeScore(Rx);
};

export const mos = (report, kind, previousReport, beforeLastReport, ssrc, direction, smoothedRange = 3) => {
  const currentSSRCReport = getSSRCDataFromBunch(ssrc, report, direction);

  const codec = direction === DIRECTION.INBOUND ? currentSSRCReport[kind].codec_in?.mime_type || null : currentSSRCReport[kind].codec_out?.mime_type;

  // For Opus, compute G.107.2 MOS
  if (codec && codec.toLowerCase()
    .includes("opus")) {
    return computeFullEModelScore(report, kind, previousReport, beforeLastReport, ssrc, direction, smoothedRange);
  }

  // For other codecs, compute min of G.107 and G.107 simplified
  return Math.min(
    computeEModelMOS(report, kind, previousReport, beforeLastReport, ssrc, direction, smoothedRange),
    computeNarrowEModelScore(report, kind, previousReport, beforeLastReport, ssrc, direction, smoothedRange),
  );
};
