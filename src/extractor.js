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
  let supportOfMeasure = false;
  const previousRTT = previousBunch[kind].total_rtt_ms_out;
  const previousNbMeasure = previousBunch[kind].total_rtt_measure_out;
  const referenceRTT = referenceReport ? referenceReport[kind].total_rtt_ms_out : 0;
  const referenceNbMeasure = referenceReport ? referenceReport[kind].total_rtt_measure_out : 0;

  // If RTT is not part of the stat - return
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.ROUND_TRIP_TIME)) {
    return {
      rtt: null,
      totalRTT: previousRTT,
      totalRTTMeasurements: previousNbMeasure,
    };
  }

  // If no measure yet or no new measure - return
  if (Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS)) {
    supportOfMeasure = true;
    if ((Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) === 0) ||
        (Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) - referenceNbMeasure === previousNbMeasure)) {
      return {
        rtt: null,
        totalRTT: previousRTT,
        totalRTTMeasurements: previousNbMeasure,
      };
    }
  }

  const currentRTT = Number(1000) * Number(bunch[PROPERTY.ROUND_TRIP_TIME]);
  let currentTotalRTT = previousRTT + currentRTT;
  let currentTotalMeasurements = previousNbMeasure + 1;

  // If support of totalRoundTripTime
  if (supportOfMeasure) {
    currentTotalRTT = (Number(1000) * Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME]) - referenceRTT);
    currentTotalMeasurements = (Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) - referenceNbMeasure);
  }

  return {
    rtt: currentRTT,
    totalRTT: currentTotalRTT,
    totalRTTMeasurements: currentTotalMeasurements,
  };
};

const extractRTTBasedOnSTUNConnectivityCheck = (bunch, kind, referenceReport, previousBunch) => {
  // If RTT is not part of the stat - return null value
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.CURRENT_ROUND_TRIP_TIME)) {
    return {
      rtt: null,
      totalRTT: previousBunch[kind].total_rtt_connectivity_ms_out,
      totalRTTMeasurements: previousBunch[kind].total_rtt_connectivity_measure_out,
    };
  }

  const currentRTT = Number(1000) * Number(bunch[PROPERTY.CURRENT_ROUND_TRIP_TIME]);
  let currentTotalRTT = previousBunch[kind].total_rtt_connectivity_ms_out + currentRTT;
  let currentTotalMeasurements = previousBunch[kind].total_rtt_connectivity_measure_out + 1;

  // If support of totalRoundTripTime
  if (Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ROUND_TRIP_TIME)) {
    currentTotalRTT = (Number(1000) * Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME]) - (referenceReport ? referenceReport[kind].total_rtt_connectivity_ms_out : 0));
  }
  // If support of responsesReceived
  if (Object.prototype.hasOwnProperty.call(bunch, PROPERTY.RESPONSES_RECEIVED)) {
    currentTotalMeasurements = (Number(bunch[PROPERTY.RESPONSES_RECEIVED]) - (referenceReport ? referenceReport[kind].total_rtt_connectivity_measure_out : 0));
  }

  return {
    rtt: currentRTT,
    totalRTT: currentTotalRTT,
    totalRTTMeasurements: currentTotalMeasurements,
  };
};

const extractLastJitter = (bunch, previousBunch, direction = "in") => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.JITTER)) {
    return previousBunch[`audio.delta_jitter_ms_${direction}`];
  }
  return Number(1000) * (Number(bunch[PROPERTY.JITTER]) || 0);
};

const extractDecodeTime = (bunch, previousBunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_DECODED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_DECODE_TIME)) {
    return { delta_ms_decode_frame: previousBunch.video.delta_ms_decode_frame_in, frames_decoded: previousBunch.video.total_frames_decoded_in, total_decode_time: previousBunch.video.total_time_decoded_in };
  }

  const decodedFrames = bunch[PROPERTY.FRAMES_DECODED];
  const totalDecodeTime = bunch[PROPERTY.TOTAL_DECODE_TIME];

  const decodeTimeDelta = totalDecodeTime - previousBunch.video.total_time_decoded_in;
  const frameDelta = decodedFrames - previousBunch.video.total_frames_decoded_in;

  return { delta_ms_decode_frame: frameDelta > 0 ? (decodeTimeDelta * 1000) / frameDelta : 0, frames_decoded: decodedFrames, total_decode_time: totalDecodeTime };
};

