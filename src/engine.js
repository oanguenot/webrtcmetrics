import { info, debug } from "./utils/log";
import { getConfig } from "./utils/config";
import Probe from "./probe";
import { ANALYZER_STATE, timeout, ENGINE_STATE } from "./utils/helper";
import { sum } from "./exporter";

const moduleName = "engine      ";

export default class ProbesEngine {
  constructor(cfg) {
    this._config = cfg;
    this._probes = [];
    this._startedTime = null;
    this._state = ENGINE_STATE.IDLE;
    info(moduleName, `configured for probing every ${this._config.refreshEvery}ms`);
    info(moduleName, `configured for starting after ${this._config.startAfter}ms`);
    info(moduleName, `${this._config.stopAfter !== -1 ? `configured for stopped after ${this._config.stopAfter}ms` : "configured for never stopped"}`);
    debug(moduleName, "engine initialized");
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
    if (probe.state === ANALYZER_STATE.RUNNING) {
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
      if (this._state !== ENGINE_STATE.COLLECTING) {
        // don't collect if not in the right state
        return false;
      }
      if (this._config.stopAfter < 0) {
        // always collect if stopAfter has not been set
        return true;
      }
      // Else check expiration
      return (Date.now() < this._startedTime + this._config.stopAfter);
    };

    const collectStats = async () => {
      const reports = [];
      for (const probe of this._probes) {
        const report = await probe.collectStats();
        if (report) {
          reports.push(report);
        }
        debug(moduleName, `got probe ${probe.id}`);
        await timeout(0);
      }

      // Compute total measure time
      const totalTimeMeasureMs = sum(reports, "experimental", "time_to_measure_ms");
      debug(moduleName, `Total Time to measure = ${totalTimeMeasureMs}ms`);
    };

    debug(moduleName, "starting...");
    this._state = ENGINE_STATE.COLLECTING;
    startProbes();
    debug(moduleName, "generating reference reports...");
    await takeReferenceStat();
    debug(moduleName, "reference reports generated");
    this._startedTime = Date.now();
    while (shouldCollectStats()) {
      debug(moduleName, "collecting...");
      debug(moduleName, `wait ${this._config.refreshEvery}ms`);
      await timeout(this._config.refreshEvery);
      debug(moduleName, "ready");
      await collectStats();
      debug(moduleName, "collected...");
    }

    setTimeout(() => {
      this.stop(true);
    }, 1);
  }

  stop(forced) {
    const stopProbes = () => {
      this._probes.forEach((probe) => probe.stop());
    };

    info(moduleName, "stopping");
    this._state = ENGINE_STATE.ENDED;
    stopProbes(forced);
    // this._probes.forEach((probe) => probe.stop());
  }
}
