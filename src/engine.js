import { info, debug } from "./utils/log";
import { getConfig } from "./utils/config";
import Probe from "./probe";
import { ANALYZER_STATE } from "./utils/helper";

const moduleName = "engine      ";

export default class ProbesEngine {
  constructor(cfg) {
    this._config = cfg;
    this._probes = [];
    info(moduleName, `configured for probing every ${this._config.refreshEvery}ms`);
    info(moduleName, `configured for starting after ${this._config.startAfter}ms`);
    info(moduleName, `${this._config.stopAfter !== -1 ? `configured for stopped after ${this._config.stopAfter}ms` : "configured for never stopped"}`);
    debug(moduleName, "engine initialized");
  }

  addNewProbe(peerConnection, options) {
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

  startAll() {
    this._probes.forEach((probe) => probe.start());
  }

  stopAll() {
    this._probes.forEach((probe) => probe.stop());
  }
}
