import "regenerator-runtime/runtime.js";
import { v4 as uuidv4 } from "uuid";
import { setVerboseLog, info, warn } from "./utils/log";
import { getLibName, getVersion } from "./utils/helper";
import Analyzer from "./analyzer";

const moduleName = "metrics-indx";

const _cfg = {
  refreshTimer: 1000,
  verbose: false,
  pname: `p-${uuidv4()}`,
  cid: `c-${uuidv4()}`,
  uid: `u-${uuidv4()}`,
};

export default class WebRTCMetrics {
  constructor(cfg) {
    if (!cfg) {
      throw new Error("Argument [Object] 'cfg' for the configuration is missing");
    }

    if (!cfg.pc) {
      throw new Error("Argument [RTCPeerConnection] 'cfg.pc' for the peer connection is missing");
    }
    this._pc = cfg.pc;

    if (!cfg.pname) {
      warn(moduleName, `Argument [String] 'cfg.pname' for the peerConnection name or id is missing - use generated '${_cfg.pname}'`);
    }
    this._pname = cfg.pname || _cfg.pname;

    if (!cfg.refreshTimer) {
      warn(moduleName, `Argument [Int] 'cfg.refreshTimer' for the timer is missing - use default '${_cfg.refreshTimer}'`);
    }
    this._refreshTimer = cfg.refreshTimer || _cfg.refreshTimer;

    if (!cfg.cid) {
      warn(moduleName, `Argument [String] 'cfg.cid' for the call name or id is missing - use generated '${_cfg.cid}'`);
    }
    this._cid = cfg.cid || _cfg.cid;

    if (!cfg.uid) {
      warn(moduleName, `Argument [String] 'cfg.uid' for the user name or id is missing - use generated '${_cfg.uid}'`);
    }
    this._uid = cfg.uid || _cfg.uid;

    this._verboseLog = cfg.verbose || _cfg.verbose;
    this._name = getLibName();
    this._version = getVersion();
    this._analyzer = new Analyzer(this._pc, this._pname, this._cid, this._uid);

    setVerboseLog(this._verboseLog);
    info(moduleName, `welcome to ${this.name} version ${this.version}`);
  }

  /**
   * Register to event 'onmetrics'
   * Fired when a metrics is received
   */
  set onmetrics(callback) {
    this._analyzer.registerCallback("onmetrics", callback);
  }

  /**
   * Start the analyzer
   */
  start() {
    info(moduleName, `analyze the peer connection every ${this._refreshTimer}ms`);
    this._analyzer.start({ refreshTimer: this._refreshTimer });
  }

  /**
   * Stop the analyzer
   */
  stop() {
    this._analyzer.stop();
  }
}
