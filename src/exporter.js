import { info, debug } from "./utils/log";

const moduleName = "exporter    ";

const VERSION_EXPORTER = "1.0";

export default class Exporter {
  constructor(cfg) {
    this._start = null;
    this._end = null;
    this._cfg = cfg;
    this._metrics = [];
  }

  start() {
    info(moduleName, "start() - start exporter...");
    this._start = new Date().toJSON();
  }

  stop() {
    info(moduleName, "stop() - stop exporter...");
    this._end = new Date().toJSON();
  }

  addMetrics(metric) {
    debug(moduleName, `addMetrics() - add metric to exporter at ${metric.timestamp}`);
    this._metrics.push(metric);
  }

  resetMetrics() {
    info(moduleName, "addMetrics() - reset metric");
    this._metrics = [];
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
      data: this._metrics,
    };
  }
}
