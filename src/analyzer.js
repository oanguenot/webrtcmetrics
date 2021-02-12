import { computeMos, extract } from "./extractor";
import { debug, error } from "./utils/log";

const moduleName = "analyzer    ";

export default class Analyzer {
  constructor(pc) {
    this._callbacks = {
      onmetrics: null,
    };

    this._pc = pc;
    this._intervalId = null;
  }

  analyze(reports) {
    let metrics = {
      audio: {
        input_level: null,
        output_level: null,
        input_codec: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
        output_codec: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
        last_three_jitter: [],
        last_three_rtt: [],
        percent_packets_lost: null,
        total_packets_received: 0,
        total_packets_lost: 0,
        delta_packets_received: 0,
        delta_packets_lost: 0,
        mos: null,
      },
      video: {
        input_size: { width: null, height: null },
        output_size: { width: null, height: null },
        input_codec: { mime_type: null, clock_rate: null },
        output_codec: { mime_type: null, clock_rate: null },
      },
      network: {
        infrastructure: null,
      }
    }
    reports.forEach(report => {
      let values = extract(report);
      values.forEach(data => {
        if (data.value && data.type) {
          Object.keys(data.value).forEach(key => {
            metrics[data.type][key] = data.value[key]
          });
        }
      })
    });

    console.log(">>>metrics", metrics)

    const mos = computeMos(metrics);
    metrics.audio.mos = mos;
    return metrics;
  }

  async start() {

    const getStats = async () => {
      if (!this._pc) {
        return;
      }
      try {
        const reports = await this._pc.getStats();
        debug(moduleName, `getstats() - analyze in progress...`);

        const metrics = this.analyze(reports)

        this.fireOnMetrics(metrics);
      } catch (err) {
        error(moduleName, `getStats() - error ${err}`)
      }
    }

    if (this._intervalId) {
      debug(moduleName, `start() - clear analyzer with id ${this._intervalId}`);
      clearInterval(this._intervalId);
    }

    debug(moduleName, `start() - start analyzing...`);
    this._intervalId = setInterval(() => {
      getStats();
    }, 10000);
  }

  stop() {
    if (!this._intervalId) {
      return;
    }

    clearInterval(this._intervalId);
  }

  registerCallback(name, callback) {
    if (name in this._callbacks) {
      this._callbacks[name] = callback;
      debug(moduleName, `registered callback '${name}'`);
    } else {
      error(moduleName, `can't register callback for '${name}'`);
    }
  }

  fireOnMetrics(stats) {
    if (this._callbacks.onmetrics) {

      this._callbacks.onmetrics(stats);
    }
  }
}