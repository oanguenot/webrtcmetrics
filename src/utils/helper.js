import ShortUniqueId from "short-unique-id";
import {
  defaultAudioMetricIn,
  defaultAudioMetricOut,
  defaultVideoMetricIn,
  defaultVideoMetricOut,
  DIRECTION,
  VALUE,
} from "./models";

const shortUUID = new ShortUniqueId();

const getValues = (reports, key, subKey, avoidZeroValue = false, ssrc = "", withTimestamp = false) => {
  let arr = reports.map((report) => {
    if (!subKey) {
      if (withTimestamp) {
        return {
          timestamp: new Date(report.timestamp).toJSON(),
          value: report[key],
        };
      }
      return report[key];
    }
    if (!ssrc) {
      if (withTimestamp) {
        return {
          timestamp: new Date(report.timestamp).toJSON(),
          value: report[key][subKey],
        };
      }
      return report[key][subKey];
    }
    const data = report[key][ssrc];
    if (data) {
      if (withTimestamp) {
        return {
          timestamp: new Date(report.timestamp).toJSON(),
          value: data[subKey],
        };
      }
      return data[subKey];
    }
    return null;
  });

  // Avoid null value
  arr = arr.filter((item) => {
    if (withTimestamp) {
      if (avoidZeroValue) {
        return (item && Number.isFinite(item.value) && item.value > 0);
      }
      return item && Number.isFinite(item.value);
    }

    if (avoidZeroValue) {
      return (Number.isFinite(item) && item > 0);
    }
    return Number.isFinite(item);
  });
  if (arr.length === 0) {
    return [];
  }
  return arr;
};

export const filteredAverage = (nums, defaultValue) => {
  const filtered = nums.filter((num) => num !== null);
  if (filtered.length > 0) {
    return filtered.reduce((a, b) => a + b, 0) / nums.length;
  }
  return defaultValue;
};

export const average = (nums) => (nums.reduce((a, b) => a + b, 0) / nums.length);

export const createProbeId = () => (`probe-${shortUUID.rnd(10)}`);

export const createCollectorId = () => (`coltr-${shortUUID.rnd(10)}`);

export const timeout = (ms) => (new Promise((resolve) => setTimeout(resolve, ms)));

export const call = (fct, context, value) => {
  if (!context) {
    fct(value);
  } else {
    fct.call(context, value);
  }
};

export const volatilityValuesOfReports = (reports, key, subKey, ssrc, avoidZeroValue = true) => {
  const values = getValues(reports, key, subKey, avoidZeroValue, ssrc);
  if (values.length === 0) {
    return null;
  }
  const avg = values.reduce((p, c) => p + c, 0) / values.length;
  if (avg === 0 && avoidZeroValue) {
    return null;
  } if (avg === 0) {
    return 0;
  }

  const diff = values.map((data) => (Math.abs(avg - data)));
  const totalDiff = diff.reduce((p, c) => p + c, 0);
  const volatility = ((totalDiff / values.length) * 100) / avg;
  return volatility;
};

export const averageValuesOfReports = (reports, key, subKey, avoidZeroValue = false, ssrc = "") => {
  const values = getValues(reports, key, subKey, avoidZeroValue, ssrc);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((p, c) => p + c, 0) / values.length;
};

export const sumValuesOfReports = (reports, key, subKey) => {
  const values = getValues(reports, key, subKey);
  return values.reduce((p, c) => p + c, 0);
};

export const minValueOfReports = (reports, key, subKey, ssrc, avoidZeroValue = true) => {
  const values = getValues(reports, key, subKey, avoidZeroValue, ssrc);
  if (values.length === 0) {
    return null;
  }
  return Math.min(...values);
};

export const maxValueOfReports = (reports, key, subKey, ssrc, avoidZeroValue = true) => {
  const values = getValues(reports, key, subKey, avoidZeroValue, ssrc);
  if (values.length === 0) {
    return null;
  }
  return Math.max(...values);
};

export const valuesOfReports = (reports, key, subKey, ssrc) => (getValues(reports, key, subKey, false, ssrc, true));

export const lastOfReports = (reports, key, subKey, ssrc) => {
  const lastReport = reports.slice()
    .pop();
  if (!lastReport) {
    return null;
  }
  if (!subKey) {
    return lastReport[key];
  }
  if (!ssrc) {
    return lastReport[key][subKey];
  }
  const ssrcData = lastReport[key][ssrc];

  if (ssrcData) {
    return ssrcData[subKey];
  }
  return null;
};

export const getLastReport = (reports) => (reports.slice()
  .pop());

export const getSSRCDataFromBunch = (ssrc, bunch, direction) => {
  if (!bunch) {
    return null;
  }
  const ssrcBunch = {};
  let audioBunch = bunch[VALUE.AUDIO][ssrc];
  if (!audioBunch) {
    audioBunch = direction === DIRECTION.INBOUND ? { ...defaultAudioMetricIn } : { ...defaultAudioMetricOut };
  }
  ssrcBunch[VALUE.AUDIO] = audioBunch;

  let videoBunch = bunch[VALUE.VIDEO][ssrc];
  if (!videoBunch) {
    videoBunch = direction === DIRECTION.INBOUND ? { ...defaultVideoMetricIn } : { ...defaultVideoMetricOut };
  }
  ssrcBunch[VALUE.VIDEO] = videoBunch;
  return ssrcBunch;
};

export const findTrackInPeerConnectionById = (trackId, pc) => {
  // Get track from PC senders
  const senderOfTrack = pc.getSenders()
    .find((sender) => sender.track && sender.track.id === trackId);

  if (senderOfTrack) {
    return senderOfTrack.track;
  }

  // Get track from PC receivers
  const receiverOfTrack = pc.getReceivers()
    .find((receiver) => receiver.track && receiver.track.id === trackId);

  if (receiverOfTrack) {
    return receiverOfTrack.track;
  }
  return null;
};

export const findOutgoingTrackFromPeerConnectionByKind = (kind, pc) => {
  const senderOfTrack = pc.getSenders()
    .find((sender) => sender.track && sender.track.kind === kind);
  if (senderOfTrack) {
    return senderOfTrack.track;
  }
  return null;
};

export const fixed2 = (value) => Math.round(100 * value) / 100;
