import "regenerator-runtime/runtime.js";
import { info, setVerboseLog } from "./utils/log";
import { getGlobalConfig } from "./utils/config";
import ProbesEngine from "./engine";

const moduleName = "interface   ";

export default class WebRTCMetrics {
  constructor(cfg) {
    this._config = getGlobalConfig(cfg);
    info(moduleName, `welcome to ${this._config.name} version ${this._config.version}`);
    setVerboseLog(this._config.verbose || false);
    this._engine = new ProbesEngine(this._config);
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
   * @return {Probe} The probe created
   */
  createProbe(peerConnection, options) {
    return this._engine.addNewProbe(peerConnection, options);
  }

  /**
   * Start all probes
   */
  startAllProbes() {
    this._engine.startAll();
  }

  /**
   * Stop all probes
   */
   stopAllProbes() {
    this._engine.stopAll();
  }

  /**
   * Experimental
   * Remote a probe
   * @param {Probe} probe
   */
  removeProbe(probe) {
   this._engine.removeExistingProbe(probe);
  }
}
