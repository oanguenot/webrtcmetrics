
const TYPE = {
  CANDIDATE_PAIR: "candidate-pair",
  INBOUND_RTP: "inbound-rtp",
  OUTBOUND_RTP: "outbound-rtp",
  TRACK: "track",
  LOCAL_CANDIDATE: "local-candidate",
  MEDIA_SOURCE: "media-source",
  CODEC: "codec"
}

const PROPERTY = {
  TYPE: "type",
  CURRENT_ROUND_TRIP_TIME: "currentRoundTripTime",
  WRITABLE: "writable",
  NOMINATED: "nominated",
  STATE: "state",
  PACKETS_RECEIVED: "packetsReceived",
  PACKETS_LOST: "packetsLost",
  MEDIATYPE: "mediaType",
  JITTER: "jitter",
  REMOTE_SOURCE: "remoteSource",
  KIND: "kind",
  LOCAL_CANDIDATE_ID: "localCandidateId",
  ID: "id",
  NETWORK_TYPE: "networkType",
  AUDIO_LEVEL: "audioLevel",
  FRAME_WIDTH: "frameWidth",
  FRAME_HEIGHT: "frameHeight",
  CODEC_ID: "codecId",
  CHANNELS: "channels",
  CLOCK_RATE: "clockRate",
  MIME_TYPE: "mimeType",
  SDP_FMTP_LINE: "sdpFmtpLine"
}

const VALUE = {
  SUCCEEDED: "succeeded",
  AUDIO: "audio",
  VIDEO: "video"
}

const INFRASTRUCTURE_VALUE = {
  ETHERNET: 0,
  CELLULAR_5G: 2,
  WIFI: 3,
  CELLULAR_4G: 5,
  CELLULAR: 10,
}

const INFRASTRUCTURE_LABEL = {
  ETHERNET: "ethernet",
  CELLULAR_4G: "cellular",
  WIFI: "wifi"
}

const STAT_TYPE = {
  AUDIO: "audio",
  VIDEO: "video",
  NETWORK: "network"
}

/* Globals */
const max_values = 3;

/* Round trip time */
let last_three_rtt = [0, 0, 0];
let rtt_index = 0;

/* Packets lost */
let previousAudioPacketReceived = 0;
let previousAudioPacketLost = 0;

/* Jitter */
let last_three_jitter = [0, 0, 0];
let jitter_index = 0;

/* Candidate */
let local_candidate_id = null;

/* Codecs */
let audioInputCodecId = null;
let videoInputCodecId = null;
let audioOutputCodecId = null;
let videoOutputCodecId = null;

export const extract = (bunch) => {

  if (!bunch) {
    return [];
  }

  switch (bunch[PROPERTY.TYPE]) {
    case TYPE.CANDIDATE_PAIR:
      if (bunch[PROPERTY.WRITABLE] && bunch[PROPERTY.NOMINATED] && bunch[PROPERTY.STATE] === VALUE.SUCCEEDED) {
        local_candidate_id = bunch[PROPERTY.LOCAL_CANDIDATE_ID];

        const new_rtt = extractRoundTripTime(bunch, last_three_rtt, max_values, rtt_index)
        if (last_three_rtt !== new_rtt) {
          last_three_rtt = new_rtt;
          rtt_index++;
        }
        return [{ type: "audio", value: { last_three_rtt } }];
      }
      break;
    case TYPE.LOCAL_CANDIDATE:
      if (bunch[PROPERTY.ID] === local_candidate_id) {
        return [{ type: "network", value: { infrastructure: extractInfrastructureValue(bunch) } }]
      }
      break;
    case TYPE.INBOUND_RTP:
      if (bunch[PROPERTY.MEDIATYPE] === VALUE.AUDIO) {
        const data = extractAudioPacketReceived(bunch, previousAudioPacketReceived, previousAudioPacketLost)

        const audioPacketReceivedDelta = data.packetsReceived - previousAudioPacketReceived;
        const audioPacketLostDelta = data.packetsLost - previousAudioPacketLost;
        previousAudioPacketReceived = data.packetsReceived;
        previousAudioPacketLost = data.packetsLost;

        const new_jitter = extractJitter(bunch, last_three_jitter, max_values, jitter_index)
        if (last_three_jitter !== new_jitter) {
          last_three_jitter = new_jitter;
          jitter_index++;
        }

        audioInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: "audio", value: { percent_packets_lost: data.percent_packets_lost } },
          { type: "audio", value: { total_packets_received: data.packetsReceived } },
          { type: "audio", value: { total_packets_lost: data.packetsLost } },
          { type: "audio", value: { delta_packets_received: audioPacketReceivedDelta } },
          { type: "audio", value: { delta_packets_lost: audioPacketLostDelta } },
          { type: "audio", value: { last_three_jitter } }
        ]
      }

      if (bunch[PROPERTY.MEDIATYPE] === VALUE.VIDEO) {
        videoInputCodecId = bunch[PROPERTY.CODEC_ID] || null;
      }
      break;
    case TYPE.OUTBOUND_RTP:
      if (bunch[PROPERTY.MEDIATYPE] === VALUE.AUDIO) {
        audioOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;
      }
      if (bunch[PROPERTY.MEDIATYPE] === VALUE.VIDEO) {
        videoOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;
      }
      break;
    case TYPE.MEDIA_SOURCE:
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const output_level = extractAudioLevel(bunch);
        return [{ type: "audio", value: { output_level } }]
      }
      break;
    case TYPE.TRACK:
      if (bunch[PROPERTY.REMOTE_SOURCE] === true && bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const input_level = extractAudioLevel(bunch);
        return [{ type: "audio", value: { input_level } }]
      }

      if (bunch[PROPERTY.REMOTE_SOURCE] === true && bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        const input_size = extractVideoSize(bunch);
        return [{ type: "video", value: { input_size } }]
      }

      if (bunch[PROPERTY.REMOTE_SOURCE] === false && bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        const output_size = extractVideoSize(bunch);
        return [{ type: "video", value: { output_size } }]
      }
      break;
    case TYPE.CODEC:
      if (bunch[PROPERTY.ID] === audioInputCodecId || bunch[PROPERTY.ID] === audioOutputCodecId) {

        const codec = extractAudioCodec(bunch);

        if (bunch[PROPERTY.ID] === audioInputCodecId) {
          return [{ type: "audio", value: { input_codec: codec } }]
        }
        return [{ type: "audio", value: { output_codec: codec } }]
      }

      if (bunch[PROPERTY.ID] === videoInputCodecId || bunch[PROPERTY.ID] === videoOutputCodecId) {

        const codec = extractVideoCodec(bunch);

        if (bunch[PROPERTY.ID] === videoInputCodecId) {
          return [{ type: "audio", value: { input_codec: codec } }]
        }
        return [{ type: "audio", value: { output_codec: codec } }]
      }

      break;
    default:
      break;
  }

  // No interesting data
  return []
}

