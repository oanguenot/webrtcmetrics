import "regenerator-runtime/runtime.js";
import { info, setVerboseLog } from "./utils/log";
import { getConfig, getGlobalConfig } from "./utils/config";
import Probe from "./probe";
import { ANALYZER_STATE } from "./utils/helper";

const moduleName = "interface   ";

export default class WebRTCMetrics {
  constructor(cfg) {
    this._config = getGlobalConfig(cfg);
    this._probes = [];
    info(moduleName, `welcome to ${this._config.name} version ${this._config.version}`);
    setVerboseLog(this._config.verbose || false);
    info(moduleName, `configured for probing every ${this._config.refreshEvery}ms`);
    info(moduleName, `started after ${this._config.startAfter}ms`);
    info(moduleName, `${this._config.stopAfter !== -1 ? `stopped after ${this._config.stopAfter}ms` : "never stopped"}`);
  }

  /**
   * Get the version
   */
  get version() {
    return this._config.version;
  }

  /**
   * Get the library name
   */
  get name() {
    return this._config.name;
  }

  /**
   * Get the probes
   */
   get probes() {
    return this._probes;
  }

  /**
   * Create a new probe and return it
   * @param {RTCPeerConnection} peerConnection The RTCPeerConnection instance to monitor
   * @param {Object} options  The option
   * @return {Probe}
   */
  createProbe(peerConnection, options) {
    const probeConfig = getConfig(peerConnection, options, this._config);
    const probe = new Probe(probeConfig);
    this._probes.push(probe);
    info(moduleName, `${this._probes.length} probes registered`);
    return probe;
  }

  /**
   * Start all probes
   */
  startAllProbes() {
    this.probes.forEach((probe) => probe.start());
  }

  /**
   * Stop all probes
   */
   stopAllProbes() {
    this.probes.forEach((probe) => probe.stop());
  }

  /**
   * Experimental
   * Remote a probe
   * @param {Probe} probe
   */
  removeProbe(probe) {
    if (!probe) {
      throw new Error("undefined probe");
    }
    if (probe.state === ANALYZER_STATE.RUNNING) {
      probe.stop();
    }
    this._probes = this._probes.filter((existingProbe) => (probe.id !== existingProbe.id));
  }
}
