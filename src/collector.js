import Exporter from "./exporter";
import { extract, extractPassthroughFields } from "./extractor";
import {
  computeMOS,
  computeEModelMOS, computeFullEModelScore,
} from "./utils/score";
import {
  COLLECTOR_STATE,
  defaultAudioMetricIn,
  defaultAudioMetricOut,
  defaultVideoMetricIn,
  defaultVideoMetricOut,
  getDefaultMetric,
  VALUE,
  TYPE, DIRECTION,
} from "./utils/models";
import { createCollectorId, call } from "./utils/helper";
import { debug, error, info } from "./utils/log";
import { doLiveTreatment } from "./live";

export default class Collector {
  constructor(cfg, refProbeId) {
    this._callbacks = {
      onreport: null,
      onticket: null,
    };

    this._id = createCollectorId();
    this._moduleName = this._id;
    this._probeId = refProbeId;
    this._config = cfg;
    this._exporter = new Exporter(cfg);
    this._state = COLLECTOR_STATE.IDLE;
    this._oldReports = null;
    this.registerToPCEvents();
    info(this._moduleName, `new collector created for probe ${this._probeId}`);
  }

  analyze(stats, oldStats, previousReport, beforeLastReport, referenceReport, _refPC) {
    const getDefaultSSRCMetric = (kind, reportType) => {
      if (kind === VALUE.AUDIO) {
        if (reportType === TYPE.INBOUND_RTP) {
          return { ...defaultAudioMetricIn };
        }
        return { ...defaultAudioMetricOut };
      }

      if (reportType === TYPE.INBOUND_RTP) {
        return { ...defaultVideoMetricIn };
      }
      return { ...defaultVideoMetricOut };
    };

    // Get previous report without any modifications
    const report = getDefaultMetric(previousReport);

    let timestamp = null;
    stats.forEach((stat) => {
      if (!timestamp && stat.timestamp) {
        timestamp = stat.timestamp;
      }
      const values = extract(stat, report, report.pname, referenceReport, stats, oldStats, _refPC);
      values.forEach((data) => {
        if ("internal" in data) {
          doLiveTreatment(data, previousReport, values);
        }
        if (data.value && data.type) {
          if (data.ssrc) {
            let ssrcReport = report[data.type][data.ssrc];
            if (!ssrcReport) {
              ssrcReport = getDefaultSSRCMetric(data.type, stat.type);
              ssrcReport.ssrc = data.ssrc;
              report[data.type][data.ssrc] = (ssrcReport);
            }
            Object.keys(data.value).forEach((key) => {
              ssrcReport[key] = data.value[key];
            });
          } else {
            Object.keys(data.value).forEach((key) => {
              report[data.type][key] = data.value[key];
            });
          }
        }
      });

      // Extract passthrough fields
      const passthrough = extractPassthroughFields(stat, this._config.passthrough);
      Object.keys(passthrough).forEach((key) => {
        if (!(report.passthrough[key])) {
          report.passthrough[key] = {};
        }
        report.passthrough[key] = { ...report.passthrough[key], ...passthrough[key] };
      });
    });
    report.pname = this._config.pname;
    report.call_id = this._config.cid;
    report.user_id = this._config.uid;
    report.count = previousReport ? previousReport.count + 1 : 1;
    report.timestamp = timestamp;
    Object.keys(report[VALUE.AUDIO]).forEach((key) => {
      const ssrcReport = report[VALUE.AUDIO][key];
      ssrcReport[ssrcReport.direction === DIRECTION.INBOUND ? "mos_emodel_in" : "mos_model_out"] = computeEModelMOS(
        report,
        VALUE.AUDIO,
        previousReport,
        beforeLastReport,
        ssrcReport.ssrc,
        ssrcReport.direction,
        3,
      );
      ssrcReport[ssrcReport.direction === DIRECTION.INBOUND ? "mos_in" : "mos_out"] = computeMOS(
        report,
        VALUE.AUDIO,
        previousReport,
        beforeLastReport,
        ssrcReport.ssrc,
        ssrcReport.direction,
        3,
      );
      ssrcReport[ssrcReport.direction === DIRECTION.INBOUND ? "mos_fullband_in" : "mos_fullband_out"] = computeFullEModelScore(
        report,
        VALUE.AUDIO,
        previousReport,
        beforeLastReport,
        ssrcReport.ssrc,
        ssrcReport.direction,
        3,
      );
    });
    return report;
  }

  async takeReferenceStats() {
    return new Promise((resolve, reject) => {
      const preWaitTime = Date.now();
      setTimeout(async () => {
        try {
          const waitTime = Date.now() - preWaitTime;
          const preTime = Date.now();
          const reports = await this._config.pc.getStats();
          const referenceReport = this.analyze(reports, null, null, null, null, this._config.pc);
          const postTime = Date.now();
          referenceReport.experimental.time_to_measure_ms = postTime - preTime;
          referenceReport.experimental.time_to_wait_ms = waitTime;
          this._exporter.saveReferenceReport(referenceReport);
          debug(
            this._moduleName,
            `got reference report for probe ${this._probeId}`,
          );
          resolve();
        } catch (err) {
          reject(err);
        }
      }, this._config.startAfter);
    });
  }

