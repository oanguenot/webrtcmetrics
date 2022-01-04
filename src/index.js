import "regenerator-runtime/runtime.js";
import { info } from "./utils/log";
import { getConfig, getGlobalConfig } from "./utils/config";
import Probe from "./probe";
import { ANALYZER_STATE } from "./utils/helper";

const moduleName = "metrics-indx";

export default class WebRTCMetrics {
  constructor() {
    this._config = getGlobalConfig();
    this._probes = [];
    info(moduleName, `welcome to ${this._config.name} version ${this._config.version}`);
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
   * Create a new probe and return it
   * @param {RTCPeerConnection} peerConnection The RTCPeerConnection instance to monitor
   * @param {Object} options  The option
   * @return {Probe}
   */
  createProbe(peerConnection, options) {
    const probeConfig = getConfig(options);
    const probe = Probe(peerConnection, probeConfig);
    this._probes.push(probe);
    return probe;
  }

  removeProbe(probe) {
    if (!probe) {
      throw new Error("undefined probe");
    }
    if (probe.state === ANALYZER_STATE.RUNNING) {
      probe.stop();
    }
    this._probes = this._probes.filter((existingProbe) => (probe.id !== existingProbe.id));
  }

  /**
   * Get the probes
   */
  get probes() {
    return this._probes;
  }
}
