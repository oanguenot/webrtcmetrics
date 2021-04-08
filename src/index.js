import "regenerator-runtime/runtime.js";
import { setVerboseLog, info } from "./utils/log";
import Analyzer from "./analyzer";
import { getConfig } from "./utils/config";

const moduleName = "metrics-indx";

export default class WebRTCMetrics {
  constructor(cfg) {
    this._config = getConfig(cfg);
    this._configured = !!this._config;
    this._analyzer = new Analyzer(this._config);

    setVerboseLog(this._config.verboseLog);
    info(moduleName, `welcome to ${this._config.name} version ${this._config.version}`);
  }

  /**
   * Register to event 'onmetrics'
   * Fired when a metrics is received
   */
  set onmetrics(callback) {
    this._analyzer.registerCallback("onmetrics", callback);
  }

  /**
   * Get the name of the PeerConnection
   */
  get pname() {
    return this._name;
  }

  /**
   * Set the call identifier
   */
  set cid(value) {
    this._cid = value;
  }

  /**
   * Get the call identifier
   */
  get cid() {
    return this._cid;
  }

  /**
   * Set the user identifier
   */
  set uid(value) {
    this._uid = value;
  }

  /**
   * Get the user identifier
   */
  get uid() {
    return this._uid;
  }

  /**
   * Start the analyzer
   */
  start() {
    info(moduleName, `analyze started for peer connection every ${this._refreshTimer}ms`);
    this._analyzer.start({ refreshTimer: this._refreshTimer });
  }

  /**
   * Stop the analyzer
   */
  stop() {
    this._analyzer.stop();
  }
}
