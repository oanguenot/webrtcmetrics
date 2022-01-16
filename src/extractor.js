import {
  PROPERTY,
  INFRASTRUCTURE_VALUE,
  STAT_TYPE,
  INFRASTRUCTURE_LABEL,
  TYPE, VALUE,
} from "./utils/models";

import { average } from "./utils/helper";

import { debug } from "./utils/log";

const moduleName = "extractor   ";

const computeScore = (r) => {
  if (r < 0) {
    return 1;
  }

  if (r > 100) {
    return 4.5;
  }

  return (1 + (0.035 * r) + (7.0 / 1000000) * r * (r - 60) * (100 - r));
};

const extractRTTBasedOnRTCP = (bunch, kind, referenceReport, previousBunch) => {
  // If RTT is not part of the stat - return previous value
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.ROUND_TRIP_TIME)) {
    return {
      rtt: null,
      totalRTT: previousBunch[kind].total_rtt_ms,
      totalRTTMeasurements: previousBunch[kind].total_rtt_measure,
    };
  }

  let currentRTT = Number(1000) * Number(bunch[PROPERTY.ROUND_TRIP_TIME]);
  let currentTotalRTT = (Number(1000) * Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME]) - (referenceReport ? referenceReport[kind].total_rtt_ms : 0)) || null;
  let currentTotalMeasurements = (Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) - (referenceReport ? referenceReport[kind].total_rtt_measure : 0)) || null;

  // If total round trip time measurements is not supported yet)
  if (!currentTotalMeasurements) {
    currentTotalRTT = (previousBunch[kind].total_rtt_ms || 0) + currentRTT;
    currentTotalMeasurements += 1;
  }

  // Same value for measurements so no new value, return null
  if (currentTotalMeasurements && currentTotalMeasurements === previousBunch[kind].total_rtt_measure) {
    currentRTT = null;
  }

  return {
    rtt: currentRTT,
    totalRTT: currentTotalRTT,
    totalRTTMeasurements: currentTotalMeasurements,
  };
};

const extractLastJitter = (bunch, previousBunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.JITTER)) {
    return previousBunch.audio.delta_jitter_ms;
  }
  return Number(1000) * (Number(bunch[PROPERTY.JITTER]) || 0);
};

const extractDecodeTime = (bunch, previousBunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_DECODED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_DECODE_TIME)) {
    return { delta_ms_decode_frame: previousBunch.video.delta_ms_decode_frame, frames_decoded: previousBunch.video.total_frames_decoded, total_decode_time: previousBunch.video.total_time_decoded };
  }

  const decodedFrames = bunch[PROPERTY.FRAMES_DECODED];
  const totalDecodeTime = bunch[PROPERTY.TOTAL_DECODE_TIME];

  const decodeTimeDelta = totalDecodeTime - previousBunch.video.total_time_decoded;
  const frameDelta = decodedFrames - previousBunch.video.total_frames_decoded;

  return { delta_ms_decode_frame: frameDelta > 0 ? (decodeTimeDelta * 1000) / frameDelta : 0, frames_decoded: decodedFrames, total_decode_time: totalDecodeTime };
};

const extractEncodeTime = (bunch, previousBunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_ENCODED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ENCODE_TIME)) {
    return { delta_ms_encode_frame: previousBunch.video.delta_ms_encode_frame, frames_encoded: previousBunch.video.total_frames_encoded, total_encode_time: previousBunch.video.total_time_encoded };
  }

  const encodedFrames = bunch[PROPERTY.FRAMES_ENCODED];
  const totalEncodeTime = bunch[PROPERTY.TOTAL_ENCODE_TIME];

  const encodeTimeDelta = totalEncodeTime - previousBunch.video.total_time_encoded;
  const frameDelta = encodedFrames - previousBunch.video.total_frames_encoded;
  const framesEncodedDelta = (frameDelta > 0 && encodeTimeDelta) ? (encodeTimeDelta * 1000) / frameDelta : 0;

  return { delta_ms_encode_frame: framesEncodedDelta, frames_encoded: encodedFrames, total_encode_time: totalEncodeTime };
};

const extractAudioPacketReceived = (bunch, previousBunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: previousBunch.audio.percent_packets_lost, packetsReceived: previousBunch.audio.total_packets_received, packetsLost: previousBunch.audio.total_packets_lost };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0 - (referenceReport ? referenceReport.audio.total_packets_received : 0);
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0 - (referenceReport ? referenceReport.audio.total_packets_lost : 0);
  const percentPacketsLost = (packetsReceived !== previousBunch.audio.total_packets_received) ? ((packetsLost - previousBunch.audio.total_packets_lost) * 100) / (packetsReceived - previousBunch.audio.total_packets_received) : 0.0;

  return { percentPacketsLost, packetsReceived, packetsLost };
};

