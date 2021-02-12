import { setVerboseLog, debug, info } from "./utils/log";
import { getLibName, getVersion } from "./utils/helper";
import Analyzer from "./analyzer";

const moduleName = "metrics-indx";

export default class WebRTCMetrics {
  constructor(cfg) {
    if (!cfg) {
      throw new Error("Argument 'cfg', is missing - 'Object' containing the global configuration");
    }

    if (!cfg.pc) {
      throw new Error("Argument 'cfg.pc', is missing - 'RTCPeerConnection' containing the peer connection to monitor");
    }

    if (cfg.verbose) {
      this.verboseLog = true;
    }
    this._name = getLibName();
    this._version = getVersion();

    this._analyzer = new Analyzer(cfg.pc);

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
    this._analyzer.start();
  }

  stop() {
    this._analyzer.stop();
  }
}