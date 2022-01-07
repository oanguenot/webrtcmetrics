import { debug, trace } from "./utils/log";

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

const last = (reports, key, subKey) => {
  const lastReport = reports.slice().pop();
  if (!lastReport) {
    return null;
  }
  if (!subKey) {
    return lastReport[key];
  }
  return lastReport[key][subKey];
};

export default class Exporter {
  constructor(cfg) {
    this._start = null;
    this._end = null;
    this._cfg = cfg;
    this._referenceReport = null;
    this._reports = [];
  }

  start() {
    trace(moduleName, "start() - start exporter...");
    this._start = new Date().toJSON();
  }

  stop() {
    trace(moduleName, "stop() - stop exporter...");
    this._end = new Date().toJSON();
    return this.ticket;
  }

  saveReferenceReport(report) {
    this._referenceReport = report;
  }

  getReferenceReport() {
    return this._referenceReport;
  }

  addReport(report) {
    if (this._cfg.ticket) {
      debug(moduleName, `addReport() - add report to exporter at ${report.timestamp}`);
      this._reports.push(report);
    }
  }

  reset() {
    trace(moduleName, "resetReports() - reset reports");
    this._reports = [];
    this._referenceReport = null;
    this._start = null;
    this._end = null;
  }

  get ticket() {
    debug(moduleName, "ticket() - generate ticket");
    return {
      version: VERSION_EXPORTER,
      ua: {
        agent: navigator.userAgent,
        pname: this._cfg.pname,
        user_id: this._cfg.uid,
      },
      call: {
        call_id: this._cfg.cid,
        start_time: this._start,
        end_time: this._end,
      },
      details: {
        count: this._reports.length,
        reports: this._cfg.record ? this._reports : [],
        reference: this._referenceReport || null,
      },
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
      mos_emodel: {
        min: min(this._reports, "audio", "mos_emodel"),
        avg: average(this._reports, "audio", "mos_emodel"),
        max: max(this._reports, "audio", "mos_emodel"),
      },
      mos: {
        min: min(this._reports, "audio", "mos"),
        avg: average(this._reports, "audio", "mos"),
        max: max(this._reports, "audio", "mos"),
      },
      packetsLost: {
        audio: {
          percent: Math.round((((last(this._reports, "audio", "total_packets_lost") / last(this._reports, "audio", "total_packets_received")) * 100) || 0) * 100) / 100,
        },
        video: {
          percent: Math.round((((last(this._reports, "video", "total_packets_lost") / last(this._reports, "video", "total_packets_received")) * 100) || 0) * 100) / 100,
        },
      },
      bitrate: {
        in: {
          min: min(this._reports, "data", "delta_kbs_received"),
          avg: average(this._reports, "data", "delta_kbs_received"),
          max: max(this._reports, "data", "delta_kbs_received"),
        },
        out: {
          min: min(this._reports, "data", "delta_kbs_sent"),
          avg: average(this._reports, "data", "delta_kbs_sent"),
          max: max(this._reports, "data", "delta_kbs_sent"),
        },
      },
      traffic: {
        in: {
          min: min(this._reports, "data", "delta_KBytes_received"),
          avg: average(this._reports, "data", "delta_KBytes_received"),
          max: max(this._reports, "data", "delta_KBytes_received"),
        },
        out: {
          min: min(this._reports, "data", "delta_KBytes_sent"),
          avg: average(this._reports, "data", "delta_KBytes_sent"),
          max: max(this._reports, "data", "delta_KBytes_sent"),
        },
      },
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
