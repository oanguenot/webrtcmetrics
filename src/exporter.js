import { debug, trace } from "./utils/log";
import {
  averageValuesOfReports,
  minValueOfReports,
  maxValueOfReports,
  lastOfReports,
  volatilityValuesOfReports,
  getLastReport,
} from "./utils/helper";
import { DIRECTION, VALUE } from "./utils/models";

const moduleName = "exporter    ";

const VERSION_EXPORTER = "2.0";

const averageRTT = (reports, kind, ssrc) => {
  if (!reports || reports.length === 0) {
    return 0;
  }

  const lastReport = reports[reports.length - 1];
  if (!lastReport) {
    return 0;
  }

  const ssrcData = lastReport[kind][ssrc];
  if (ssrcData) {
    const totalRTT = ssrcData.total_rtt_ms_out;
    const totalMeasurements = ssrcData.total_rtt_measure_out;

    if (!totalMeasurements || !totalRTT) {
      return averageValuesOfReports(reports, kind, "delta_rtt_ms_out", false, ssrc);
    }

    return Number(totalRTT / totalMeasurements);
  }
  return null;
};

const averageRTTConnectivity = (reports, kind) => {
  if (!reports || reports.length === 0) {
    return 0;
  }

  const lastReport = reports[reports.length - 1];
  if (!lastReport) {
    return 0;
  }
  const totalRTT = lastReport[kind].total_rtt_connectivity_ms;
  const totalMeasurements = lastReport[kind].total_rtt_connectivity_measure;

  if (!totalMeasurements || !totalRTT) {
    return averageValuesOfReports(
      reports,
      kind,
      "delta_rtt_connectivity_ms",
    );
  }

  return Number(totalRTT / totalMeasurements);
};

const getPath = (reports) => {
  const localCandidateType = lastOfReports(
    reports,
    "network",
    "local_candidate_type",
  );

  if (localCandidateType !== "relay") {
    const localCandidateProtocol = lastOfReports(
      reports,
      "network",
      "local_candidate_protocol",
    );
    return `direct/${localCandidateProtocol}`;
  }

  const localCandidateRelayProtocol = lastOfReports(
    reports,
    "network",
    "local_candidate_relay_protocol",
  );
  return `turn/${localCandidateRelayProtocol}`;
};

const getRemotePath = (reports) => {
  const localCandidateType = lastOfReports(
    reports,
    "network",
    "remote_candidate_type",
  );
  const localCandidateProtocol = lastOfReports(
    reports,
    "network",
    "remote_candidate_protocol",
  );

  if (localCandidateType !== "relay") {
    return `direct/${localCandidateProtocol}`;
  }

  return `turn/${localCandidateProtocol}`;
};

export default class Exporter {
  constructor(cfg) {
    this._start = null;
    this._end = null;
    this._cfg = cfg;
    this._referenceReport = null;
    this._reports = [];
    this._events = [];
  }

  start() {
    trace(moduleName, "start() - start exporter...");
    const date = new Date();
    this._start = date.toJSON();
    return date;
  }

  stop() {
    trace(moduleName, "stop() - stop exporter...");
    const date = new Date();
    this._end = date.toJSON();
    return date;
  }

  saveReferenceReport(report) {
    this._referenceReport = report;
  }

  getReferenceReport() {
    return this._referenceReport;
  }

  addReport(report) {
    if (this._cfg.ticket) {
      debug(
        moduleName,
        `addReport() - add report to exporter at ${report.timestamp}`,
      );
      this._reports.push(report);
    }
  }

  addCustomEvent(event) {
    this._events.push(event);
  }

  reset() {
    trace(moduleName, "resetReports() - reset reports");
    this._reports = [];
    this._referenceReport = null;
    this._start = null;
    this._end = null;
  }

