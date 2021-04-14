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
      mos: average(this._reports, "audio", "mos"),
      mos_emodel: average(this._reports, "audio", "mos_emodel"),
      reports: this._cfg.record ? this._reports : [],
    };
  }

  updateConfig(config) {
    this._cfg = config;
  }
}
