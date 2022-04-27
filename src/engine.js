import { info, debug, error } from "./utils/log";
import { getConfig } from "./utils/config";
import Probe from "./probe";
import {
  COLLECTOR_STATE,
  getDefaultGlobalMetric,
} from "./utils/models";
import { call, sumValuesOfReports, timeout } from "./utils/helper";

const moduleName = "engine      ";

export default class ProbesEngine {
  constructor(cfg) {
    this._config = cfg;
    this._probes = [];
    this._startedTime = null;
    this._callbacks = {
      onresult: null,
    };
    info(moduleName, `configured for probing every ${this._config.refreshEvery}ms`);
    info(moduleName, `configured for starting after ${this._config.startAfter}ms`);
    info(moduleName, `${(!this._config.stopAfter || this._config.stopAfter !== -1) ? `configured for stopped after ${this._config.stopAfter}ms` : "configured for never stopped"}`);
    debug(moduleName, "engine initialized");
  }

  get probes() {
    return this._probes;
  }

  get isRunning() {
    return this._probes.some((probe) => (probe.isRunning));
  }

  get isIdle() {
    return this._probes.every((probe) => (probe.isIdle));
  }

  addNewProbe(peerConnection, options) {
    if (!peerConnection) {
      throw new Error("undefined peer connection");
    }
    const probeConfig = getConfig(peerConnection, options, this._config);
    const probe = new Probe(probeConfig);
    this._probes.push(probe);
    debug(moduleName, `${this._probes.length} probes registered`);
    return probe;
  }

  removeExistingProbe(probe) {
    if (!probe) {
      throw new Error("undefined probe");
    }
    if (probe.state === COLLECTOR_STATE.RUNNING) {
      probe.stop();
    }
    this._probes = this._probes.filter((existingProbe) => (probe.id !== existingProbe.id));
  }

  async start() {
    const startProbes = () => {
      this._probes.forEach((probe) => probe.start());
    };

    const takeReferenceStat = async () => (
      Promise.all(this._probes.map((probe) => (probe.takeReferenceStats())))
    );

    const shouldCollectStats = () => {
      if (this.isIdle) {
        // don't collect if there is no running probes
        return false;
      }
      if (!this._config.stopAfter || this._config.stopAfter < 0) {
        // always collect if stopAfter has not been set
        return true;
      }
      // Else check expiration
      return (Date.now() < this._startedTime + this._config.stopAfter);
    };

    const collectStats = async () => {
      const globalReport = getDefaultGlobalMetric();
      const runningProbes = this._probes.filter((probe) => (probe.isRunning));
      for (const probe of runningProbes) {
        const report = await probe.collectStats();
        if (report) {
          globalReport.probes.push(report);
        }
        debug(moduleName, `got probe ${probe.id}`);
        await timeout(0);
      }

      // Compute total measure time
      globalReport.delta_time_to_measure_probes_ms = sumValuesOfReports(globalReport.probes, "experimental", "time_to_measure_ms");
      globalReport.delta_KBytes_in = sumValuesOfReports(globalReport.probes, "data", "delta_KBytes_in");
      globalReport.delta_KBytes_out = sumValuesOfReports(globalReport.probes, "data", "delta_KBytes_out");
      globalReport.delta_kbs_in = sumValuesOfReports(globalReport.probes, "data", "delta_kbs_in");
      globalReport.delta_kbs_out = sumValuesOfReports(globalReport.probes, "data", "delta_kbs_out");
      globalReport.total_time_decoded_in = sumValuesOfReports(globalReport.probes, "video", "total_time_decoded_in");
      globalReport.total_time_encoded_out = sumValuesOfReports(globalReport.probes, "video", "total_time_encoded_out");
      return globalReport;
    };

    debug(moduleName, "starting to collect");
    startProbes();
    debug(moduleName, "generating reference reports...");
    await takeReferenceStat();
    debug(moduleName, "reference reports generated");
    this._startedTime = Date.now();
    while (shouldCollectStats()) {
      debug(moduleName, `wait ${this._config.refreshEvery}ms before collecting`);
      await timeout(this._config.refreshEvery);
      if (shouldCollectStats()) {
        debug(moduleName, "collecting...");
        const preTime = Date.now();
        const globalReport = await collectStats();
        const postTime = Date.now();
        globalReport.delta_time_consumed_to_measure_ms = postTime - preTime;
        this.fireOnReports(globalReport);
        debug(moduleName, "collected");
      }
    }

    debug(moduleName, "reaching end of the collecting period...");

    if (this.isRunning) {
      setTimeout(() => {
        this.stop();
      }, 0);
    }
  }

  stop(forced) {
    const stopProbes = (manual) => {
      this._probes.forEach((probe) => {
        probe.stop(manual);
      });
    };

    info(moduleName, "stop collecting");
    stopProbes(forced);
  }

  registerCallback(name, callback, context) {
    if (name in this._callbacks) {
      this._callbacks[name] = { callback, context };
      debug(moduleName, `registered callback '${name}'`);
    } else {
      error(moduleName, `can't register callback for '${name}' - not found`);
    }
  }

  unregisterCallback(name) {
    if (name in this._callbacks) {
      this._callbacks[name] = null;
      delete this._callbacks[name];
      debug(this._moduleName, `unregistered callback '${name}'`);
    } else {
      error(this._moduleName, `can't unregister callback for '${name}' - not found`);
    }
  }

  fireOnReports(report) {
    if (this._callbacks.onresult && report.probes.length > 0) {
      call(this._callbacks.onresult.callback, this._callbacks.onresult.context, report);
    }
  }
}
