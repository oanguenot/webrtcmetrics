import { info, warn } from "./utils/log";
import Collector from "./collector";
import { COLLECTOR_STATE } from "./utils/models";
import { createProbeId } from "./utils/helper";

export default class Probe {
  constructor(cfg) {
    this._id =
      (cfg.pname && cfg.pname.substr(0, 12).padEnd(12, " ")) || createProbeId();
    this._moduleName = this._id;
    info(this._moduleName, "probe created");
    this._config = cfg;
    this._collector = new Collector(this._config, this._id);
  }

  /**
   * Register a callback to 'onreport'
   * Unregister when callback is null
   * Fired when a report is received
   */
  set onreport(callback) {
    if (callback) {
      this._collector.registerCallback("onreport", callback);
    } else {
      this._collector.unregisterCallback("onreport");
    }
  }

  /**
   * Register a callback to 'onticket'
   * Unregister when callback is null
   * Fired when a ticket is received
   */
  set onticket(callback) {
    if (callback) {
      this._collector.registerCallback("onticket", callback);
    } else {
      this._collector.unregisterCallback("onticket");
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
    return this._collector.state;
  }

  set state(newState) {
    this._collector.state = newState;
  }

  /**
   * Add a custom event for that probe
   * @param {String} name The name of the event
   * @param {String} category The category of the event. Could be any strings
   * @param {String} message A description. Could be empty
   * @param {Date} at Optional. The date of the event.
   * @param {String} ssrc Optional. The associated ssrc of the stream. Null by default.
   * @param {Object} value. The value. Null by default
   * @param {Date} ended Optional. Then end date for period
   */
  addCustomEvent(
    name,
    category,
    message,
    at = new Date(),
    ssrc = null,
    value = null,
    ended = null,
  ) {
    let endedAt = null;
    if (ended) {
      endedAt = typeof ended === "object" ? ended.toJSON() : ended;
    }

    this._collector.addCustomEvent({
      at: typeof at === "object" ? at.toJSON() : at,
      ended: endedAt,
      category,
      name,
      ssrc,
      details: {
        message,
        kind: null,
        direction: null,
        value,
        value_old: null,
      },
    });
  }

  /**
   * Return true if the probe is running
   */
  get isRunning() {
    return this._collector.state === COLLECTOR_STATE.RUNNING;
  }

  /**
   * Return true if the probe is idle
   */
  get isIdle() {
    return this._collector.state === COLLECTOR_STATE.IDLE;
  }

  /**
   * Set the user identifier
   */
  updateUserId(value) {
    this._config.uid = value;
    this._collector.updateConfig(this._config);
  }

  /**
   * Update the call identifier
   */
  updateCallId(value) {
    this._config.cid = value;
    this._collector.updateConfig(this._config);
  }

  /**
   * Set a probe to running state
   */
  start() {
    if (!this.isIdle) {
      warn(this._moduleName, "probe is already running");
      return;
    }
    this._collector.start();
  }

  /**
   * Set a probe to idle state
   */
  stop(forced = false) {
    if (!this.isRunning) {
      return;
    }
    this._collector.stop(forced);
  }

  async takeReferenceStats() {
    return this._collector.takeReferenceStats();
  }

  async collectStats() {
    return this._collector.collectStats();
  }

  getTicket() {
    return this._collector && this._collector.getTicket();
  }
}
