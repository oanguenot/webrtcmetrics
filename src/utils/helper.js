import ShortUniqueId from "short-unique-id";

const shortUUID = new ShortUniqueId();

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
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });

  const avg = arr.reduce((p, c) => p + c, 0) / arr.length;

  if (avg === 0) {
    return 0;
  }

  const diff = arr.map((data) => (Math.abs(avg - data)));
  const totalDiff = diff.reduce((p, c) => p + c, 0);
  const volatility = ((totalDiff / arr.length) * 100) / avg;
  return volatility;
};

export const averageValuesOfReports = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });
  return arr.reduce((p, c) => p + c, 0) / arr.length;
};

export const sumValuesOfReports = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });
  return arr.reduce((p, c) => p + c, 0);
};

export const minValueOfReport = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });

  const arrWithoutZero = arr.filter((item) => item > 0);

  if (arrWithoutZero.length === 0) {
    return 0;
  }
  return Math.min(...arrWithoutZero);
};

export const maxValueOfReport = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });

  return Math.max(...arr);
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