const extractEncodeTime = (bunch, previousBunch) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_ENCODED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ENCODE_TIME)) {
    return { delta_ms_encode_frame: previousBunch.video.delta_ms_encode_frame_out, frames_encoded: previousBunch.video.total_frames_encoded_out, total_encode_time: previousBunch.video.total_time_encoded_out };
  }

  const encodedFrames = bunch[PROPERTY.FRAMES_ENCODED];
  const totalEncodeTime = bunch[PROPERTY.TOTAL_ENCODE_TIME];

  const encodeTimeDelta = totalEncodeTime - previousBunch.video.total_time_encoded_out;
  const frameDelta = encodedFrames - previousBunch.video.total_frames_encoded_out;
  const framesEncodedDelta = (frameDelta > 0 && encodeTimeDelta) ? (encodeTimeDelta * 1000) / frameDelta : 0;

  return { delta_ms_encode_frame: framesEncodedDelta, frames_encoded: encodedFrames, total_encode_time: totalEncodeTime };
};

const extractAudioPacketReceived = (bunch, previousBunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: previousBunch.audio.percent_packets_lost_in, packetsReceived: previousBunch.audio.total_packets_in, packetsLost: previousBunch.audio.total_packets_lost_in };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0 - (referenceReport ? referenceReport.audio.total_packets_in : 0);
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0 - (referenceReport ? referenceReport.audio.total_packets_lost_in : 0);
  const deltaPacketsLost = packetsLost - previousBunch.audio.total_packets_lost_in;
  const deltaPacketsReceived = packetsReceived - previousBunch.audio.total_packets_in;
  const percentPacketsLost = (packetsReceived !== previousBunch.audio.total_packets_in) ? (deltaPacketsLost * 100) / (deltaPacketsLost + deltaPacketsReceived) : 0.0;

  return { percentPacketsLost, packetsReceived, packetsLost };
};

const extractVideoPacketReceived = (bunch, previousBunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    return { percent_packets_lost: previousBunch.video.percent_packets_lost_in, packetsReceived: previousBunch.video.total_packets_in, packetsLost: previousBunch.video.total_packets_lost_in };
  }

  const packetsReceived = Number(bunch[PROPERTY.PACKETS_RECEIVED]) || 0 - (referenceReport ? referenceReport.video.total_packets_in : 0);
  const packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0 - (referenceReport ? referenceReport.video.total_packets_lost_in : 0);
  const deltaPacketsLost = packetsLost - previousBunch.video.total_packets_lost_in;
  const deltaPacketsReceived = packetsReceived - previousBunch.video.total_packets_in;
  const percentPacketsLost = (packetsReceived !== previousBunch.video.total_packets_in) ? (deltaPacketsLost * 100) / (deltaPacketsLost + deltaPacketsReceived) : 0.0;

  return { percentPacketsLost, packetsReceived, packetsLost };
};

const extractRelayProtocolUsed = (bunch) => {
  const candidateType = bunch[PROPERTY.CANDIDATE_TYPE];
  if (candidateType !== "relay") {
    return "";
  }
  return bunch[PROPERTY.RELAY_PROTOCOL] || "";
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

const extractQualityLimitation = (bunch) => {
  const reason = Object.prototype.hasOwnProperty.call(bunch, PROPERTY.QUALITY_LIMITATION_REASON) ? bunch[PROPERTY.QUALITY_LIMITATION_REASON] : null;
  const resolutionChanges = Object.prototype.hasOwnProperty.call(bunch, PROPERTY.QUALITY_LIMITATION_RESOLUTION_CHANGES) ? bunch[PROPERTY.QUALITY_LIMITATION_RESOLUTION_CHANGES] : null;
  const durations = Object.prototype.hasOwnProperty.call(bunch, PROPERTY.QUALITY_LIMITATION_DURATIONS) ? bunch[PROPERTY.QUALITY_LIMITATION_DURATIONS] : null;

  if (durations) {
    Object.keys(durations).forEach((key) => {
      if (durations[key] > 1000) {
        durations[key] = Number(durations[key] / 1000);
      }
    });
  }
  return { reason, durations, resolutionChanges };
};

const extractNackAndPliCountSent = (bunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)) {
    return { pliCount: 0, nackCount: 0 };
  }

  return {
    pliCount: (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport.video.total_pli_out : 0),
    nackCount: (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport.video.total_nack_out : 0),
  };
};

