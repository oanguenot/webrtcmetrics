import Exporter from "./exporter";
import { computeMOS, computeEModelMOS, extract } from "./extractor";
import { getDefaultMetric } from "./utils/helper";
import { debug, error } from "./utils/log";

const moduleName = "analyzer    ";

const call = (fct, context, value) => {
  if (!context) {
    fct(value);
  } else {
    fct.call(context, value);
  }
};

export default class Analyzer {
  constructor(cfg) {
    this._callbacks = {
      onreport: null,
      onticket: null,
    };

    this._intervalId = null;
    this._config = cfg;
    this._exporter = new Exporter(cfg);
  }

  analyze(stats) {
    const report = getDefaultMetric();

    report.pname = this._config.pname;
    report.call_id = this._config.cid;
    report.user_id = this._config.uid;

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

    report.audio.mos_emodel = computeEModelMOS(report);
    report.audio.mos = computeMOS(report);
    return report;
  }

  async start() {
    const getStats = async () => {
      if (!this._config.pc) {
        return;
      }
      try {
        const reports = await this._config.pc.getStats();
        debug(moduleName, "getstats() - analyze in progress...");

        const report = this.analyze(reports);

        this.fireOnReport(report);
        this._exporter.addReport(report);
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
    }, this._config.refreshTimer);
  }

  stop() {
    if (!this._intervalId) {
      return;
    }

    clearInterval(this._intervalId);
    const ticket = this._exporter.stop();
    this.fireOnTicket(ticket);
    this._exporter.reset();
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
    if (this._callbacks.onreport) {
      call(this._callbacks.onreport.callback, this._callbacks.onreport.context, report);
    }
  }

  fireOnTicket(ticket) {
    if (this._callbacks.onticket) {
      call(this._callbacks.onticket.callback, this._callbacks.onticket.context, ticket);
    }
  }

  updateConfig(config) {
    this._config = config;
    this._exporter.updateConfig(config);
  }
}
