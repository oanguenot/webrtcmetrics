import { info, debug } from "./utils/log";

const moduleName = "exporter    ";

const VERSION_EXPORTER = "1.0";

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
  }

  addReport(report) {
    debug(moduleName, `addReport() - add report to exporter at ${report.timestamp}`);
    this._reports.push(report);
  }

  resetReports() {
    info(moduleName, "resetReports() - reset reports");
    this._reports = [];
  }

  get ticket() {
    info(moduleName, "ticket() - generate ticket");
    return {
      pname: this._cfg.pname,
      call_id: this._cfg.call_id,
      user_id: this._cfg.user_id,
      start_time: this._start,
      end_time: this._end,
      version: VERSION_EXPORTER,
      data: this._reports,
    };
  }
}
