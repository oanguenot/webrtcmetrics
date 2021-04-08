import Exporter from "./exporter";
import { computeMos, extract } from "./extractor";
import { defaultMetric } from "./utils/helper";
import { debug, error } from "./utils/log";

const moduleName = "analyzer    ";

export default class Analyzer {
  constructor(cfg) {
    this._callbacks = {
      onreport: null,
      onticket: null,
    };

    this._pc = cfg.pc;
    this._pname = cfg.name;
    this._callid = cfg.cid;
    this._userid = cfg.uid;
    this._intervalId = null;
    this._cfg = cfg;
    this._exporter = new Exporter(cfg);
  }

  analyze(stats) {
    const report = defaultMetric;

    report.pname = this._pname;
    report.call_id = this._callid;
    report.user_id = this._userid;

    stats.forEach((stat) => {
      if (!report.timestamp && stat.timestamp) {
        report.timestamp = stat.timestamp;
      }
      const values = extract(stat);
      values.forEach((data) => {
        if (data.value && data.type) {
          Object.keys(data.value).forEach((key) => {
            report[data.type][key] = data.value[key];
          });
        }
      });
    });

    report.audio.mos = computeMos(report);
    return report;
  }

  async start() {
    const getStats = async () => {
      if (!this._pc) {
        return;
      }
      try {
        const reports = await this._pc.getStats();
        debug(moduleName, "getstats() - analyze in progress...");

        const metric = this.analyze(reports);

        this.fireOnReport(metric);
        if (this._cfg.record) {
          this._exporter.addReport(metric);
        }
      } catch (err) {
        error(moduleName, `getStats() - error ${err}`);
      }
    };

    if (this._intervalId) {
      debug(moduleName, `start() - clear analyzer with id ${this._intervalId}`);
      clearInterval(this._intervalId);
    }

    debug(moduleName, "start() - start analyzing...");
    this._exporter.start();
    this._intervalId = setInterval(() => {
      getStats();
    }, this._cfg.refreshTimer);
  }

  stop() {
    if (!this._intervalId) {
      return;
    }

    clearInterval(this._intervalId);
    this._exporter.stop();
  }

  registerCallback(name, callback, context) {
    if (name in this._callbacks) {
      this._callbacks[name] = { callback, context };
      debug(moduleName, `registered callback '${name}'`);
    } else {
      error(moduleName, `can't register callback for '${name}' - already exists`);
    }
  }

  unregisterCallback(name) {
    if (name in this._callbacks) {
      this._callbacks[name] = null;
      delete this._callbacks[name];
      debug(moduleName, `unregistered callback '${name}'`);
    } else {
      error(moduleName, `can't unregister callback for '${name}' - not found`);
    }
  }

  fireOnReport(report) {
    const call = (fct, context, value) => {
      if (!context) {
        fct(value);
      } else {
        fct.call(context, value);
      }
    };

    if (this._callbacks.onreport) {
      call(this._callbacks.onreport.callback, this._callbacks.onreport.context, report);
    }
  }
}
