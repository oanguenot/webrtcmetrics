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
  const totalRTT = lastReport[kind].total_rtt_ms_out;
  const totalMeasurements = lastReport[kind].total_rtt_measure_out;

  if (!totalMeasurements || !totalRTT) {
    return (averageValuesOfReports(reports, kind, "delta_rtt_ms_out"));
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
  const totalRTT = lastReport[kind].total_rtt_connectivity_ms_out;
  const totalMeasurements = lastReport[kind].total_rtt_connectivity_measure_out;

  if (!totalMeasurements || !totalRTT) {
    return (averageValuesOfReports(reports, kind, "delta_rtt_connectivity_ms_out"));
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

    const audioPacketsLost = lastOfReports(this._reports, "audio", "total_packets_lost_in");
    const audioPacketsReceived = lastOfReports(this._reports, "audio", "total_packets_in");
    const videoPacketsLost = lastOfReports(this._reports, "video", "total_packets_lost_in");
    const videoPacketsReceived = lastOfReports(this._reports, "video", "total_packets_in");

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
          in: {
            avg: averageValuesOfReports(this._reports, "audio", "delta_jitter_ms_in"),
            min: minValueOfReports(this._reports, "audio", "delta_jitter_ms_in"),
            max: maxValueOfReports(this._reports, "audio", "delta_jitter_ms_in"),
            volatility: volatilityValuesOfReports(this._reports, "audio", "delta_jitter_ms_in"),
          },
          out: {
            avg: averageValuesOfReports(this._reports, "audio", "delta_jitter_ms_out"),
            min: minValueOfReports(this._reports, "audio", "delta_jitter_ms_out"),
            max: maxValueOfReports(this._reports, "audio", "delta_jitter_ms_out"),
            volatility: volatilityValuesOfReports(this._reports, "audio", "delta_jitter_ms_out"),
          },
        },
        video: {
          in: {
            avg: averageValuesOfReports(this._reports, "video", "delta_jitter_ms_in"),
            min: minValueOfReports(this._reports, "video", "delta_jitter_ms_in"),
            max: maxValueOfReports(this._reports, "video", "delta_jitter_ms_in"),
            volatility: volatilityValuesOfReports(this._reports, "video", "delta_jitter_ms_in"),
          },
          out: {
            avg: averageValuesOfReports(this._reports, "video", "delta_jitter_ms_out"),
            min: minValueOfReports(this._reports, "video", "delta_jitter_ms_out"),
            max: maxValueOfReports(this._reports, "video", "delta_jitter_ms_out"),
            volatility: volatilityValuesOfReports(this._reports, "video", "delta_jitter_ms_out"),
          },
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
          min: minValueOfReports(this._reports, "audio", "delta_rtt_ms_out"),
          max: maxValueOfReports(this._reports, "audio", "delta_rtt_ms_out"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "delta_rtt_ms_out"),
        },
        video: {
          avg: averageRTT(this._reports, "video"),
          min: minValueOfReports(this._reports, "video", "delta_rtt_ms_out"),
          max: maxValueOfReports(this._reports, "video", "delta_rtt_ms_out"),
          volatility: volatilityValuesOfReports(this._reports, "video", "delta_rtt_ms_out"),
        },
        connectivity: {
          avg: averageRTTConnectivity(this._reports, "data"),
          min: minValueOfReports(this._reports, "data", "delta_rtt_connectivity_ms_out"),
          max: maxValueOfReports(this._reports, "data", "delta_rtt_connectivity_ms_out"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_rtt_connectivity_ms_out"),
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
          avg: averageValuesOfReports(this._reports, "audio", "mos_emodel_in"),
          min: minValueOfReports(this._reports, "audio", "mos_emodel_in"),
          max: maxValueOfReports(this._reports, "audio", "mos_emodel_in"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "mos_emodel_in"),
        },
        effective: {
          avg: averageValuesOfReports(this._reports, "audio", "mos_in"),
          min: minValueOfReports(this._reports, "audio", "mos_in"),
          max: maxValueOfReports(this._reports, "audio", "mos_in"),
          volatility: volatilityValuesOfReports(this._reports, "audio", "mos_in"),
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
          in: {
            avg: Math.round((((audioPacketsLost / (audioPacketsLost + audioPacketsReceived)) * 100) || 0) * 100) / 100,
          },
        },
        video: {
          in: {
            avg: Math.round((((videoPacketsLost / (videoPacketsLost + videoPacketsReceived)) * 100) || 0) * 100) / 100,
          },
        },
        unit: {
          avg: "percent",
        },
      },
      bitrate: {
        in: {
          avg: averageValuesOfReports(this._reports, "data", "delta_kbs_in"),
          min: minValueOfReports(this._reports, "data", "delta_kbs_in"),
          max: maxValueOfReports(this._reports, "data", "delta_kbs_in"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_kbs_in"),
        },
        out: {
          avg: averageValuesOfReports(this._reports, "data", "delta_kbs_out"),
          min: minValueOfReports(this._reports, "data", "delta_kbs_out"),
          max: maxValueOfReports(this._reports, "data", "delta_kbs_out"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_kbs_out"),
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
          avg: averageValuesOfReports(this._reports, "data", "delta_KBytes_in"),
          min: minValueOfReports(this._reports, "data", "delta_KBytes_in"),
          max: maxValueOfReports(this._reports, "data", "delta_KBytes_in"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_KBytes_in"),
        },
        out: {
          avg: averageValuesOfReports(this._reports, "data", "delta_KBytes_out"),
          min: minValueOfReports(this._reports, "data", "delta_KBytes_out"),
          max: maxValueOfReports(this._reports, "data", "delta_KBytes_out"),
          volatility: volatilityValuesOfReports(this._reports, "data", "delta_KBytes_out"),
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