const extractVideoPacketReceived = (bunch, previousBunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: previousBunch.video.percent_packets_lost, packetsReceived: previousBunch.video.total_packets_received, packetsLost: previousBunch.video.total_packets_lost };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0 - (referenceReport ? referenceReport.video.total_packets_received : 0);
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0 - (referenceReport ? referenceReport.video.total_packets_lost : 0);
  const percentPacketsLost = (packetsReceived !== previousBunch.video.total_packets_received) ? ((packetsLost - previousBunch.video.total_packets_lost) * 100) / (packetsReceived - previousBunch.video.total_packets_received) : 0.0;

  return { percentPacketsLost, packetsReceived, packetsLost };
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
    return { width: null, height: null, framerate: null };
  }

  return { width: bunch[PROPERTY.FRAME_WIDTH] || null, height: bunch[PROPERTY.FRAME_HEIGHT] || null, framerate: bunch[PROPERTY.FRAMES_PER_SECOND] };
};

const extractNackAndPliCountSent = (bunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)) {
    return { pliCount: 0, nackCount: 0 };
  }

  return {
    pliCount: (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport.video.total_pli_sent : 0),
    nackCount: (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport.video.total_nack_sent : 0),
  };
};

const extractNackAndPliCountReceived = (bunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)) {
    return { pliCount: 0, nackCount: 0 };
  }

  return {
    pliCount: (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport.video.total_pli_received : 0),
    nackCount: (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport.video.total_nack_received : 0),
  };
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