const extractNackAndPliCountReceived = (bunch, referenceReport) => {
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) || !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)) {
    return { pliCount: 0, nackCount: 0 };
  }

  return {
    pliCount: (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport.video.total_pli_in : 0),
    nackCount: (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport.video.total_nack_in : 0),
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
  const totalKBytesReceived = (bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024 - (referenceReport ? referenceReport.data.total_KBytes_in : 0);
  const totalKBytesSent = (bunch[PROPERTY.BYTES_SENT] || 0) / 1024 - (referenceReport ? referenceReport.data.total_KBytes_out : 0);

  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();
  const KBytesReceived = totalKBytesReceived - previousBunch.data.total_KBytes_in;
  const KBytesSent = totalKBytesSent - previousBunch.data.total_KBytes_out;

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
        const rttConnectivity = extractRTTBasedOnSTUNConnectivityCheck(bunch, "data", referenceReport, previousBunch);

        return [
          { type: STAT_TYPE.NETWORK, value: { local_candidate_id: localCandidateId } },
          { type: STAT_TYPE.NETWORK, value: { remote_candidate_id: remoteCandidateId } },
          { type: STAT_TYPE.DATA, value: { total_KBytes_in: valueSentReceived.total_KBytes_received } },
          { type: STAT_TYPE.DATA, value: { total_KBytes_out: valueSentReceived.total_KBytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_KBytes_in: valueSentReceived.delta_KBytes_received } },
          { type: STAT_TYPE.DATA, value: { delta_KBytes_out: valueSentReceived.delta_KBytes_sent } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_in: valueSentReceived.kbs_speed_received } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_out: valueSentReceived.kbs_speed_sent } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_bandwidth_in: bandwidth.kbs_incoming_bandwidth } },
          { type: STAT_TYPE.DATA, value: { delta_kbs_bandwidth_out: bandwidth.kbs_outgoing_bandwidth } },
          { type: STAT_TYPE.DATA, value: { delta_rtt_connectivity_ms_out: rttConnectivity.rtt } },
          { type: STAT_TYPE.DATA, value: { total_rtt_connectivity_ms_out: rttConnectivity.totalRTT } },
          { type: STAT_TYPE.DATA, value: { total_rtt_connectivity_measure_out: rttConnectivity.totalRTTMeasurements } },
        ];
      }
      break;
    case TYPE.LOCAL_CANDIDATE:
      if (bunch[PROPERTY.ID] === previousBunch.network.local_candidate_id) {
        return [
          { type: STAT_TYPE.NETWORK, value: { infrastructure: extractInfrastructureValue(bunch) } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "" } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" } },
          { type: STAT_TYPE.NETWORK, value: { local_candidate_relay_protocol: extractRelayProtocolUsed(bunch) } },
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
        const audioPacketReceivedDelta = data.packetsReceived - previousBunch.audio.total_packets_in;
        const audioPacketLostDelta = data.packetsLost - previousBunch.audio.total_packets_lost_in;

        // Jitter stats
        const jitter = extractLastJitter(bunch, previousBunch);

        // Bytes stats
        const audioTotalKBytesReceived = ((bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024) - (referenceReport ? referenceReport.audio.total_KBytes_in : 0);
        const audioKBytesReceived = audioTotalKBytesReceived - previousBunch.audio.total_KBytes_in;

        // Codec stats
        const audioInputCodecId = bunch[PROPERTY.CODEC_ID] || "";

        return [
          { type: STAT_TYPE.AUDIO, value: { codec_id: audioInputCodecId } },
          { type: STAT_TYPE.AUDIO, value: { percent_packets_lost_in: data.percentPacketsLost } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_in: data.packetsReceived } },
          { type: STAT_TYPE.AUDIO, value: { total_packets_lost_in: data.packetsLost } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_in: audioPacketReceivedDelta } },
          { type: STAT_TYPE.AUDIO, value: { delta_packets_lost_in: audioPacketLostDelta } },
          { type: STAT_TYPE.AUDIO, value: { delta_jitter_ms_in: jitter } },
          { type: STAT_TYPE.AUDIO, value: { total_KBytes_in: audioTotalKBytesReceived } },
          { type: STAT_TYPE.AUDIO, value: { delta_KBytes_in: audioKBytesReceived } },
        ];
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        // Decode time stats
        const data = extractDecodeTime(bunch, previousBunch);

        // Packets stats
        const packetsData = extractVideoPacketReceived(bunch, previousBunch, referenceReport);
        const videoPacketReceivedDelta = packetsData.packetsReceived - previousBunch.video.total_packets_in;
        const videoPacketLostDelta = packetsData.packetsLost - previousBunch.video.total_packets_lost_in;

        // Jitter stats
        const jitter = extractLastJitter(bunch, previousBunch);

        // Bytes stats
        const videoTotalKBytesReceived = ((bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024) - (referenceReport ? referenceReport.video.total_KBytes_in : 0);
        const videoKBytesReceived = videoTotalKBytesReceived - previousBunch.video.total_KBytes_in;

        // Codec stats
        const decoderImplementation = bunch[PROPERTY.DECODER_IMPLEMENTATION] || null;
        const videoInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // Video size
        const inputVideo = extractVideoSize(bunch);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountSent(bunch, referenceReport);
        const nackDelta = nackPliData.nackCount - previousBunch.video.total_nack_out;
        const pliDelta = nackPliData.pliCount - previousBunch.video.total_pli_out;

        return [
          { type: STAT_TYPE.VIDEO, value: { codec_id_in: videoInputCodecId } },
          { type: STAT_TYPE.VIDEO, value: { percent_packets_lost_in: packetsData.percentPacketsLost } },
          { type: STAT_TYPE.VIDEO, value: { total_packets_in: packetsData.packetsReceived } },
          { type: STAT_TYPE.VIDEO, value: { total_packets_lost_in: packetsData.packetsLost } },
          { type: STAT_TYPE.VIDEO, value: { delta_packets_in: videoPacketReceivedDelta } },
          { type: STAT_TYPE.VIDEO, value: { delta_packets_lost_in: videoPacketLostDelta } },
          { type: STAT_TYPE.VIDEO, value: { delta_jitter_ms_in: jitter } },
          { type: STAT_TYPE.VIDEO, value: { total_KBytes_in: videoTotalKBytesReceived } },
          { type: STAT_TYPE.VIDEO, value: { delta_KBytes_in: videoKBytesReceived } },
          { type: STAT_TYPE.VIDEO, value: { decoder_in: decoderImplementation } },
          { type: STAT_TYPE.VIDEO, value: { delta_ms_decode_frame_in: data.delta_ms_decode_frame } },
          { type: STAT_TYPE.VIDEO, value: { total_frames_decoded_in: data.frames_decoded } },
          { type: STAT_TYPE.VIDEO, value: { total_time_decoded_in: data.total_decode_time } },
          { type: STAT_TYPE.VIDEO, value: { total_nack_out: nackPliData.nackCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_nack_out: nackDelta } },
          { type: STAT_TYPE.VIDEO, value: { total_pli_out: nackPliData.pliCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_pli_out: pliDelta } },
          { type: STAT_TYPE.VIDEO, value: { size_in: inputVideo } },
        ];
      }
      break;
    case TYPE.OUTBOUND_RTP:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        const audioTotalKBytesSent = ((bunch[PROPERTY.BYTES_SENT] || 0) / 1024) - (referenceReport ? referenceReport.audio.total_KBytes_out : 0);
        const audioKBytesSent = audioTotalKBytesSent - previousBunch.audio.total_KBytes_out;
        const audioOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        return [
          { type: STAT_TYPE.AUDIO, value: { codec_id_out: audioOutputCodecId } },
          { type: STAT_TYPE.AUDIO, value: { total_KBytes_in: audioTotalKBytesSent } },
          { type: STAT_TYPE.AUDIO, value: { delta_KBytes_in: audioKBytesSent } },
        ];
      }
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        const videoTotalKBytesSent = ((bunch[PROPERTY.BYTES_SENT] || 0) / 1024) - (referenceReport ? referenceReport.video.total_KBytes_out : 0);
        const videoKBytesSent = videoTotalKBytesSent - previousBunch.video.total_KBytes_out;
        const encoderImplementation = bunch[PROPERTY.ENCODER_IMPLEMENTATION] || null;
        const videoOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // Encode time
        const data = extractEncodeTime(bunch, previousBunch);

        // Video size
        const outputVideo = extractVideoSize(bunch);

        // limitations
        const limitationOut = extractQualityLimitation(bunch);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountReceived(bunch, referenceReport);
        const nackDelta = nackPliData.nackCount - previousBunch.video.total_nack_in;
        const pliDelta = nackPliData.pliCount - previousBunch.video.total_pli_in;

        return [
          { type: STAT_TYPE.VIDEO, value: { codec_id_out: videoOutputCodecId } },
          { type: STAT_TYPE.VIDEO, value: { total_KBytes_out: videoTotalKBytesSent } },
          { type: STAT_TYPE.VIDEO, value: { delta_KBytes_out: videoKBytesSent } },
          { type: STAT_TYPE.VIDEO, value: { encoder_out: encoderImplementation } },
          { type: STAT_TYPE.VIDEO, value: { delta_ms_encode_frame_out: data.delta_ms_encode_frame } },
          { type: STAT_TYPE.VIDEO, value: { total_frames_encoded_out: data.frames_encoded } },
          { type: STAT_TYPE.VIDEO, value: { total_time_encoded_out: data.total_encode_time } },
          { type: STAT_TYPE.VIDEO, value: { total_nack_in: nackPliData.nackCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_nack_in: nackDelta } },
          { type: STAT_TYPE.VIDEO, value: { total_pli_in: nackPliData.pliCount } },
          { type: STAT_TYPE.VIDEO, value: { delta_pli_in: pliDelta } },
          { type: STAT_TYPE.VIDEO, value: { size_out: outputVideo } },
          { type: STAT_TYPE.VIDEO, value: { limitation_out: limitationOut } },
        ];
      }
      break;
    case TYPE.MEDIA_SOURCE:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        const outputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { level_out: outputLevel } }];
      }
      break;
    case TYPE.TRACK:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      // Note: All "track" stats have been made obsolete
      // Safari: compute kind property that don't exists

      if (bunch[PROPERTY.REMOTE_SOURCE] === true) {
        const inputLevel = extractAudioLevel(bunch);
        return [{ type: STAT_TYPE.AUDIO, value: { level_out: inputLevel } }];
      }
      break;
    case TYPE.CODEC:
      if (bunch[PROPERTY.ID] === previousBunch.audio.codec_id_in || bunch[PROPERTY.ID] === previousBunch.audio.codec_id_out) {
        debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
        const codec = extractAudioCodec(bunch);

        if (bunch[PROPERTY.ID] === previousBunch.audio.codec_id_in) {
          return [{ type: STAT_TYPE.AUDIO, value: { codec_in: codec } }];
        }
        return [{ type: STAT_TYPE.AUDIO, value: { codec_out: codec } }];
      }

      if (bunch[PROPERTY.ID] === previousBunch.video.codec_id_in || bunch[PROPERTY.ID] === previousBunch.video.codec_id_out) {
        debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
        const codec = extractVideoCodec(bunch);

        if (bunch[PROPERTY.ID] === previousBunch.video.codec_id_in) {
          return [{ type: STAT_TYPE.VIDEO, value: { codec_in: codec } }];
        }
        return [{ type: STAT_TYPE.VIDEO, value: { codec_out: codec } }];
      }
      break;
    case TYPE.REMOTE_INBOUND_RTP:
      debug(moduleName, `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`, bunch);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(bunch, VALUE.AUDIO, referenceReport, previousBunch);

        // Jitter (out)
        const jitter = extractLastJitter(bunch, previousBunch, "out");

        return [
          { type: STAT_TYPE.AUDIO, value: { delta_rtt_ms_out: data.rtt } },
          { type: STAT_TYPE.AUDIO, value: { total_rtt_ms_out: data.totalRTT } },
          { type: STAT_TYPE.AUDIO, value: { total_rtt_measure_out: data.totalRTTMeasurements } },
          { type: STAT_TYPE.AUDIO, value: { delta_jitter_ms_out: jitter } },
          { type: STAT_TYPE.AUDIO, value: { remote_timestamp: bunch[PROPERTY.TIMESTAMP] } },
        ];
      }

      if (bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(bunch, VALUE.VIDEO, referenceReport, previousBunch);

        // Jitter (out)
        const jitter = extractLastJitter(bunch, previousBunch, "out");

        return [
          { type: STAT_TYPE.VIDEO, value: { delta_rtt_ms_out: data.rtt } },
          { type: STAT_TYPE.VIDEO, value: { total_rtt_ms_out: data.totalRTT } },
          { type: STAT_TYPE.VIDEO, value: { total_rtt_measure_out: data.totalRTTMeasurements } },
          { type: STAT_TYPE.VIDEO, value: { delta_jitter_ms_out: jitter } },
          { type: STAT_TYPE.VIDEO, value: { remote_timestamp: bunch[PROPERTY.TIMESTAMP] } },
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
  const rttValues = [];
  const jitterValues = [];
  const packetsLoss = report[kind].percent_packets_lost_in;
  const currentRtt = report[kind].delta_rtt_ms_out;
  const lastRtt = (previousReport && previousReport[kind].delta_rtt_ms_out) || null;
  const beforeLastRtt = (beforeLastReport && beforeLastReport[kind].delta_rtt_ms_out) || null;
  const currentJitter = report[kind].delta_jitter_ms_in;
  const lastJitter = (previousReport && previousReport[kind].delta_jitter_ms_in) || null;
  const beforeLastJitter = (beforeLastReport && beforeLastReport[kind].delta_jitter_ms_in) || null;
  const currentRTTConnectivity = report.data.delta_rtt_connectivity_ms_out;
  const lastRTTConnectivity = (previousReport && previousReport.data.delta_rtt_connectivity_ms_out) || null;
  const beforeLastRTTConnectivity = (beforeLastReport && beforeLastReport.data.delta_rtt_connectivity_ms_out) || null;

  // Put RTT values when exist
  if (currentRtt) {
    rttValues.push(currentRtt);
  } else if (currentRTTConnectivity) {
    rttValues.push(currentRTTConnectivity);
  }
  if (lastRtt) {
    rttValues.push(lastRtt);
  } else if (lastRTTConnectivity) {
    rttValues.push(lastRTTConnectivity);
  }
  if (beforeLastRtt) {
    rttValues.push(beforeLastRtt);
  } else if (beforeLastRTTConnectivity) {
    rttValues.push(beforeLastRTTConnectivity);
  }

  // Put Jitter values
  if (currentJitter) {
    jitterValues.push(currentJitter);
  }
  if (previousReport && lastJitter) {
    jitterValues.push(lastJitter);
  }
  if (beforeLastReport && beforeLastJitter) {
    jitterValues.push(beforeLastJitter);
  }

  const rtt = rttValues.length > 0 ? average(rttValues) : 100; // Default value if no value;

  const jitter = jitterValues.length > 0 ? average(jitterValues) : 10; // Default value if no value;

  const rx = 93.2 - packetsLoss;
  const ry = 0.18 * rx * rx - 27.9 * rx + 1126.62;

  const d = (rtt + jitter) / 2;
  const h = (d - 177.3 < 0) ? 0 : 1;

  const id = 0.024 * d + 0.11 * (d - 177.3) * h;

  const r = ry - id;

  return (computeScore(r));
};

export const computeMOS = (report, kind = "audio", previousReport, beforeLastReport) => {
  const rttValues = [];
  const jitterValues = [];
  const packetsLoss = report[kind].percent_packets_lost_in;
  const currentRtt = report[kind].delta_rtt_ms_out;
  const lastRtt = (previousReport && previousReport[kind].delta_rtt_ms_out) || null;
  const beforeLastRtt = (beforeLastReport && beforeLastReport[kind].delta_rtt_ms_out) || null;
  const currentJitter = report[kind].delta_jitter_ms_in;
  const lastJitter = (previousReport && previousReport[kind].delta_jitter_ms_in) || null;
  const beforeLastJitter = (beforeLastReport && beforeLastReport[kind].delta_jitter_ms_in) || null;

  // Put RTT values when exist
  if (currentRtt) {
    rttValues.push(currentRtt);
  }
  if (previousReport && lastRtt) {
    rttValues.push(lastRtt);
  }
  if (beforeLastReport && beforeLastRtt) {
    rttValues.push(beforeLastRtt);
  }

  // Put Jitter values
  if (currentJitter) {
    jitterValues.push(currentJitter);
  }
  if (previousReport && lastJitter) {
    jitterValues.push(lastJitter);
  }
  if (beforeLastReport && beforeLastJitter) {
    jitterValues.push(beforeLastJitter);
  }

  const rtt = rttValues.length > 0 ? average(rttValues) : 100; // Default value if no value;
  const jitter = jitterValues.length > 0 ? average(jitterValues) : 10; // Default value if no value;

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
