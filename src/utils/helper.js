import ShortUniqueId from "short-unique-id";

const shortUUID = new ShortUniqueId();

const getValues = (reports, key, subKey, avoidZeroValue = false) => {
  let arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });

  // Avoid null value
  arr = arr.filter((item) => {
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

export const average = (nums) => (nums.reduce((a, b) => a + b, 0) / nums.length);

export const createProbeId = () => (`probe-${shortUUID()}`);

export const createCollectorId = () => (`coltr-${shortUUID()}`);

export const timeout = (ms) => (new Promise((resolve) => setTimeout(resolve, ms)));

export const call = (fct, context, value) => {
  if (!context) {
    fct(value);
  } else {
    fct.call(context, value);
  }
};

export const volatilityValuesOfReports = (reports, key, subKey) => {
  const values = getValues(reports, key, subKey, true);
  if(values.length === 0) {
    return 0;
  }
  const avg = values.reduce((p, c) => p + c, 0) / values.length;
  if (avg === 0) {
    return 0;
  }

  const diff = values.map((data) => (Math.abs(avg - data)));
  const totalDiff = diff.reduce((p, c) => p + c, 0);
  const volatility = ((totalDiff / values.length) * 100) / avg;
  return volatility;
};

export const averageValuesOfReports = (reports, key, subKey, avoidZeroValue = false) => {
  const values = getValues(reports, key, subKey, avoidZeroValue);
  return values.reduce((p, c) => p + c, 0) / values.length;
};

export const sumValuesOfReports = (reports, key, subKey) => {
  const values = getValues(reports, key, subKey);
  return values.reduce((p, c) => p + c, 0);
};

export const minValueOfReports = (reports, key, subKey) => {
  const values = getValues(reports, key, subKey, true);
  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
};

export const maxValueOfReports = (reports, key, subKey) => {
  const values = getValues(reports, key, subKey);
  return Math.max(...values);
};

export const lastOfReports = (reports, key, subKey) => {
  const lastReport = reports.slice().pop();
  if (!lastReport) {
    return null;
  }
  if (!subKey) {
    return lastReport[key];
  }
  return lastReport[key][subKey];
};