  async collectStats() {
    try {
      if (this._state !== COLLECTOR_STATE.RUNNING || !this._config.pc) {
        debug(
          this._moduleName,
          `report discarded (too late) for probe ${this._probeId}`,
        );
        return null;
      }

      const preTime = Date.now();
      const reports = await this._config.pc.getStats();
      const report = this.analyze(
        reports,
        this._oldReports,
        this._exporter.getLastReport(),
        this._exporter.getBeforeLastReport(),
        this._exporter.getReferenceReport(),
        this._config.pc,
      );
      this._oldReports = reports;
      const postTime = Date.now();
      report.experimental.time_to_measure_ms = postTime - preTime;
      this._exporter.addReport(report);
      debug(
        this._moduleName,
        `got report for probe ${this._probeId}#${
          this._exporter.getReportsNumber() + 1
        }`,
      );
      this.fireOnReport(report);
      return report;
    } catch (err) {
      error(this._moduleName, `got error ${err}`);
      return null;
    }
  }

  async start() {
    debug(this._moduleName, "starting");
    this.state = COLLECTOR_STATE.RUNNING;
    this._startedTime = this._exporter.start();
    debug(this._moduleName, "started");
  }

  async mute() {
    this.state = COLLECTOR_STATE.MUTED;
    debug(this._moduleName, "muted");
  }

  async unmute() {
    this.state = COLLECTOR_STATE.RUNNING;
    debug(this._moduleName, "unmuted");
  }

  async stop(forced) {
    debug(this._moduleName, `stopping${forced ? " by watchdog" : ""}...`);
    this._stoppedTime = this._exporter.stop();
    this.state = COLLECTOR_STATE.IDLE;

    if (this._config.ticket) {
      const { ticket } = this._exporter;
      this.fireOnTicket(ticket);
    }
    this._exporter.reset();
    debug(this._moduleName, "stopped");
  }

  registerCallback(name, callback, context) {
    if (name in this._callbacks) {
      this._callbacks[name] = {
        callback,
        context,
      };
      debug(this._moduleName, `registered callback '${name}'`);
    } else {
      error(
        this._moduleName,
        `can't register callback for '${name}' - not found`,
      );
    }
  }

  unregisterCallback(name) {
    if (name in this._callbacks) {
      this._callbacks[name] = null;
      delete this._callbacks[name];
      debug(this._moduleName, `unregistered callback '${name}'`);
    } else {
      error(
        this._moduleName,
        `can't unregister callback for '${name}' - not found`,
      );
    }
  }

  fireOnReport(report) {
    if (this._callbacks.onreport) {
      call(
        this._callbacks.onreport.callback,
        this._callbacks.onreport.context,
        report,
      );
    }
  }

  fireOnTicket(ticket) {
    if (this._callbacks.onticket) {
      call(
        this._callbacks.onticket.callback,
        this._callbacks.onticket.context,
        ticket,
      );
    }
  }

  updateConfig(config) {
    this._config = config;
    this._exporter.updateConfig(config);
  }

  get state() {
    return this._state;
  }

  set state(newState) {
    this._state = newState;
    debug(this._moduleName, `state changed to ${newState}`);
  }

  addCustomEvent(at, category, name, description, data) {
    this._exporter.addCustomEvent({
      at: typeof at === "object" ? at.toJSON() : at,
      category,
      name,
      description,
      data,
    });
  }

  async registerToPCEvents() {
    const { pc } = this._config;
    navigator.mediaDevices.ondevicechange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.addCustomEvent(
          new Date().toJSON(),
          "device",
          "device-change",
          "One device (at least) has been plugged or unplugged",
          { count: devices.length },
        );
        // eslint-disable-next-line no-empty
      } catch (err) {
        error(this._moduleName, "can't get devices");
      }
    };
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const value = pc.iceConnectionState;
        this.addCustomEvent(
          new Date().toJSON(),
          "signal",
          "ice-change",
          `The ICE connection state has changed to ${value}`,
          { state: value, type: "icestate" },
        );
      };
      pc.onconnectionstatechange = () => {
        const value = pc.connectionState;
        this.addCustomEvent(
          new Date().toJSON(),
          "signal",
          "connection-change",
          `The connection state has changed to ${value}`,
          { state: value, type: "connection" },
        );
      };
      pc.onicegatheringstatechange = () => {
        const value = pc.iceGatheringState;
        this.addCustomEvent(
          new Date().toJSON(),
          "signal",
          "gathering-change",
          `The ICE gathering state has changed to ${value}`,
          { state: value, type: "gathering" },
        );
      };
      pc.ontrack = (e) => {
        this.addCustomEvent(
          new Date().toJSON(),
          "call",
          "track-received",
          `A new inbound ${e.track.kind} stream has been started`,
          {
            kind: e.track.kind,
            label: e.track.label,
            id: e.track.id,
            direction: "inbound",
          },
        );
      };
      pc.onnegotiationneeded = () => {
        this.addCustomEvent(
          new Date().toJSON(),
          "signal",
          "ice-negotiation",
          "A negotiation is required",
          { type: "negotiation" },
        );
      };
    }
  }
}
