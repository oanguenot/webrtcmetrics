import { setVerboseLog, info, warn } from "./utils/log";
import Analyzer from "./analyzer";
import { ANALYZER_STATE, createProbeId } from "./utils/helper";

const moduleName = "probe       ";

export default class Probe {
  constructor(cfg) {
    this._id = createProbeId();
    this._config = cfg;
    this._analyzer = new Analyzer(this._config);
  }

  /**
   * Register a callback to 'onreport'
   * Unregister when callback is null
   * Fired when a report is received
   */
  set onreport(callback) {
    if (callback) {
      this._analyzer.registerCallback("onreport", callback);
    } else {
      this._analyzer.unregisterCallback("onreport");
    }
  }

  /**
   * Register a callback to 'onticket'
   * Unregister when callback is null
   * Fired when a ticket is received
   */
  set onticket(callback) {
    if (callback) {
      this._analyzer.registerCallback("onticket", callback);
    } else {
      this._analyzer.unregisterCallback("onticket");
    }
  }

  /**
   * Get the id of the Probe
   */
   get id() {
    return this._id;
  }

  /**
   * Get the name of the PeerConnection
   */
  get pname() {
    return this._config.pname;
  }

  /**
   * Get the call identifier
   */
  get cid() {
    return this._config.cid;
  }

  /**
   * Get the user identifier
   */
   get uid() {
    return this._config.uid;
  }

  /**
   * Get the state of the analyzer
   * Value can be 'running' or 'idle'
   */
  get state() {
    return this._analyzer.state;
  }

  /**
   * Return true if the probe is running
   */
  get isRunning() {
    return this.state === ANALYZER_STATE.RUNNING;
  }

  /**
   * Return true if the probe is idle
   */
  get isIdle() {
    return this.state === ANALYZER_STATE.IDLE;
  }

  /**
   * Set the user identifier
   */
  updateUserId(value) {
    this._config.uid = value;
    this._analyzer.updateConfig(this._config);
  }

  /**
   * Update the call identifier
   */
   updateCallId(value) {
    this._config.cid = value;
    this._analyzer.updateConfig(this._config);
  }

  /**
   * Start the probe
   */
  start() {
    if (!this.isIdle) {
      warn(moduleName, `probe ${this._id} is already running`);
      return;
    }

    info(moduleName, `start probe ${this._id}`);
    this._analyzer.start();
  }

  /**
   * Stop the probe
   */
  stop() {
    if (!this.isRunning) {
      warn(moduleName, `probe ${this._id} is not running`);
      return;
    }

    info(moduleName, `stop probe ${this._id}`);
    this._analyzer.stop();
  }
}