const extractBytesSentReceived = (bunch, previousBunch, referenceReport) => {
  const totalKBytesReceived = (bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024 - (referenceReport ? referenceReport.data.total_KBytes_received : 0);
  const totalKBytesSent = (bunch[PROPERTY.BYTES_SENT] || 0) / 1024 - (referenceReport ? referenceReport.data.total_KBytes_sent : 0);

  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();
  const KBytesReceived = totalKBytesReceived - previousBunch.data.total_KBytes_received;
  const KBytesSent = totalKBytesSent - previousBunch.data.total_KBytes_sent;

  const referenceTimestamp = referenceReport ? referenceReport.timestamp : null;
  let previousTimestamp = previousBunch.timestamp;
  if (!previousTimestamp && referenceTimestamp) {
    previousTimestamp = referenceTimestamp;
  }
  const deltaMs = previousTimestamp ? timestamp - previousTimestamp : 0;
  const kbsSpeedReceived = deltaMs > 0 ? ((KBytesReceived * 0.008 * 1024) / deltaMs) * 1000 : 0; // kbs = kilo bits per second
  const kbsSpeedSent = deltaMs > 0 ? ((KBytesSent * 0.008 * 1024) / deltaMs) * 1000 : 0;

  return {
    total_KBytes_received: totalKBytesReceived,
    total_KBytes_sent: totalKBytesSent,
    delta_KBytes_received: KBytesReceived,
    delta_KBytes_sent: KBytesSent,
    kbs_speed_received: kbsSpeedReceived,
    kbs_speed_sent: kbsSpeedSent,
  };
};

const extractAvailableBandwidth = (bunch) => {
  const kbsIncomingBandwidth = (bunch[PROPERTY.AVAILABLE_INCOMING_BITRATE] / 1024) || 0;
  const kbsOutgoingBandwidth = (bunch[PROPERTY.AVAILABLE_OUTGOING_BITRATE] / 1024) || 0;

  return {
    kbs_incoming_bandwidth: kbsIncomingBandwidth,
    kbs_outgoing_bandwidth: kbsOutgoingBandwidth,
  };
};

export const extract = (bunch, previousBunch, pname, referenceReport) => {
  if (!bunch) {
    return [];
  }

  switch (bunch[PROPERTY.TYPE]) {
    case TYPE.CANDIDATE_PAIR:
      let selectedPair = false;
      if (bunch[PROPERTY.WRITABLE] && bunch[PROPERTY.NOMINATED] && bunch[PROPERTY.STATE] === VALUE.SUCCEEDED) {
        selectedPair = true;

        debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);

        // FF: Do not use candidate-pair with selected=false
        if (PROPERTY.SELECTED in bunch && !bunch[PROPERTY.SELECTED]) {
          selectedPair = false;
        }
      }
      if (selectedPair) {
        const localCandidateId = bunch[PROPERTY.LOCAL_CANDIDATE_ID];
        const remoteCandidateId = bunch[PROPERTY.REMOTE_CANDIDATE_ID];
        const valueSentReceived = extractBytesSentReceived(bunch, previousBunch, referenceReport);
        const bandwidth = extractAvailableBandwidth(bunch);

        return [
          { type: STAT_TYPE.NETWORK, value: { local_candidate_id: localCandidateId } },
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_id: remoteCandidateId } },
          { type: STAT_TYPE.DATA, value: { total_KBytes_received: valueSentReceived.total_KBytes_received } },
          { type: STAT_TYPE.DATA, value: { total_KBytes_sent: valueSentReceived.total_KBytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_KBytes_received: valueSentReceived.delta_KBytes_received } },
          { type: STAT_TYPE.DATA, value: { delta_KBytes_sent: valueSentReceived.delta_KBytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_received: valueSentReceived.kbs_speed_received } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_sent: valueSentReceived.kbs_speed_sent } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_incoming_bandwidth: bandwidth.kbs_incoming_bandwidth } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_outgoing_bandwidth: bandwidth.kbs_outgoing_bandwidth } },
        ];
      }
      break;
    case TYPE.LOCAL_CANDIDATE:
      if (bunch[PROPERTY.ID] === previousBunch.network.local_candidate_id) {
        return [
          { type: STAT_TYPE.NETWORK, value: { infrastructure: extractInfrastructureValue(bunch) } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "" } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" } },
        ];
      }
      break;
    case TYPE.REMOTE_CANDIDATE:
      if (bunch[PROPERTY.ID] === previousBunch.network.remote_candidate_id) {
        return [
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "" } },
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" } },
        ];
      }
      break;
    case TYPE.INBOUND_RTP:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        // Packets stats
        const data = extractAudioPacketReceived(bunch, previousBunch, referenceReport);
        const audioPacketReceivedDelta = data.packetsReceived - previousBunch.audio.total_packets_received;
        const audioPacketLostDelta = data.packetsLost - previousBunch.audio.total_packets_lost;

        // Jitter stats
        const jitter = extractLastJitter(bunch, previousBunch);

        // Bytes stats
        const audioTotalKBytesReceived = ((bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024) - (referenceReport ? referenceReport.audio.total_KBytes_received : 0);
        const audioKBytesReceived = audioTotalKBytesReceived - previousBunch.audio.total_KBytes_received;

        // Codec stats
        const audioInputCodecId = bunch[PROPERTY.CODEC_ID] || "";

        return [
          { type: STAT_TYPE.AUDIO, value: { input_codec_id: audioInputCodecId } },
          { type: STAT_TYPE.AUDIO, value: { percent_packets_lost: data.percentPacketsLost } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_received: data.packetsReceived } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_lost: data.packetsLost } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_received: audioPacketReceivedDelta } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_lost: audioPacketLostDelta } },
          { type: STAT_TYPE.AUDIO, value: { delta_jitter_ms: jitter } },
          { type: STAT_TYPE.AUDIO, value: { total_KBytes_received: audioTotalKBytesReceived } },
          { type: STAT_TYPE.AUDIO, value: { delta_KBytes_received: audioKBytesReceived } },
        ];
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        // Decode time stats
        const data = extractDecodeTime(bunch, previousBunch);

        // Packets stats
        const packetsData = extractVideoPacketReceived(bunch, previousBunch, referenceReport);
        const videoPacketReceivedDelta = packetsData.packetsReceived - previousBunch.video.total_packets_received;
        const videoPacketLostDelta = packetsData.packetsLost - previousBunch.video.total_packets_lost;

        // Jitter stats
        const jitter = extractLastJitter(bunch, previousBunch);

        // Bytes stats
        const videoTotalKBytesReceived = ((bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024) - (referenceReport ? referenceReport.video.total_KBytes_received : 0);
        const videoKBytesReceived = videoTotalKBytesReceived - previousBunch.video.total_KBytes_received;

        // Codec stats
        const decoderImplementation = bunch[PROPERTY.DECODER_IMPLEMENTATION] || null;
        const videoInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // Video size
        const inputVideo = extractVideoSize(bunch);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountSent(bunch, referenceReport);
        const nackDelta = nackPliData.nackCount - previousBunch.video.total_nack_sent;
        const pliDelta = nackPliData.pliCount - previousBunch.video.total_pli_sent;

        return [
          { type: STAT_TYPE.VIDEO, value: { input_codec_id: videoInputCodecId } },
          { type: STAT_TYPE.VIDEO, value: { percent_packets_lost: packetsData.percentPacketsLost } },
          { type: STAT_TYPE.VIDEO, value: { total_packets_received: packetsData.packetsReceived } },
          { type: STAT_TYPE.VIDEO, value: { total_packets_lost: packetsData.packetsLost } },
          { type: STAT_TYPE.VIDEO, value: { delta_packets_received: videoPacketReceivedDelta } },
          { type: STAT_TYPE.VIDEO, value: { delta_packets_lost: videoPacketLostDelta } },
          { type: STAT_TYPE.VIDEO, value: { delta_jitter_ms: jitter } },
          { type: STAT_TYPE.VIDEO, value: { total_KBytes_received: videoTotalKBytesReceived } },
          { type: STAT_TYPE.VIDEO, value: { delta_KBytes_received: videoKBytesReceived } },
          { type: STAT_TYPE.VIDEO, value: { decoder: decoderImplementation } },
          { type: STAT_TYPE.VIDEO, value: { delta_ms_decode_frame: data.delta_ms_decode_frame } },
          { type: STAT_TYPE.VIDEO, value: { total_frames_decoded: data.frames_decoded } },
          { type: STAT_TYPE.VIDEO, value: { total_time_decoded: data.total_decode_time } },
          { type: STAT_TYPE.VIDEO, value: { total_nack_sent: nackPliData.nackCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_nack_sent: nackDelta } },
          { type: STAT_TYPE.VIDEO, value: { total_pli_sent: nackPliData.pliCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_pli_sent: pliDelta } },
          { type: STAT_TYPE.VIDEO, value: { input_size: inputVideo } },
        ];
      }
      break;
    case TYPE.OUTBOUND_RTP:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        const audioTotalKBytesSent = ((bunch[PROPERTY.BYTES_SENT] || 0) / 1024) - (referenceReport ? referenceReport.audio.total_KBytes_sent : 0);
        const audioKBytesSent = audioTotalKBytesSent - previousBunch.audio.total_KBytes_sent;
        const audioOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.AUDIO, value: { output_codec_id: audioOutputCodecId } },
          { type: STAT_TYPE.AUDIO, value: { total_KBytes_sent: audioTotalKBytesSent } },
          { type: STAT_TYPE.AUDIO, value: { delta_KBytes_sent: audioKBytesSent } },
        ];
      }
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        const videoTotalKBytesSent = ((bunch[PROPERTY.BYTES_SENT] || 0) / 1024) - (referenceReport ? referenceReport.video.total_KBytes_sent : 0);
        const videoKBytesSent = videoTotalKBytesSent - previousBunch.video.total_KBytes_sent;
        const encoderImplementation = bunch[PROPERTY.ENCODER_IMPLEMENTATION] || null;
        const videoOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // Encode time
        const data = extractEncodeTime(bunch, previousBunch);

        // Video size
        const outputVideo = extractVideoSize(bunch);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountReceived(bunch, referenceReport);
        const nackDelta = nackPliData.nackCount - previousBunch.video.total_nack_received;
        const pliDelta = nackPliData.pliCount - previousBunch.video.total_pli_received;

        return [
          { type: STAT_TYPE.VIDEO, value: { output_codec_id: videoOutputCodecId } },
          { type: STAT_TYPE.VIDEO, value: { total_KBytes_sent: videoTotalKBytesSent } },
          { type: STAT_TYPE.VIDEO, value: { delta_KBytes_sent: videoKBytesSent } },
          { type: STAT_TYPE.VIDEO, value: { encoder: encoderImplementation } },
          { type: STAT_TYPE.VIDEO, value: { delta_ms_encode_frame: data.delta_ms_encode_frame } },
          { type: STAT_TYPE.VIDEO, value: { total_frames_encoded: data.frames_encoded } },
          { type: STAT_TYPE.VIDEO, value: { total_time_encoded: data.total_encode_time } },
          { type: STAT_TYPE.VIDEO, value: { total_nack_received: nackPliData.nackCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_nack_received: nackDelta } },
          { type: STAT_TYPE.VIDEO, value: { total_pli_received: nackPliData.pliCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_pli_received: pliDelta } },
          { type: STAT_TYPE.VIDEO, value: { output_size: outputVideo } },
        ];
      }
      break;
    case TYPE.MEDIA_SOURCE:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const outputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { output_level: outputLevel } }];
      }
      break;
    case TYPE.TRACK:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      // Note: All "track" stats have been made obsolete
      // Safari: compute kind property that don't exists

      if (bunch[PROPERTY.REMOTE_SOURCE] === true) {
        const inputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { input_level: inputLevel } }];
      }
      break;
    case TYPE.CODEC:
      if (bunch[PROPERTY.ID] === previousBunch.audio.input_codec_id || bunch[PROPERTY.ID] === previousBunch.audio.output_codec_id) {
        debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
        const codec = extractAudioCodec(bunch);

        if (bunch[PROPERTY.ID] === previousBunch.audio.input_codec_id) {
          return [{ type: STAT_TYPE.AUDIO, value: { input_codec: codec } }];
        }
        return [{ type: STAT_TYPE.AUDIO, value: { output_codec: codec } }];
      }

      if (bunch[PROPERTY.ID] === previousBunch.video.input_codec_id || bunch[PROPERTY.ID] === previousBunch.video.output_codec_id) {
        debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
        const codec = extractVideoCodec(bunch);

        if (bunch[PROPERTY.ID] === previousBunch.video.input_codec_id) {
          return [{ type: STAT_TYPE.VIDEO, value: { input_codec: codec } }];
        }
        return [{ type: STAT_TYPE.VIDEO, value: { output_codec: codec } }];
      }
      break;
    case TYPE.REMOTE_INBOUND_RTP:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(bunch, VALUE.AUDIO, referenceReport, previousBunch);

        return [
          { type: STAT_TYPE.AUDIO, value: { delta_rtt_ms: data.rtt } },
          { type: STAT_TYPE.AUDIO, value: { total_rtt_ms: data.totalRTT } },
          { type: STAT_TYPE.AUDIO, value: { total_rtt_measure: data.totalRTTMeasurements } },
        ];
      }

      if (bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(bunch, VALUE.VIDEO, referenceReport, previousBunch);

        return [
          { type: STAT_TYPE.VIDEO, value: { delta_rtt_ms: data.rtt } },
          { type: STAT_TYPE.VIDEO, value: { total_rtt_ms: data.totalRTT } },
          { type: STAT_TYPE.VIDEO, value: { total_rtt_measure: data.totalRTTMeasurements } },
        ];
      }
      break;
    default:
      break;
  }

  // No interesting data
  return [];
};

