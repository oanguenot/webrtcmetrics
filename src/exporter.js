import { debug, trace } from "./utils/log";
import {
  averageValuesOfReports,
  minValueOfReports,
  maxValueOfReports, lastOfReports, volatilityValuesOfReports,
} from "./utils/helper";

const moduleName = "exporter    ";

const VERSION_EXPORTER = "1.0";

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
    return (averageValuesOfReports(reports, kind, "delta_rtt_ms"));
  }

  return Number(totalRTT / totalMeasurements);
};

const averageRTTConnectivity = (reports, kind) => {
  if (!reports || reports.length === 0) {
    return 0;
  }

  const lastReport = reports[reports.length - 1];
  if (!lastReport) {
    return 0;
  }
  const totalRTT = lastReport[kind].total_rtt_connectivity_ms;
  const totalMeasurements = lastReport[kind].total_rtt_connectivity_measure;

  if (!totalMeasurements || !totalRTT) {
    return (averageValuesOfReports(reports, kind, "delta_rtt_connectivity_ms"));
  }

  return Number(totalRTT / totalMeasurements);
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
    const date = new Date();
    this._start = date.toJSON();
    return date;
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

    const audioPacketsLost = lastOfReports(this._reports, "audio", "total_packets_lost_received");
    const audioPacketsReceived = lastOfReports(this._reports, "audio", "total_packets_received");
    const videoPacketsLost = lastOfReports(this._reports, "video", "total_packets_lost_received");
    const videoPacketsReceived = lastOfReports(this._reports, "video", "total_packets_received");

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
          avg: averageValuesOfReports(this._reports, "audio", "delta_jitter_ms"),
          min: minValueOfReports(this._reports, "audio", "delta_jitter_ms"),
          max: maxValueOfReports(this._reports, "audio", "delta_jitter_ms"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "delta_jitter_ms"),
        },
        video: {
          avg: averageValuesOfReports(this._reports, "video", "delta_jitter_ms"),
          min: minValueOfReports(this._reports, "video", "delta_jitter_ms"),
          max: maxValueOfReports(this._reports, "video", "delta_jitter_ms"),
          volatility: volatilityValuesOfReports(this._reports, "video", "delta_jitter_ms"),
        },
        unit: {
          avg: "ms",
          min: "ms",
          max: "ms",
          volatility: "percent",
        },
      },
      rtt: {
        audio: {
          avg: averageRTT(this._reports, "audio"),
          min: minValueOfReports(this._reports, "audio", "delta_rtt_ms"),
          max: maxValueOfReports(this._reports, "audio", "delta_rtt_ms"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "delta_rtt_ms"),
        },
        video: {
          avg: averageRTT(this._reports, "video"),
          min: minValueOfReports(this._reports, "video", "delta_rtt_ms"),
          max: maxValueOfReports(this._reports, "video", "delta_rtt_ms"),
          volatility: volatilityValuesOfReports(this._reports, "video", "delta_rtt_ms"),
        },
        connectivity: {
          avg: averageRTTConnectivity(this._reports, "data"),
          min: minValueOfReports(this._reports, "data", "delta_rtt_connectivity_ms"),
          max: maxValueOfReports(this._reports, "data", "delta_rtt_connectivity_ms"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_rtt_connectivity_ms"),
        },
        unit: {
          avg: "ms",
          min: "ms",
          max: "ms",
          volatility: "percent",
        },
      },
      mos: {
        emodel: {
          avg: averageValuesOfReports(this._reports, "audio", "mos_emodel"),
          min: minValueOfReports(this._reports, "audio", "mos_emodel"),
          max: maxValueOfReports(this._reports, "audio", "mos_emodel"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "mos_emodel"),
        },
        effective: {
          avg: averageValuesOfReports(this._reports, "audio", "mos"),
          min: minValueOfReports(this._reports, "audio", "mos"),
          max: maxValueOfReports(this._reports, "audio", "mos"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "mos"),
        },
        unit: {
          avg: "number (1-5)",
          min: "number (1-5)",
          max: "number (1-5)",
          volatility: "percent",
        },
      },
      packetsLost: {
        audio: {
          received: {
            avg: Math.round((((audioPacketsLost / (audioPacketsLost + audioPacketsReceived)) * 100) || 0) * 100) / 100,
          },
        },
        video: {
          received: {
            avg: Math.round((((videoPacketsLost / (videoPacketsLost + videoPacketsReceived)) * 100) || 0) * 100) / 100,
          },
        },
        unit: {
          avg: "percent",
        },
      },
      bitrate: {
        in: {
          avg: averageValuesOfReports(this._reports, "data", "delta_kbs_received"),
          min: minValueOfReports(this._reports, "data", "delta_kbs_received"),
          max: maxValueOfReports(this._reports, "data", "delta_kbs_received"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_kbs_received"),
        },
        out: {
          avg: averageValuesOfReports(this._reports, "data", "delta_kbs_sent"),
          min: minValueOfReports(this._reports, "data", "delta_kbs_sent"),
          max: maxValueOfReports(this._reports, "data", "delta_kbs_sent"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_kbs_sent"),
        },
        unit: {
          avg: "kbs",
          min: "kbs",
          max: "kbs",
          volatility: "percent",
        },
      },
      traffic: {
        in: {
          avg: averageValuesOfReports(this._reports, "data", "delta_KBytes_received"),
          min: minValueOfReports(this._reports, "data", "delta_KBytes_received"),
          max: maxValueOfReports(this._reports, "data", "delta_KBytes_received"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_KBytes_received"),
        },
        out: {
          avg: averageValuesOfReports(this._reports, "data", "delta_KBytes_sent"),
          min: minValueOfReports(this._reports, "data", "delta_KBytes_sent"),
          max: maxValueOfReports(this._reports, "data", "delta_KBytes_sent"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_KBytes_sent"),
        },
        unit: {
          avg: "KBytes",
          min: "KBytes",
          max: "KBytes",
          volatility: "percent",
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