  get ticket() {
    debug(moduleName, "ticket() - generate ticket");

    const audioPacketsLost = lastOfReports(
      this._reports,
      "audio",
      "total_packets_lost_in",
    );
    const audioPacketsReceived = lastOfReports(
      this._reports,
      "audio",
      "total_packets_in",
    );
    const videoPacketsLost = lastOfReports(
      this._reports,
      "video",
      "total_packets_lost_in",
    );
    const videoPacketsReceived = lastOfReports(
      this._reports,
      "video",
      "total_packets_in",
    );

    const ssrcExporter = {};

    const lastReport = getLastReport(this._reports);
    if (lastReport) {
      Object.keys(lastReport[VALUE.AUDIO]).forEach((ssrc) => {
        const ssrcAudio = lastReport[VALUE.AUDIO][ssrc];
        ssrcExporter[ssrcAudio.ssrc] = {
          type: VALUE.AUDIO,
          direction: ssrcAudio.direction,
        };
        if (ssrcAudio.direction === DIRECTION.INBOUND) {
          const jitter = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_in",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_in",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_in",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_in",
              ssrc,
            ),
            _unit: {
              avg: "ms",
              min: "ms",
              max: "ms",
              volatility: "percent",
            },
          };
          const bitrate = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_in",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_in",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_in",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_in",
              ssrc,
            ),
            _unit: {
              avg: "kbs",
              min: "kbs",
              max: "kbs",
              volatility: "percent",
            },
          };
          const traffic = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_in",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_in",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_in",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_in",
              ssrc,
            ),
            _unit: {
              avg: "KB",
              min: "KB",
              max: "KB",
              volatility: "percent",
            },
          };
          const mos = {
            emodel: {
              avg: averageValuesOfReports(this._reports, VALUE.AUDIO, "mos_emodel_in", false, ssrc),
              min: minValueOfReports(this._reports, VALUE.AUDIO, "mos_emodel_in", ssrc),
              max: maxValueOfReports(this._reports, VALUE.AUDIO, "mos_emodel_in", ssrc),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.AUDIO,
                "mos_emodel_in",
                ssrc,
              ),
            },
            effective: {
              avg: averageValuesOfReports(this._reports, VALUE.AUDIO, "mos_in", false, ssrc),
              min: minValueOfReports(this._reports, VALUE.AUDIO, "mos_in", ssrc),
              max: maxValueOfReports(this._reports, VALUE.AUDIO, "mos_in", ssrc),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.AUDIO,
                "mos_in",
                ssrc,
              ),
            },
            _unit: {
              avg: "number (1-5)",
              min: "number (1-5)",
              max: "number (1-5)",
              volatility: "percent",
            },
          };
          const packetsLost = lastOfReports(
            this._reports,
            VALUE.AUDIO,
            "total_packets_lost_in",
            ssrc,
          );
          const packetsReceived = lastOfReports(
            this._reports,
            VALUE.AUDIO,
            "total_packets_in",
            ssrc,
          );
          const loss = {
            lost: packetsLost,
            avg: Math.round(
              ((packetsLost /
                (packetsLost + packetsReceived)) *
                100 || 0) * 100,
            ) / 100,
            _unit: {
              avg: "percent",
              lost: "number",
            },
          };
          ssrcExporter[ssrc].jitter = jitter;
          ssrcExporter[ssrc].mos = mos;
          ssrcExporter[ssrc].traffic = traffic;
          ssrcExporter[ssrc].bitrate = bitrate;
          ssrcExporter[ssrc].loss = loss;
        } else {
          const jitter = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_out",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_out",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_out",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_jitter_ms_out",
              ssrc,
            ),
            _unit: {
              avg: "ms",
              min: "ms",
              max: "ms",
              volatility: "percent",
            },
          };
          const bitrate = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_out",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_out",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_out",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_kbs_out",
              ssrc,
            ),
            _unit: {
              avg: "kbs",
              min: "kbs",
              max: "kbs",
              volatility: "percent",
            },
          };
          const traffic = {
            avg: averageValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_out",
              false,
              ssrc,
            ),
            min: minValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_out",
              ssrc,
            ),
            max: maxValueOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_out",
              ssrc,
            ),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_KBytes_out",
              ssrc,
            ),
            _unit: {
              avg: "KB",
              min: "KB",
              max: "KB",
              bitrate: "kbs",
              volatility: "percent",
            },
          };
          const rtt = {
            avg: averageRTT(this._reports, VALUE.AUDIO, ssrc),
            min: minValueOfReports(this._reports, VALUE.AUDIO, "delta_rtt_ms_out", ssrc),
            max: maxValueOfReports(this._reports, VALUE.AUDIO, "delta_rtt_ms_out", ssrc),
            volatility: volatilityValuesOfReports(
              this._reports,
              VALUE.AUDIO,
              "delta_rtt_ms_out",
              ssrc,
            ),
            _unit: {
              avg: "ms",
              min: "ms",
              max: "ms",
              volatility: "percent",
            },
          };
          const packetsLost = lastOfReports(
            this._reports,
            VALUE.AUDIO,
            "total_packets_lost_out",
            ssrc,
          );
          const packetsReceived = lastOfReports(
            this._reports,
            VALUE.AUDIO,
            "total_packets_out",
            ssrc,
          );
          const loss = {
            lost: packetsLost,
            avg: Math.round(
              ((packetsLost /
                (packetsLost + packetsReceived)) *
                100 || 0) * 100,
            ) / 100,
            _unit: {
              avg: "percent",
              lost: "number",
            },
          };
          const mos = {
            emodel: {
              avg: averageValuesOfReports(this._reports, VALUE.AUDIO, "mos_emodel_out", false, ssrc),
              min: minValueOfReports(this._reports, VALUE.AUDIO, "mos_emodel_out", ssrc),
              max: maxValueOfReports(this._reports, VALUE.AUDIO, "mos_emodel_out", ssrc),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.AUDIO,
                "mos_emodel_out",
                ssrc,
              ),
            },
            effective: {
              avg: averageValuesOfReports(this._reports, VALUE.AUDIO, "mos_out", false, ssrc),
              min: minValueOfReports(this._reports, VALUE.AUDIO, "mos_out", ssrc),
              max: maxValueOfReports(this._reports, VALUE.AUDIO, "mos_out", ssrc),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.AUDIO,
                "mos_out",
                ssrc,
              ),
            },
            _unit: {
              avg: "number (1-5)",
              min: "number (1-5)",
              max: "number (1-5)",
              volatility: "percent",
            },
          };
          ssrcExporter[ssrc].jitter = jitter;
          ssrcExporter[ssrc].rtt = rtt;
          ssrcExporter[ssrc].traffic = traffic;
          ssrcExporter[ssrc].bitrate = bitrate;
          ssrcExporter[ssrc].loss = loss;
          ssrcExporter[ssrc].mos = mos;
        }
      });
      Object.keys(lastReport[VALUE.VIDEO])
        .forEach((ssrc) => {
          const ssrcVideo = lastReport[VALUE.VIDEO][ssrc];
          ssrcExporter[ssrc] = {
            type: VALUE.VIDEO,
            direction: ssrcVideo.direction,
          };
          if (ssrcVideo.direction === DIRECTION.INBOUND) {
            const jitter = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_in",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_in",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_in",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_in",
                ssrc,
              ),
              _unit: {
                avg: "ms",
                min: "ms",
                max: "ms",
                volatility: "percent",
              },
            };
            const bitrate = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_in",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_in",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_in",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_in",
                ssrc,
              ),
              _unit: {
                avg: "kbs",
                min: "kbs",
                max: "kbs",
                volatility: "percent",
              },
            };
            const traffic = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_in",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_in",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_in",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_in",
                ssrc,
              ),
              _unit: {
                avg: "KB",
                min: "KB",
                max: "KB",
                volatility: "percent",
              },
            };
            const packetsLost = lastOfReports(
              this._reports,
              VALUE.VIDEO,
              "total_packets_lost_in",
              ssrc,
            );
            const packetsReceived = lastOfReports(
              this._reports,
              VALUE.VIDEO,
              "total_packets_in",
              ssrc,
            );
            const loss = {
              lost: packetsLost,
              avg: Math.round(
                ((packetsLost /
                    (packetsLost + packetsReceived)) *
                  100 || 0) * 100,
              ) / 100,
              _unit: {
                avg: "percent",
                lost: "number",
              },
            };
            ssrcExporter[ssrc].jitter = jitter;
            ssrcExporter[ssrc].traffic = traffic;
            ssrcExporter[ssrc].bitrate = bitrate;
            ssrcExporter[ssrc].loss = loss;
          } else {
            const jitter = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_out",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_out",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_out",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_jitter_ms_out",
                ssrc,
              ),
              _unit: {
                avg: "ms",
                min: "ms",
                max: "ms",
                volatility: "percent",
              },
            };
            const bitrate = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_out",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_out",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_out",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_kbs_out",
                ssrc,
              ),
              _unit: {
                avg: "kbs",
                min: "kbs",
                max: "kbs",
                volatility: "percent",
              },
            };
            const traffic = {
              avg: averageValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_out",
                false,
                ssrc,
              ),
              min: minValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_out",
                ssrc,
              ),
              max: maxValueOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_out",
                ssrc,
              ),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_KBytes_out",
                ssrc,
              ),
              _unit: {
                avg: "KB",
                min: "KB",
                max: "KB",
                volatility: "percent",
              },
            };
            const rtt = {
              avg: averageRTT(this._reports, VALUE.VIDEO, ssrc),
              min: minValueOfReports(this._reports, VALUE.VIDEO, "delta_rtt_ms_out", ssrc),
              max: maxValueOfReports(this._reports, VALUE.VIDEO, "delta_rtt_ms_out", ssrc),
              volatility: volatilityValuesOfReports(
                this._reports,
                VALUE.VIDEO,
                "delta_rtt_ms_out",
                ssrc,
              ),
              _unit: {
                avg: "ms",
                min: "ms",
                max: "ms",
                volatility: "percent",
              },
            };
            const packetsLost = lastOfReports(
              this._reports,
              VALUE.VIDEO,
              "total_packets_lost_out",
              ssrc,
            );
            const packetsReceived = lastOfReports(
              this._reports,
              VALUE.VIDEO,
              "total_packets_out",
              ssrc,
            );
            const loss = {
              lost: packetsLost,
              avg: Math.round(
                ((packetsLost /
                    (packetsLost + packetsReceived)) *
                  100 || 0) * 100,
              ) / 100,
              _unit: {
                avg: "percent",
                lost: "number",
              },
            };
            ssrcExporter[ssrc].jitter = jitter;
            ssrcExporter[ssrc].rtt = rtt;
            ssrcExporter[ssrc].traffic = traffic;
            ssrcExporter[ssrc].bitrate = bitrate;
            ssrcExporter[ssrc].loss = loss;
          }
        });
    }

    return {
      version: VERSION_EXPORTER,
      configuration: {
        frequency: this._cfg.refreshEvery,
      },
      started: this._start,
      ended: this._end,
      ua: {
        agent: navigator.userAgent,
        pname: this._cfg.pname,
        user_id: this._cfg.uid,
      },
      call: {
        call_id: this._cfg.cid,
        events: this._events,
      },
      details: {
        count: this._reports.length,
        reports: this._cfg.record ? this._reports : [],
        reference: this._referenceReport || null,
      },
      ssrc: ssrcExporter,
      data: {
        rtt: {
          avg: averageRTTConnectivity(this._reports, "data"),
          min: minValueOfReports(
            this._reports,
            "data",
            "delta_rtt_connectivity_ms",
          ),
          max: maxValueOfReports(
            this._reports,
            "data",
            "delta_rtt_connectivity_ms",
          ),
          volatility: volatilityValuesOfReports(
            this._reports,
            "data",
            "delta_rtt_connectivity_ms",
          ),
          _unit: {
            avg: "ms",
            min: "ms",
            max: "ms",
            volatility: "percent",
          },
        },
        packetsLost: {
          audio: {
            in: {
              avg:
                Math.round(
                  ((audioPacketsLost /
                    (audioPacketsLost + audioPacketsReceived)) *
                    100 || 0) * 100,
                ) / 100,
            },
          },
          video: {
            in: {
              avg:
                Math.round(
                  ((videoPacketsLost /
                    (videoPacketsLost + videoPacketsReceived)) *
                    100 || 0) * 100,
                ) / 100,
            },
          },
          unit: {
            avg: "percent",
          },
        },
        bitrate: {
          in: {
            avg: averageValuesOfReports(this._reports, "data", "delta_kbs_in"),
            min: minValueOfReports(this._reports, "data", "delta_kbs_in"),
            max: maxValueOfReports(this._reports, "data", "delta_kbs_in"),
            volatility: volatilityValuesOfReports(
              this._reports,
              "data",
              "delta_kbs_in",
            ),
          },
          out: {
            avg: averageValuesOfReports(this._reports, "data", "delta_kbs_out"),
            min: minValueOfReports(this._reports, "data", "delta_kbs_out"),
            max: maxValueOfReports(this._reports, "data", "delta_kbs_out"),
            volatility: volatilityValuesOfReports(
              this._reports,
              "data",
              "delta_kbs_out",
            ),
          },
          unit: {
            avg: "kbs",
            min: "kbs",
            max: "kbs",
            volatility: "percent",
          },
        },
        traffic: {
          in: {
            avg: averageValuesOfReports(this._reports, "data", "delta_KBytes_in"),
            min: minValueOfReports(this._reports, "data", "delta_KBytes_in"),
            max: maxValueOfReports(this._reports, "data", "delta_KBytes_in"),
            volatility: volatilityValuesOfReports(
              this._reports,
              "data",
              "delta_KBytes_in",
            ),
          },
          out: {
            avg: averageValuesOfReports(
              this._reports,
              "data",
              "delta_KBytes_out",
            ),
            min: minValueOfReports(this._reports, "data", "delta_KBytes_out"),
            max: maxValueOfReports(this._reports, "data", "delta_KBytes_out"),
            volatility: volatilityValuesOfReports(
              this._reports,
              "data",
              "delta_KBytes_out",
            ),
          },
          unit: {
            avg: "KBytes",
            min: "KBytes",
            max: "KBytes",
            volatility: "percent",
          },
        },
        network: {
          localConnection: getPath(this._reports),
          remoteConnection: getRemotePath(this._reports),
        },
      },
    };
  }

  updateConfig(config) {
    this._cfg = config;
  }

  getLastReport() {
    return this._reports.slice().pop() || null;
  }

  getBeforeLastReport() {
    const duplicated = this._reports.slice();
    duplicated.pop();
    return duplicated.pop() || null;
  }

  getReportsNumber() {
    return this._reports.length;
  }
}
