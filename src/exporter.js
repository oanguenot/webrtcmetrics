import { info, debug } from "./utils/log";

const moduleName = "exporter    ";

const VERSION_EXPORTER = "1.0";

const average = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });
  return arr.reduce((p, c) => p + c, 0) / arr.length;
};

const averageRTT = (reports, kind) => {
  if (!reports || reports.length === 0) {
    return 0;
  }

  const lastReport = reports[reports.length - 1];
  if (!lastReport) {
    return 0;
  }
  const totalRTT = lastReport[kind].total_rtt_ms;
  const totalMeasurements = lastReport[kind].total_rtt_measure;

  if (!totalMeasurements || !totalRTT) {
    return (average(reports, kind, "delta_rtt_ms"));
  }

  return Number(totalRTT / totalMeasurements);
};

const min = (reports, key, subKey) => {
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

const max = (reports, key, subKey) => {
  const arr = reports.map((report) => {
    if (!subKey) {
      return report[key];
    }
    return report[key][subKey];
  });

  return Math.max(...arr);
};

export default class Exporter {
  constructor(cfg) {
    this._start = null;
    this._end = null;
    this._cfg = cfg;
    this._reports = [];
  }

  start() {
    info(moduleName, "start() - start exporter...");
    this._start = new Date().toJSON();
  }

  stop() {
    info(moduleName, "stop() - stop exporter...");
    this._end = new Date().toJSON();
    return this.ticket;
  }

  addReport(report) {
    debug(moduleName, `addReport() - add report to exporter at ${report.timestamp}`);
    this._reports.push(report);
  }

  reset() {
    info(moduleName, "resetReports() - reset reports");
    this._reports = [];
    this._start = null;
    this._end = null;
  }

  get ticket() {
    info(moduleName, "ticket() - generate ticket");
    return {
      ua: navigator.userAgent,
      pname: this._cfg.pname,
      call_id: this._cfg.cid,
      user_id: this._cfg.uid,
      start_time: this._start,
      end_time: this._end,
      version: VERSION_EXPORTER,
      count: this._reports.length,
      jitter: {
        audio: {
          min: min(this._reports, "audio", "delta_jitter_ms"),
          avg: average(this._reports, "audio", "delta_jitter_ms"),
          max: max(this._reports, "audio", "delta_jitter_ms"),
        },
        video: {
          min: min(this._reports, "video", "delta_jitter_ms"),
          avg: average(this._reports, "video", "delta_jitter_ms"),
          max: max(this._reports, "video", "delta_jitter_ms"),
        },
      },
      rtt: {
        audio: {
          min: min(this._reports, "audio", "delta_rtt_ms"),
          avg: averageRTT(this._reports, "audio"),
          max: max(this._reports, "audio", "delta_rtt_ms"),
        },
        video: {
          min: min(this._reports, "video", "delta_rtt_ms"),
          avg: averageRTT(this._reports, "video"),
          max: max(this._reports, "video", "delta_rtt_ms"),
        },
      },
      mos: average(this._reports, "audio", "mos"),
      mos_emodel: average(this._reports, "audio", "mos_emodel"),
      reports: this._cfg.record ? this._reports : [],
    };
  }

  updateConfig(config) {
    this._cfg = config;
  }

  getLastReport() {
    return this._reports.slice().pop() || null;
  }

  getBeforeLastReport() {
    const duplicated = this._reports.slice();
    duplicated.pop();
    return duplicated.pop() || null;
  }

  getReportsNumber() {
    return this._reports.length;
  }
}