const extractRoundTripTime = (bunch, rtt, max, index) => {

  let newRTT = [...rtt];

  if (!bunch.hasOwnProperty(PROPERTY.CURRENT_ROUND_TRIP_TIME)) {
    return rtt;
  }

  newRTT[index % max] = Number(1000) * (Number(bunch[PROPERTY.CURRENT_ROUND_TRIP_TIME]) || 0)
  return newRTT;
}

const extractJitter = (bunch, jitter, max, index) => {
  let newJitter = [...jitter];

  if (!bunch.hasOwnProperty(PROPERTY.JITTER)) {
    return jitter;
  }

  newJitter[index % max] = Number(1000) * (Number(bunch[PROPERTY.JITTER]) || 0)
  return newJitter;
}

const extractAudioPacketReceived = (bunch, previousPacketsReceived, previousPacketsLost) => {
  if (!bunch.hasOwnProperty(PROPERTY.PACKETS_RECEIVED) || !bunch.hasOwnProperty(PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: 0.0, packetsReceived: previousPacketsReceived, packetsLost: previousPacketsLost };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0;
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0;

  if (packetsReceived === previousPacketsReceived) {
    return { percent_packets_lost: 0.0, packetsReceived: previousPacketsReceived, packetsLost: previousPacketsLost };
  }

  const percent_packets_lost = ((packetsLost - previousPacketsLost) * 100) / (packetsReceived - previousPacketsReceived);

  return { percent_packets_lost, packetsReceived, packetsLost };
}

const extractInfrastructureValue = (bunch) => {

  if (!bunch.hasOwnProperty(PROPERTY.NETWORK_TYPE)) {
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
}

const extractAudioLevel = (bunch) => {
  if (!bunch.hasOwnProperty(PROPERTY.AUDIO_LEVEL)) {
    return null;
  }

  return bunch[PROPERTY.AUDIO_LEVEL];
}

const extractVideoSize = (bunch) => {
  if (!bunch.hasOwnProperty(PROPERTY.FRAME_HEIGHT) || !bunch.hasOwnProperty(PROPERTY.FRAME_WIDTH)) {
    return { width: null, height: null };
  }

  return { width: bunch[PROPERTY.FRAME_WIDTH] || null, height: bunch[PROPERTY.FRAME_HEIGHT] || null };
}

const extractAudioCodec = (bunch) => {
  return {
    channels: bunch[PROPERTY.CHANNELS] || null,
    clock_rate: bunch[PROPERTY.CLOCK_RATE] || null,
    mime_type: bunch[PROPERTY.MIME_TYPE] || null,
    sdp_fmtp_line: bunch[PROPERTY.SDP_FMTP_LINE] || null
  };
}

const extractVideoCodec = (bunch) => {
  return {
    clock_rate: bunch[PROPERTY.CLOCK_RATE] || null,
    mime_type: bunch[PROPERTY.MIME_TYPE] || null,
  };
}

export const computeMos = (report) => {
  const average = (nums) => (nums.reduce((a, b) => (a + b)) / nums.length);
  const rtt = average(report.audio.last_three_rtt);
  const jitter = average(report.audio.last_three_jitter);
  const rx = 93.2 - report.audio.percent_packets_lost;
  const ry = 0.18 * rx * rx - 27.9 * rx + 1126.62;

  const d = rtt + jitter;
  const h = d - 177.3 < 0 ? 0 : 1;

  const id = 0.024 * d + 0.11 * (d - 177.3) * h;

  // infrastructure: wifi by default
  const a = report.network.infrastructure || 3;

  const r = ry - (id + a);

  if (r < 0) {
    return 1;
  }

  if (r > 100) {
    return 4.5;
  }

  return (1 + 0.035 * r + 7.0 / 1000000 * r * (r - 60) * (100 - r));
}