export const computeEModelMOS = (report, kind = "audio", previousReport, beforeLastReport) => {
  const rttValues = [report[kind].delta_rtt_ms];
  const jitterValues = [report[kind].delta_jitter_ms];

  if (previousReport) {
    rttValues.push(previousReport[kind].delta_rtt_ms);
    jitterValues.push(previousReport[kind].delta_jitter_ms);
  }
  if (beforeLastReport) {
    rttValues.push(beforeLastReport[kind].delta_rtt_ms);
    jitterValues.push(beforeLastReport[kind].delta_jitter_ms);
  }

  const rtt = average(rttValues);

  const jitter = average(jitterValues);
  const rx = 93.2 - report[kind].percent_packets_lost;
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

  return (computeScore(r));
};

export const computeMOS = (report, kind = "audio", previousReport, beforeLastReport) => {
  const rttValues = [report[kind].delta_rtt_ms];
  const jitterValues = [report[kind].delta_jitter_ms];
  const packetsLoss = report[kind].percent_packets_lost;

  if (previousReport) {
    rttValues.push(previousReport[kind].delta_rtt_ms);
    jitterValues.push(previousReport[kind].delta_jitter_ms);
  }
  if (beforeLastReport) {
    rttValues.push(beforeLastReport[kind].delta_rtt_ms);
    jitterValues.push(beforeLastReport[kind].delta_jitter_ms);
  }

  const rtt = average(rttValues);
  const jitter = average(jitterValues);
  const codecFittingParameterA = 0;
  const codecFittingParameterB = 19.8;
  const codecFittingParameterC = 29.7;
  const ld = 30;
  const d = (rtt + jitter) / 2 + ld;
  const h = d - 177.3 < 0 ? 0 : 1;

  const id = 0.024 * d + 0.11 * (d - 177.3) * h;
  const ie = codecFittingParameterA + codecFittingParameterB * Math.log(1 + codecFittingParameterC * packetsLoss);

  const r = 93.2 - (ie + id);

  return (computeScore(r));
};
