import "regenerator-runtime/runtime.js";
import { setVerboseLog, debug, info } from "./utils/log";
import { getLibName, getVersion } from "./utils/helper";
import Analyzer from "./analyzer";
import Debugger from "./debugger";

const moduleName = "metrics-indx";

const _cfg = {
  refreshTimer: 1000
}

export default class WebRTCMetrics {
  constructor(cfg) {
    if (!cfg) {
      throw new Error("Argument 'cfg', is missing - 'Object' containing the global configuration");
    }

    if (!cfg.pc) {
      throw new Error("Argument 'cfg.pc', is missing - 'RTCPeerConnection' containing the peer connection to monitor");
    }

    if (!cfg.name) {
      throw new Error("Argument 'cfg.name', is missing - 'String' containing the name of the peer connection to monitor");
    }

    if (cfg.verbose) {
      this.verboseLog = true;
    }

    if (cfg.refreshTimer) {

    }

    this._refreshTimer = cfg.refreshTimer || _cfg.refreshTimer;
    this._name = getLibName();
    this._version = getVersion();
    this._window = null;
    this._analyzer = new Analyzer(cfg.pc, cfg.name);

    info(moduleName, `welcome to ${this.name} version ${this.version}`);
  }

  /**
     * Register to event 'onmetrics'
     * Fired when a metrics is received
     */
  set onmetrics(callback) {
    this._analyzer.registerCallback("onmetrics", callback);
  }

  start() {
    this._analyzer.start({ refreshTimer: this._refreshTimer });
  }

  stop() {
    this._analyzer.stop();
  }
}