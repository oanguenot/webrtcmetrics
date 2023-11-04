import "regenerator-runtime/runtime.js";
import {
  info,
  setLogLevel,
  setSilentLog,
  setVerboseLog,
} from "./utils/log";
import { getGlobalConfig } from "./utils/config";
import ProbesEngine from "./engine";

const moduleName = "interface   ";

export default class WebRTCMetrics {
  constructor(cfg) {
    this._config = getGlobalConfig(cfg);
    if (this._config.silent) {
      setSilentLog();
    } else {
      setVerboseLog(this._config.verbose || false);
    }
    info(moduleName, `welcome to ${this._config.name} version ${this._config.version}`);
    this._engine = new ProbesEngine(this._config);
  }

  /**
   * Change log level manually
   * @param {string} level - The level of logs. Can be one of 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'
   */
  setupLogLevel(level) {
    setLogLevel(level);
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
    return this._engine.probes;
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
    console.warn("This method is deprecated and will be removed soon");
    this.run();
  }

  /**
   * Stop all probes
   */
   stopAllProbes() {
    console.warn("This method is deprecated and will be removed soon");
    this.end();
  }

  /**
   * Start capturing metrics
   */
  run() {
    this._engine.start();
  }

  /**
   * Stop capturing metrics
   */
  end() {
    this._engine.stop();
  }

  /**
   * Is running
   */
  get running() {
    return this._engine.isRunning;
  }

  /**
   * Is Idle
   */
  get idle() {
    return this._engine.isIdle;
  }

  /**
   * Experimental
   * Remote a probe
   * @param {Probe} probe
   */
  removeProbe(probe) {
   this._engine.removeExistingProbe(probe);
  }

  set onresult(callback) {
    if (callback) {
      this._engine.registerCallback("onresult", callback);
    } else {
      this._engine.unregisterCallback("onresult");
    }
  }

  /**
   * Get the report generated by a probe
   * @param {Probe} probe
   */
  getTicket(probe) {
    return probe.getTicket();
  }
}
