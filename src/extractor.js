import {
  PROPERTY,
  INFRASTRUCTURE_VALUE,
  STAT_TYPE,
  INFRASTRUCTURE_LABEL,
  TYPE, VALUE,
} from "./utils/helper";

/* Globals */
const maxValues = 3;

/* Round trip time */
let lastThreeRtt = [0, 0, 0];
let rttIndex = 0;

/* Packets lost */
let previousAudioPacketReceived = 0;
let previousAudioPacketLost = 0;

/* Jitter */
let lastThreeJitter = [0, 0, 0];
let jitterIndex = 0;

/* Candidate */
let localCandidateId = null;
let remoteCandidateId = null;

/* Codecs */
let audioInputCodecId = null;
let videoInputCodecId = null;
let audioOutputCodecId = null;
let videoOutputCodecId = null;

/* Total Bytes Sent/received */
let previousTotalBytesReceived = 0;
let previousTotalBytesSent = 0;
let previousTimestampForBytes = Date.now();

let previousAudioTotalBytesReceived = 0;
let previousAudioTotalBytesSent = 0;
let previousVideoTotalBytesReceived = 0;
let previousVideoTotalBytesSent = 0;

const extractRoundTripTime = (bunch, rtt, max, index) => {
  const newRTT = [...rtt];

  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.CURRENT_ROUND_TRIP_TIME)) {
    return rtt;
  }

  newRTT[index % max] = Number(1000) * (Number(bunch[PROPERTY.CURRENT_ROUND_TRIP_TIME]) || 0);
  return newRTT;
};

const extractJitter = (bunch, jitter, max, index) => {
  const newJitter = [...jitter];

  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.JITTER)) {
    return jitter;
  }

  newJitter[index % max] = Number(1000) * (Number(bunch[PROPERTY.JITTER]) || 0);
  return newJitter;
};

const extractAudioPacketReceived = (bunch, previousPacketsReceived, previousPacketsLost) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: 0.0, packetsReceived: previousPacketsReceived, packetsLost: previousPacketsLost };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0;
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0;

  if (packetsReceived === previousPacketsReceived) {
    return { percent_packets_lost: 0.0, packetsReceived: previousPacketsReceived, packetsLost: previousPacketsLost };
  }

  const percentPacketsLost = ((packetsLost - previousPacketsLost) * 100) / (packetsReceived - previousPacketsReceived);

  return { percent_packets_lost: percentPacketsLost, packetsReceived, packetsLost };
};

const extractInfrastructureValue = (bunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NETWORK_TYPE)) {
    // Assuming Wifi when not provided (firefox/Safari at this time)
    return INFRASTRUCTURE_VALUE.WIFI;
  }

  switch (bunch[PROPERTY.NETWORK_TYPE]) {
    case INFRASTRUCTURE_LABEL.ETHERNET:
      return INFRASTRUCTURE_VALUE.ETHERNET;
    case INFRASTRUCTURE_LABEL.CELLULAR_4G:
      return INFRASTRUCTURE_VALUE.CELLULAR_4G;
    case INFRASTRUCTURE_LABEL.WIFI:
      return INFRASTRUCTURE_VALUE.WIFI;
    default:
      return INFRASTRUCTURE_VALUE.CELLULAR;
  }
};

const extractAudioLevel = (bunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.AUDIO_LEVEL)) {
    return null;
  }

  return bunch[PROPERTY.AUDIO_LEVEL];
};

const extractVideoSize = (bunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAME_HEIGHT) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAME_WIDTH)) {
    return { width: null, height: null };
  }

  return { width: bunch[PROPERTY.FRAME_WIDTH] || null, height: bunch[PROPERTY.FRAME_HEIGHT] || null };
};

const extractAudioCodec = (bunch) => (
  {
    channels: bunch[PROPERTY.CHANNELS] || null,
    clock_rate: bunch[PROPERTY.CLOCK_RATE] || null,
    mime_type: bunch[PROPERTY.MIME_TYPE] || null,
    sdp_fmtp_line: bunch[PROPERTY.SDP_FMTP_LINE] || null,
  });

const extractVideoCodec = (bunch) => ({
  clock_rate: bunch[PROPERTY.CLOCK_RATE] || null,
  mime_type: bunch[PROPERTY.MIME_TYPE] || null,
});

const extractBytesSentReceived = (bunch) => {
  const totalBytesReceived = bunch[PROPERTY.BYTES_RECEIVED] || 0;
  const totalBytesSent = bunch[PROPERTY.BYTES_SENT] || 0;
  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();

  const bytesReceived = totalBytesReceived - previousTotalBytesReceived;
  const bytesSent = totalBytesSent - previousTotalBytesSent;
  const deltaMs = timestamp - previousTimestampForBytes;
  const kbsSpeedReceived = ((bytesReceived / 1024) / deltaMs) * 1000;
  const kbsSpeedSent = ((bytesSent / 1024) / deltaMs) * 1000;

  previousTotalBytesReceived = totalBytesReceived;
  previousTotalBytesSent = totalBytesSent;
  previousTimestampForBytes = timestamp;

  return {
    total_bytes_received: totalBytesReceived,
    total_bytes_sent: totalBytesSent,
    delta_bytes_received: bytesReceived,
    delta_bytes_sent: bytesSent,
    kbs_speed_received: kbsSpeedReceived,
    kbs_speed_sent: kbsSpeedSent,
  };
};

export const extract = (bunch) => {
  if (!bunch) {
    return [];
  }

  switch (bunch[PROPERTY.TYPE]) {
    case TYPE.CANDIDATE_PAIR:
      if (bunch[PROPERTY.WRITABLE] && bunch[PROPERTY.NOMINATED] && bunch[PROPERTY.STATE] === VALUE.SUCCEEDED) {
        localCandidateId = bunch[PROPERTY.LOCAL_CANDIDATE_ID];
        remoteCandidateId = bunch[PROPERTY.REMOTE_CANDIDATE_ID];

        const valueSentReceived = extractBytesSentReceived(bunch);

        const newRtt = extractRoundTripTime(bunch, lastThreeRtt, maxValues, rttIndex);
        if (lastThreeRtt !== newRtt) {
          lastThreeRtt = newRtt;
          rttIndex += 1;
        }
        return [
          { type: STAT_TYPE.DATA, value: { last_three_rtt: lastThreeRtt } },
          { type: STAT_TYPE.DATA, value: { total_bytes_received: valueSentReceived.total_bytes_received } },
          { type: STAT_TYPE.DATA, value: { total_bytes_sent: valueSentReceived.total_bytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_bytes_received: valueSentReceived.delta_bytes_received } },
          { type: STAT_TYPE.DATA, value: { delta_bytes_sent: valueSentReceived.delta_bytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_received: valueSentReceived.kbs_speed_received } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_sent: valueSentReceived.kbs_speed_sent } },
        ];
      }
      break;
    case TYPE.LOCAL_CANDIDATE:
      if (bunch[PROPERTY.ID] === localCandidateId) {
        return [
          { type: STAT_TYPE.NETWORK, value: { infrastructure: extractInfrastructureValue(bunch) } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "" } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" } },
        ];
      }
      break;
    case TYPE.REMOTE_CANDIDATE:
      if (bunch[PROPERTY.ID] === remoteCandidateId) {
        return [
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "" } },
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" } },
        ];
      }
      break;
    case TYPE.INBOUND_RTP:
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        const data = extractAudioPacketReceived(bunch, previousAudioPacketReceived, previousAudioPacketLost);

        const audioPacketReceivedDelta = data.packetsReceived - previousAudioPacketReceived;
        const audioPacketLostDelta = data.packetsLost - previousAudioPacketLost;
        previousAudioPacketReceived = data.packetsReceived;
        previousAudioPacketLost = data.packetsLost;

        const newJitter = extractJitter(bunch, lastThreeJitter, maxValues, jitterIndex);
        if (lastThreeJitter !== newJitter) {
          lastThreeJitter = newJitter;
          jitterIndex += 1;
        }

        const audioTotalBytesReceived = bunch[PROPERTY.BYTES_RECEIVED] || 0;
        const audioBytesReceived = audioTotalBytesReceived - previousAudioTotalBytesReceived;
        previousAudioTotalBytesReceived = audioTotalBytesReceived;

        audioInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.AUDIO, value: { percent_packets_lost: data.percent_packets_lost } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_received: data.packetsReceived } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_lost: data.packetsLost } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_received: audioPacketReceivedDelta } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_lost: audioPacketLostDelta } },
          { type: STAT_TYPE.AUDIO, value: { last_three_jitter: lastThreeJitter } },
          { type: STAT_TYPE.AUDIO, value: { total_bytes_received: audioTotalBytesReceived } },
          { type: STAT_TYPE.AUDIO, value: { delta_bytes_received: audioBytesReceived } },
        ];
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        const videoTotalBytesReceived = bunch[PROPERTY.BYTES_RECEIVED] || 0;
        const videoBytesReceived = videoTotalBytesReceived - previousVideoTotalBytesReceived;
        previousVideoTotalBytesReceived = videoTotalBytesReceived;

        videoInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.VIDEO, value: { total_bytes_received: videoTotalBytesReceived } },
          { type: STAT_TYPE.VIDEO, value: { delta_bytes_received: videoBytesReceived } },
        ];
      }
      break;
    case TYPE.OUTBOUND_RTP:
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        const audioTotalBytesSent = bunch[PROPERTY.BYTES_SENT] || 0;
        const audioBytesSent = audioTotalBytesSent - previousAudioTotalBytesSent;
        previousAudioTotalBytesSent = audioTotalBytesSent;

        audioOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.AUDIO, value: { total_bytes_sent: audioTotalBytesSent } },
          { type: STAT_TYPE.AUDIO, value: { delta_bytes_sent: audioBytesSent } },
        ];
      }
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        const videoTotalBytesSent = bunch[PROPERTY.BYTES_SENT] || 0;
        const videoBytesSent = videoTotalBytesSent - previousVideoTotalBytesSent;
        previousVideoTotalBytesSent = videoTotalBytesSent;

        videoOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.VIDEO, value: { total_bytes_sent: videoTotalBytesSent } },
          { type: STAT_TYPE.VIDEO, value: { delta_bytes_sent: videoBytesSent } },
        ];
      }
      break;
    case TYPE.MEDIA_SOURCE:
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const outputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { output_level: outputLevel } }];
      }
      break;
    case TYPE.TRACK:
      if (bunch[PROPERTY.REMOTE_SOURCE] === true && bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const inputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { input_level: inputLevel } }];
      }

      if (bunch[PROPERTY.REMOTE_SOURCE] === true && bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        const inputSize = extractVideoSize(bunch);
        return [{ type: STAT_TYPE.VIDEO, value: { input_size: inputSize } }];
      }

      if (bunch[PROPERTY.REMOTE_SOURCE] === false && bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        const outputSize = extractVideoSize(bunch);
        return [{ type: STAT_TYPE.VIDEO, value: { output_size: outputSize } }];
      }
      break;
    case TYPE.CODEC:
      if (bunch[PROPERTY.ID] === audioInputCodecId || bunch[PROPERTY.ID] === audioOutputCodecId) {
        const codec = extractAudioCodec(bunch);

        if (bunch[PROPERTY.ID] === audioInputCodecId) {
          return [{ type: STAT_TYPE.AUDIO, value: { input_codec: codec } }];
        }
        return [{ type: STAT_TYPE.AUDIO, value: { output_codec: codec } }];
      }

      if (bunch[PROPERTY.ID] === videoInputCodecId || bunch[PROPERTY.ID] === videoOutputCodecId) {
        const codec = extractVideoCodec(bunch);

        if (bunch[PROPERTY.ID] === videoInputCodecId) {
          return [{ type: STAT_TYPE.VIDEO, value: { input_codec: codec } }];
        }
        return [{ type: STAT_TYPE.VIDEO, value: { output_codec: codec } }];
      }
      break;
    default:
      break;
  }

  // No interesting data
  return [];
};

export const computeMos = (report) => {
  const average = (nums) => (nums.reduce((a, b) => (a + b)) / nums.length);
  const rtt = average(report.data.last_three_rtt);
  const jitter = average(report.audio.last_three_jitter);
  const rx = 93.2 - report.audio.percent_packets_lost;
  const ry = 0.18 * rx * rx - 27.9 * rx + 1126.62;

  const d = rtt + jitter;
  const h = d - 177.3 < 0 ? 0 : 1;

  const id = 0.024 * d + 0.11 * (d - 177.3) * h;

  const a = report.network.infrastructure;

  const r = ry - (id + a);

  if (r < 0) {
    return 1;
  }

  if (r > 100) {
    return 4.5;
  }

  return (1 + (0.035 * r) + (7.0 / 1000000) * r * (r - 60) * (100 - r));
};
