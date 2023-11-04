import {
  PROPERTY,
  INFRASTRUCTURE_VALUE,
  STAT_TYPE,
  INFRASTRUCTURE_LABEL,
  TYPE,
  VALUE,
  DIRECTION,
} from "./utils/models";

import {
  findOutgoingTrackFromPeerConnectionByKind,
  findTrackInPeerConnectionById, fixed2,
  getSSRCDataFromBunch,
} from "./utils/helper";

import { debug } from "./utils/log";

const moduleName = "extractor   ";

const extractPlayoutInformation = (report, previousReport) => {
  const previousSynthetized = previousReport ? (previousReport[PROPERTY.SYNTHETIZED_SAMPLES_DURATION] * 1000) || 0 : 0;
  const currentSynthetized = report ? (report[PROPERTY.SYNTHETIZED_SAMPLES_DURATION] * 1000) || 0 : 0;
  const totalSamplesDuration = report ? (report[PROPERTY.TOTAL_SAMPLES_DURATION] * 1000) || 0 : 0;
  const previousTotalSamplesDuration = previousReport ? (previousReport[PROPERTY.TOTAL_SAMPLES_DURATION] * 1000) || 0 : 0;
  const delta = currentSynthetized - previousSynthetized;
  const deltaDuration = totalSamplesDuration - previousTotalSamplesDuration;
  const totalDelay = report ? report[PROPERTY.TOTAL_PLAYOUT_DELAY] || 0 : 0;
  const totalSamplesCount = report ? report[PROPERTY.TOTAL_SAMPLES_COUNT] || 0 : 0;

  const deltaDelay = totalSamplesCount ? totalDelay / totalSamplesCount : 0;
  const deltaPercentSynthetized = deltaDuration ? (delta / deltaDuration) * 100 : 0;
  const totalPercentSynthetized = totalSamplesDuration ? (currentSynthetized / totalSamplesDuration) * 100 : 0;

  return {
    total_synthetized_ms_in: currentSynthetized,
    delta_synthetized_ms_in: delta,
    percent_synthetized_in: deltaPercentSynthetized,
    total_percent_synthetized_in: totalPercentSynthetized,
    total_playout_ms_in: totalDelay,
    delta_playout_delay_ms_in: deltaDelay,
  };
};

const extractRTTBasedOnRTCP = (bunch, kind, referenceReport, previousBunch) => {
  let supportOfMeasure = false;
  const previousRTT = previousBunch[kind].total_rtt_ms_out;
  const previousNbMeasure = previousBunch[kind].total_rtt_measure_out;
  const referenceRTT = referenceReport
    ? referenceReport[kind].total_rtt_ms_out
    : 0;
  const referenceNbMeasure = referenceReport
    ? referenceReport[kind].total_rtt_measure_out
    : 0;

  const returnedValuesByDefault = {
    rtt: null,
    totalRTT: previousRTT,
    totalRTTMeasurements: previousNbMeasure,
  };

  if (bunch[PROPERTY.TIMESTAMP] === previousBunch[kind].timestamp_out) {
    return returnedValuesByDefault;
  }

  // If RTT is not part of the stat - return
  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.ROUND_TRIP_TIME)) {
    return returnedValuesByDefault;
  }

  // If no measure yet or no new measure - return
  if (
    Object.prototype.hasOwnProperty.call(
      bunch,
      PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS,
    )
  ) {
    supportOfMeasure = true;
    if (
      Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) === 0 ||
      Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) -
        referenceNbMeasure ===
        previousNbMeasure
    ) {
      return returnedValuesByDefault;
    }
  }

  const currentRTT = Number(1000) * Number(bunch[PROPERTY.ROUND_TRIP_TIME]);
  let currentTotalRTT = previousRTT + currentRTT;
  let currentTotalMeasurements = previousNbMeasure + 1;

  // If support of totalRoundTripTime
  if (supportOfMeasure) {
    currentTotalRTT =
      Number(1000) * Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME]) -
      referenceRTT;
    currentTotalMeasurements =
      Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME_MEASUREMENTS]) -
      referenceNbMeasure;
  }

  return {
    rtt: currentRTT,
    totalRTT: currentTotalRTT,
    totalRTTMeasurements: currentTotalMeasurements,
  };
};

const extractRTTBasedOnSTUNConnectivityCheck = (
  bunch,
  kind,
  referenceReport,
  previousBunch,
) => {
  // If RTT is not part of the stat - return null value
  if (
    !Object.prototype.hasOwnProperty.call(
      bunch,
      PROPERTY.CURRENT_ROUND_TRIP_TIME,
    )
  ) {
    return {
      rtt: null,
      totalRTT: previousBunch[kind].total_rtt_connectivity_ms,
      totalRTTMeasurements:
        previousBunch[kind].total_rtt_connectivity_measure,
    };
  }

  const currentRTT =
    Number(1000) * Number(bunch[PROPERTY.CURRENT_ROUND_TRIP_TIME]);
  let currentTotalRTT =
    previousBunch[kind].total_rtt_connectivity_ms + currentRTT;
  let currentTotalMeasurements =
    previousBunch[kind].total_rtt_connectivity_measure + 1;

  // If support of totalRoundTripTime
  if (
    Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ROUND_TRIP_TIME)
  ) {
    currentTotalRTT =
      Number(1000) * Number(bunch[PROPERTY.TOTAL_ROUND_TRIP_TIME]) -
      (referenceReport
        ? referenceReport[kind].total_rtt_connectivity_ms
        : 0);
  }
  // If support of responsesReceived
  if (
    Object.prototype.hasOwnProperty.call(bunch, PROPERTY.RESPONSES_RECEIVED)
  ) {
    currentTotalMeasurements =
      Number(bunch[PROPERTY.RESPONSES_RECEIVED]) -
      (referenceReport
        ? referenceReport[kind].total_rtt_connectivity_measure
        : 0);
  }

  return {
    rtt: currentRTT,
    totalRTT: currentTotalRTT,
    totalRTTMeasurements: currentTotalMeasurements,
  };
};

const extractLastJitter = (bunch, kind, previousBunch) => {
  if (bunch[PROPERTY.TIMESTAMP] === previousBunch[kind].timestamp_out) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(bunch, PROPERTY.JITTER)) {
    return null;
  }

  return Number(1000) * (Number(bunch[PROPERTY.JITTER]) || 0);
};

const extractJitterBufferInfo = (bunch, kind, previousBunch) => {
  const jitterBufferDelay = bunch[PROPERTY.JITTER_BUFFER_DELAY] * 1000 || 0;
  const jitterBufferEmittedCount = bunch[PROPERTY.JITTER_BUFFER_EMITTED_COUNT] || 0;

  const deltaJitterBufferDelay = jitterBufferDelay - previousBunch[kind].total_time_jitter_buffer_delay_in;
  const deltaJitterBufferEmittedCount = jitterBufferEmittedCount - previousBunch[kind].total_jitter_emitted_in;

  return {
    delta_ms_jitter_buffer_delay: deltaJitterBufferEmittedCount ? deltaJitterBufferDelay / deltaJitterBufferEmittedCount : 0,
    total_time_jitter_buffer_delay: jitterBufferDelay,
    total_time_jitter_emitted: jitterBufferEmittedCount,
  };
};

const extractDecodeTime = (bunch, previousBunch) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_DECODED) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_DECODE_TIME)
  ) {
    return {
      delta_ms_decode_frame:
        previousBunch[VALUE.VIDEO].delta_decode_frame_ms_in,
      frames_decoded: previousBunch[VALUE.VIDEO].total_frames_decoded_in,
      total_decode_time: previousBunch[VALUE.VIDEO].total_time_decoded_in,
    };
  }

  const decodedFrames = bunch[PROPERTY.FRAMES_DECODED];
  const totalDecodeTime = bunch[PROPERTY.TOTAL_DECODE_TIME] * 1000; // in ms
  const totalProcessingDelay = bunch[PROPERTY.TOTAL_PROCESSING_DELAY] * 1000 || 0; // in ms
  const totalAssemblyTime = bunch[PROPERTY.TOTAL_ASSEMBLY_TIME] * 1000 || 0; // in ms

  const totalProcessingDelayDelta = totalProcessingDelay - previousBunch[VALUE.VIDEO].total_time_processing_delay_in;
  const decodeTimeDelta = totalDecodeTime - previousBunch[VALUE.VIDEO].total_time_decoded_in;
  const frameDelta = decodedFrames - previousBunch[VALUE.VIDEO].total_frames_decoded_in;
  const totalAssemblyTimeDelta = totalAssemblyTime - previousBunch[VALUE.VIDEO].total_time_assembly_delay_in;

  return {
    frames_decoded: decodedFrames,
    delta_ms_decode_frame: frameDelta > 0 ? decodeTimeDelta / frameDelta : 0,
    delta_ms_processing_delay: frameDelta > 0 ? totalProcessingDelayDelta / frameDelta : 0,
    delta_ms_assembly_delay: frameDelta > 0 ? totalAssemblyTimeDelta / frameDelta : 0,
    total_time_processing_delay: totalProcessingDelay,
    total_decode_time: totalDecodeTime,
    total_assembly_time: totalAssemblyTime,
  };
};

const extractEncodeTime = (bunch, previousBunch) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAMES_ENCODED) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.TOTAL_ENCODE_TIME)
  ) {
    return {
      delta_ms_encode_frame: previousBunch[VALUE.VIDEO].delta_encode_frame_ms_out,
      frames_encoded: previousBunch[VALUE.VIDEO].total_frames_encoded_out,
      total_encode_time: previousBunch[VALUE.VIDEO].total_time_encoded_out,
    };
  }

  const encodedFrames = bunch[PROPERTY.FRAMES_ENCODED];
  const totalEncodeTime = bunch[PROPERTY.TOTAL_ENCODE_TIME];

  const encodeTimeDelta =
    totalEncodeTime - previousBunch[VALUE.VIDEO].total_time_encoded_out;
  const frameDelta =
    encodedFrames - previousBunch[VALUE.VIDEO].total_frames_encoded_out;
  const framesEncodedDelta =
    frameDelta > 0 && encodeTimeDelta
      ? (encodeTimeDelta * 1000) / frameDelta
      : 0;

  return {
    delta_ms_encode_frame: framesEncodedDelta,
    frames_encoded: encodedFrames,
    total_encode_time: totalEncodeTime,
  };
};

const extractAudioVideoPacketSent = (
  bunch,
  kind,
  previousBunch,
  referenceReport,
) => {
  const packetsSent =
    Number(bunch[PROPERTY.PACKETS_SENT]) ||
    0 - (referenceReport ? referenceReport[kind].total_packets_out : 0);
  const deltaPacketsSent = packetsSent - previousBunch[kind].total_packets_out;
  const totalPacketSendDelay = Number(bunch[PROPERTY.TOTAL_PACKETS_SEND_DELAY]) * 1000 ||
    0 - (referenceReport ? referenceReport[kind].total_time_packets_delay_out : 0);
  const deltaPacketsDelay = totalPacketSendDelay - previousBunch[kind].total_time_packets_delay_out;
  const deltaAvgPacketSendDelay = deltaPacketsSent ? deltaPacketsDelay / deltaPacketsSent : 0;
  const KBytesSent = (Number(bunch[PROPERTY.BYTES_SENT]) / 1024) - (referenceReport ? referenceReport[kind].total_KBytes_out : 0);
  const deltaKBytesSent = KBytesSent - previousBunch[kind].total_KBytes_out;
  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();
  const referenceTimestamp = referenceReport ? referenceReport.timestamp : null;
  let previousTimestamp = previousBunch.timestamp;
  if (!previousTimestamp && referenceTimestamp) {
    previousTimestamp = referenceTimestamp;
  }
  const deltaMs = previousTimestamp ? timestamp - previousTimestamp : 0;
  const kbsSent = deltaMs > 0 ? ((deltaKBytesSent * 0.008 * 1024) / deltaMs) * 1000 : 0; // kbs = kilo bits per second

  return {
    packetsSent,
    deltaPacketsSent,
    KBytesSent,
    deltaKBytesSent,
    kbsSent,
    deltaAvgPacketSendDelay,
    totalPacketSendDelay,
  };
};

const extractAudioVideoPacketLost = (
    bunch,
    kind,
    previousBunch,
    referenceReport,
) => {
  let packetsLost = previousBunch[kind].total_packets_lost_out;
  let deltaPacketsLost = 0;
  let fractionLost = 0;
  if (Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST)) {
    packetsLost = Number(bunch[PROPERTY.PACKETS_LOST]) || 0 - (referenceReport ? referenceReport[kind].total_packets_lost_out : 0);
    deltaPacketsLost = packetsLost - previousBunch[kind].total_packets_lost_out;
  }

  if (Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRACTION_LOST)) {
    fractionLost = Number(100 * bunch[PROPERTY.FRACTION_LOST]);
  }
  return {
    packetsLost,
    deltaPacketsLost,
    fractionLost,
  };
};

const extractAudioVideoPacketReceived = (
  bunch,
  kind,
  previousBunch,
  referenceReport,
) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_RECEIVED) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PACKETS_LOST) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.BYTES_RECEIVED)
  ) {
    return {
      percent_packets_lost: previousBunch[kind].percent_packets_lost_in,
      packetsReceived: previousBunch[kind].total_packets_in,
      packetsLost: previousBunch[kind].total_packets_lost_in,
      bytesReceived: previousBunch[kind].total_KBytes_in,
    };
  }

  const packetsReceived =
    Number(bunch[PROPERTY.PACKETS_RECEIVED]) ||
    0 - (referenceReport ? referenceReport[kind].total_packets_in : 0);
  const packetsLost =
    Number(bunch[PROPERTY.PACKETS_LOST]) ||
    0 - (referenceReport ? referenceReport[kind].total_packets_lost_in : 0);
  const deltaPacketsLost =
    packetsLost - previousBunch[kind].total_packets_lost_in;
  const deltaPacketsReceived =
    packetsReceived - previousBunch[kind].total_packets_in;
  const percentPacketsLost =
    packetsReceived !== previousBunch[kind].total_packets_in
      ? (deltaPacketsLost * 100) / (deltaPacketsLost + deltaPacketsReceived)
      : 0.0;
  const KBytesReceived = (Number(bunch[PROPERTY.BYTES_RECEIVED]) / 1024) - (referenceReport ? referenceReport[kind].total_KBytes_in : 0);
  const deltaKBytesReceived = KBytesReceived - previousBunch[kind].total_KBytes_in;
  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();
  const referenceTimestamp = referenceReport ? referenceReport.timestamp : null;
  let previousTimestamp = previousBunch.timestamp;
  if (!previousTimestamp && referenceTimestamp) {
    previousTimestamp = referenceTimestamp;
  }
  const deltaMs = previousTimestamp ? timestamp - previousTimestamp : 0;
  const kbsReceived = deltaMs > 0 ? ((deltaKBytesReceived * 0.008 * 1024) / deltaMs) * 1000 : 0; // kbs = kilo bits per second

  return {
    percentPacketsLost,
    packetsReceived,
    deltaPacketsReceived,
    packetsLost,
    deltaPacketsLost,
    KBytesReceived,
    deltaKBytesReceived,
    kbsReceived,
  };
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

const extractVideoSize = (bunch, previousBunch, direction) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAME_HEIGHT) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FRAME_WIDTH)
  ) {
    return { width: 0, height: 0, framerate: 0 };
  }

  const width = bunch[PROPERTY.FRAME_WIDTH] || 0;
  const height = bunch[PROPERTY.FRAME_HEIGHT] || 0;
  let framerate = fixed2(bunch[PROPERTY.FRAMES_PER_SECOND] || 0);

  const frames = direction === DIRECTION.INBOUND ? bunch[PROPERTY.FRAMES_DECODED] : bunch[PROPERTY.FRAMES_ENCODED];
  if (previousBunch) {
    const previousFrames = direction === DIRECTION.INBOUND ? previousBunch[PROPERTY.FRAMES_DECODED] : previousBunch[PROPERTY.FRAMES_ENCODED];
    const period = (bunch.timestamp - previousBunch.timestamp) / 1000; // in seconds
    const deltaFrames = frames - previousFrames;
    if (period !== 0) {
      let divider = 1;
      if (direction === DIRECTION.OUTBOUND && bunch[PROPERTY.SCALABILITY_MODE]) {
        const scalabilityMode = bunch[PROPERTY.SCALABILITY_MODE];
        if (scalabilityMode.startsWith("L2") || scalabilityMode.startsWith("S2")) {
          divider = 2;
        } else if (scalabilityMode.startsWith("L3") || scalabilityMode.startsWith("S3")) {
          divider = 3;
        }
      }
      framerate = fixed2(deltaFrames / period / divider);
    }
  }

  return {
    width,
    height,
    framerate,
  };
};

const extractQualityLimitation = (bunch) => {
  const reason = Object.prototype.hasOwnProperty.call(
    bunch,
    PROPERTY.QUALITY_LIMITATION_REASON,
  )
    ? bunch[PROPERTY.QUALITY_LIMITATION_REASON]
    : null;
  const resolutionChanges = Object.prototype.hasOwnProperty.call(
    bunch,
    PROPERTY.QUALITY_LIMITATION_RESOLUTION_CHANGES,
  )
    ? bunch[PROPERTY.QUALITY_LIMITATION_RESOLUTION_CHANGES]
    : null;
  const durations = Object.prototype.hasOwnProperty.call(
    bunch,
    PROPERTY.QUALITY_LIMITATION_DURATIONS,
  )
    ? bunch[PROPERTY.QUALITY_LIMITATION_DURATIONS]
    : null;

  if (durations) {
    Object.keys(durations).forEach((key) => {
      if (durations[key] > 1000) {
        durations[key] = Number(durations[key] / 1000);
      }
    });
  }
  return { reason, durations, resolutionChanges };
};

const extractVideoGlitch = (bunch, kind, previousReport, referenceReport) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.FREEZE_COUNT) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PAUSE_COUNT)
  ) {
    return {
      freezeCount: previousReport[kind].total_glitch_in.freeze,
      pauseCount: previousReport[kind].total_glitch_in.pause,
      deltaFreezeCount: 0,
      deltaPauseCount: 0,
    };
  }

  const freezeCount = (bunch[PROPERTY.FREEZE_COUNT] || 0) - (referenceReport ? referenceReport[kind].total_glitch_in.freeze : 0);
  const pauseCount = (bunch[PROPERTY.PAUSE_COUNT] || 0) - (referenceReport ? referenceReport[kind].total_glitch_in.pause : 0);

  return {
    freezeCount,
    pauseCount,
    deltaFreezeCount: freezeCount - previousReport[kind].total_glitch_in.freeze,
    deltaPauseCount: pauseCount - previousReport[kind].total_glitch_in.pause,
  };
};

const extractNackAndPliCountSentWhenReceiving = (bunch, previousReport, referenceReport) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)
  ) {
    return {
      pliCount: previousReport.total_pli_sent_in,
      nackCount: previousReport.total_nack_sent_in,
      deltaPliCount: 0,
      deltaNackCount: 0,
    };
  }

  const pliCount = (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport[VALUE.VIDEO].total_pli_sent_in : 0);
  const nackCount = (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport[VALUE.VIDEO].total_nack_sent_in : 0);

  return {
    pliCount,
    nackCount,
    deltaPliCount: pliCount - previousReport[VALUE.VIDEO].total_pli_sent_in,
    deltaNackCount: nackCount - previousReport[VALUE.VIDEO].total_nack_sent_in,
  };
};

const extractNackAndPliCountReceivedWhenSending = (bunch, previousReport, referenceReport) => {
  if (
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.PLI) ||
    !Object.prototype.hasOwnProperty.call(bunch, PROPERTY.NACK)
  ) {
    return {
      pliCount: previousReport.total_pli_received_out,
      nackCount: previousReport.total_nack_received_out,
      deltaPliCount: 0,
      deltaNackCount: 0,
    };
  }

  const pliCount = (bunch[PROPERTY.PLI] || 0) - (referenceReport ? referenceReport[VALUE.VIDEO].total_pli_received_out : 0);
  const nackCount = (bunch[PROPERTY.NACK] || 0) - (referenceReport ? referenceReport[VALUE.VIDEO].total_nack_received_out : 0);

  return {
    pliCount,
    nackCount,
    deltaPliCount: pliCount - previousReport[VALUE.VIDEO].total_pli_received_out,
    deltaNackCount: nackCount - previousReport[VALUE.VIDEO].total_nack_received_out,
  };
};

const extractAudioCodec = (bunch) => ({
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
  const totalKBytesReceived =
    (bunch[PROPERTY.BYTES_RECEIVED] || 0) / 1024 -
    (referenceReport ? referenceReport.data.total_KBytes_in : 0);
  const totalKBytesSent =
    (bunch[PROPERTY.BYTES_SENT] || 0) / 1024 -
    (referenceReport ? referenceReport.data.total_KBytes_out : 0);

  const timestamp = bunch[PROPERTY.TIMESTAMP] || Date.now();
  const KBytesReceived =
    totalKBytesReceived - previousBunch.data.total_KBytes_in;
  const KBytesSent = totalKBytesSent - previousBunch.data.total_KBytes_out;

  const referenceTimestamp = referenceReport ? referenceReport.timestamp : null;
  let previousTimestamp = previousBunch.timestamp;
  if (!previousTimestamp && referenceTimestamp) {
    previousTimestamp = referenceTimestamp;
  }
  const deltaMs = previousTimestamp ? timestamp - previousTimestamp : 0;
  const kbsSpeedReceived =
    deltaMs > 0 ? ((KBytesReceived * 0.008 * 1024) / deltaMs) * 1000 : 0; // kbs = kilo bits per second
  const kbsSpeedSent =
    deltaMs > 0 ? ((KBytesSent * 0.008 * 1024) / deltaMs) * 1000 : 0;

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
  const kbsIncomingBandwidth =
    bunch[PROPERTY.AVAILABLE_INCOMING_BITRATE] / 1024 || 0;
  const kbsOutgoingBandwidth =
    bunch[PROPERTY.AVAILABLE_OUTGOING_BITRATE] / 1024 || 0;

  return {
    kbs_incoming_bandwidth: kbsIncomingBandwidth,
    kbs_outgoing_bandwidth: kbsOutgoingBandwidth,
  };
};

export const extract = (bunch, previousBunch, pname, referenceReport, raw, oldRaw, _refPC) => {
  if (!bunch) {
    return [];
  }

  debug(
    moduleName,
    `analyze() - got stats ${bunch[PROPERTY.TYPE]} for ${pname}`,
    bunch,
  );

  switch (bunch[PROPERTY.TYPE]) {
    case TYPE.CANDIDATE_PAIR:
      let selectedPairForFirefox = false;
      let selectedPair = false;
      // get Transport report
      if (raw.has(bunch[PROPERTY.TRANSPORT_ID])) {
        const transportReport = raw.get(bunch[PROPERTY.TRANSPORT_ID]);
        if (transportReport[PROPERTY.SELECTED_CANDIDATEPAIR_ID] === bunch[PROPERTY.ID]) {
          selectedPair = true;
        }
      }

      // FF: NO RTCTransportStats report - Use candidate-pair with selected=true
      if (PROPERTY.SELECTED in bunch && bunch[PROPERTY.SELECTED]) {
        selectedPairForFirefox = true;
      }

      if (selectedPair || selectedPairForFirefox) {
        const localCandidateId = bunch[PROPERTY.LOCAL_CANDIDATE_ID];
        const remoteCandidateId = bunch[PROPERTY.REMOTE_CANDIDATE_ID];
        const selectedCandidatePairId = bunch[PROPERTY.ID];

        const valueSentReceived = extractBytesSentReceived(
          bunch,
          previousBunch,
          referenceReport,
        );
        const bandwidth = extractAvailableBandwidth(bunch);
        const rttConnectivity = extractRTTBasedOnSTUNConnectivityCheck(
          bunch,
          "data",
          referenceReport,
          previousBunch,
        );

        const result = [
          {
            type: STAT_TYPE.NETWORK,
            value: { local_candidate_id: localCandidateId },
          },
          {
            type: STAT_TYPE.NETWORK,
            value: { remote_candidate_id: remoteCandidateId },
          },
          {
            type: STAT_TYPE.DATA,
            value: { total_KBytes_in: valueSentReceived.total_KBytes_received },
          },
          {
            type: STAT_TYPE.DATA,
            value: { total_KBytes_out: valueSentReceived.total_KBytes_sent },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_KBytes_in: valueSentReceived.delta_KBytes_received },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_KBytes_out: valueSentReceived.delta_KBytes_sent },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_kbs_in: valueSentReceived.kbs_speed_received },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_kbs_out: valueSentReceived.kbs_speed_sent },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_kbs_bandwidth_in: bandwidth.kbs_incoming_bandwidth },
          },
          {
            type: STAT_TYPE.DATA,
            value: {
              delta_kbs_bandwidth_out: bandwidth.kbs_outgoing_bandwidth,
            },
          },
          {
            type: STAT_TYPE.DATA,
            value: { delta_rtt_connectivity_ms: rttConnectivity.rtt },
          },
          {
            type: STAT_TYPE.DATA,
            value: { total_rtt_connectivity_ms: rttConnectivity.totalRTT },
          },
          {
            type: STAT_TYPE.DATA,
            value: {
              total_rtt_connectivity_measure:
                rttConnectivity.totalRTTMeasurements,
            },
          },
        ];

        if (selectedPairForFirefox) {
          result.push(
            {
              type: STAT_TYPE.NETWORK,
              internal: "selectedPairChanged",
              value: { selected_candidate_pair_id: selectedCandidatePairId },
            },
          );
        }
        return result;
      }
      break;
    case TYPE.LOCAL_CANDIDATE:
      if (bunch[PROPERTY.ID] === previousBunch.network.local_candidate_id) {
        return [
          {
            type: STAT_TYPE.NETWORK,
            value: { infrastructure: extractInfrastructureValue(bunch) },
          },
          {
            type: STAT_TYPE.NETWORK,
            value: {
              local_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "",
            },
          },
          {
            type: STAT_TYPE.NETWORK,
            value: { local_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "" },
          },
          {
            type: STAT_TYPE.NETWORK,
            value: {
              local_candidate_relay_protocol: extractRelayProtocolUsed(bunch),
            },
          },
        ];
      }
      break;
    case TYPE.REMOTE_CANDIDATE:
      if (bunch[PROPERTY.ID] === previousBunch.network.remote_candidate_id) {
        return [
          {
            type: STAT_TYPE.NETWORK,
            value: {
              remote_candidate_type: bunch[PROPERTY.CANDIDATE_TYPE] || "",
            },
          },
          {
            type: STAT_TYPE.NETWORK,
            value: {
              remote_candidate_protocol: bunch[PROPERTY.PROTOCOL] || "",
            },
          },
        ];
      }
      break;
    case TYPE.INBOUND_RTP: {
      // get SSRC and associated data
      const ssrc = bunch[PROPERTY.SSRC];
      const previousSSRCBunch = getSSRCDataFromBunch(ssrc, previousBunch, DIRECTION.INBOUND);
      if (previousSSRCBunch) {
        previousSSRCBunch.timestamp = previousBunch.timestamp;
      }
      const referenceSSRCBunch = getSSRCDataFromBunch(ssrc, referenceReport, DIRECTION.INBOUND);
      if (referenceSSRCBunch) {
        referenceSSRCBunch.timestamp = referenceReport.timestamp;
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        // Packets stats and Bytes
        const data = extractAudioVideoPacketReceived(
            bunch,
            VALUE.AUDIO,
            previousSSRCBunch,
            referenceSSRCBunch,
        );

        // Jitter stats
        const jitter = extractLastJitter(bunch, VALUE.AUDIO, previousSSRCBunch);

        // Codec stats
        const audioInputCodecId = bunch[PROPERTY.CODEC_ID] || "";

        // Audio level in
        const audioLevel = bunch[PROPERTY.AUDIO_LEVEL] || 0;

        // average playout delay
        let playout = null;
        if (raw.has(bunch[PROPERTY.PLAYOUT_ID])) {
          const playoutReport = raw.get(bunch[PROPERTY.PLAYOUT_ID]);
          const previousPlayoutReport = oldRaw ? oldRaw.get(bunch[PROPERTY.PLAYOUT_ID]) : null;
          playout = extractPlayoutInformation(playoutReport, previousPlayoutReport);
        }

        const jitterBuffer = extractJitterBufferInfo(bunch, VALUE.AUDIO, previousSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { codec_id_in: audioInputCodecId },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_packets_in: data.packetsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_packets_in: data.deltaPacketsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_packets_lost_in: data.packetsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_packets_lost_in: data.deltaPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { percent_packets_lost_in: data.percentPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_KBytes_in: data.KBytesReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "bytesReceivedChanged",
            value: { delta_KBytes_in: data.deltaKBytesReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_kbs_in: data.kbsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_jitter_ms_in: jitter },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_jitter_buffer_delay_ms_in: jitterBuffer.delta_ms_jitter_buffer_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_time_jitter_buffer_delay_in: jitterBuffer.total_time_jitter_buffer_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_jitter_emitted_in: jitterBuffer.total_time_jitter_emitted },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { track_in: bunch[PROPERTY.TRACK_IDENTIFIER] },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "ssrcIdentifierIn",
            value: { ssrc_in: bunch[PROPERTY.SSRC] },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { level_in: audioLevel },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_synthetized_ms_in: playout ? playout.delta_synthetized_ms_in : 0 },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_synthetized_ms_in: playout ? playout.total_synthetized_ms_in : 0 },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_playout_delay_ms_in: playout ? playout.delta_playout_delay_ms_in : 0 },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_playout_ms_in: playout ? playout.total_playout_ms_in : 0 },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { percent_synthetized_in: playout ? playout.percent_synthetized_in : 0 },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_percent_synthetized_in: playout ? playout.total_percent_synthetized_in : 0 },
          },
        ];
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        // Decode time stats
        const data = extractDecodeTime(bunch, previousSSRCBunch);

        // Packets stats and Bytes
        const packetsData = extractAudioVideoPacketReceived(
            bunch,
            VALUE.VIDEO,
            previousSSRCBunch,
            referenceSSRCBunch,
        );

        // Jitter stats
        const jitter = extractLastJitter(bunch, VALUE.VIDEO, previousSSRCBunch);

        // Codec stats
        const decoderImplementation =
            bunch[PROPERTY.DECODER_IMPLEMENTATION] || null;
        const videoInputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // Video size
        const oldBunch = oldRaw ? oldRaw.get(bunch[PROPERTY.ID]) : null;
        const inputVideo = extractVideoSize(bunch, oldBunch, DIRECTION.INBOUND);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountSentWhenReceiving(
          bunch,
          previousSSRCBunch,
          referenceSSRCBunch,
        );

        // Glitch
        const freezePauseData = extractVideoGlitch(bunch, VALUE.VIDEO, previousSSRCBunch, referenceSSRCBunch);

        // Jitter buffer
        const jitterBuffer = extractJitterBufferInfo(bunch, VALUE.AUDIO, previousSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { codec_id_in: videoInputCodecId },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_packets_in: packetsData.packetsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_packets_in: packetsData.deltaPacketsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_packets_lost_in: packetsData.packetsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_packets_lost_in: packetsData.deltaPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { percent_packets_lost_in: packetsData.percentPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_KBytes_in: packetsData.KBytesReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "bytesReceivedChanged",
            value: { delta_KBytes_in: packetsData.deltaKBytesReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_kbs_in: packetsData.kbsReceived },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_jitter_ms_in: jitter },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_jitter_buffer_delay_ms_in: jitterBuffer.delta_ms_jitter_buffer_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_jitter_buffer_delay_in: jitterBuffer.total_time_jitter_buffer_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_jitter_emitted_in: jitterBuffer.total_time_jitter_emitted },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { decoder_in: decoderImplementation },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_decode_frame_ms_in: data.delta_ms_decode_frame },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_frames_decoded_in: data.frames_decoded },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_processing_delay_ms_in: data.delta_ms_processing_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_processing_delay_in: data.total_time_processing_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_assembly_delay_ms_in: data.delta_ms_assembly_delay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_assembly_delay_in: data.total_assembly_time },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_decoded_in: data.total_decode_time },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_nack_sent_in: nackPliData.nackCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_nack_sent_in: nackPliData.deltaNackCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_pli_sent_in: nackPliData.pliCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_pli_sent_in: nackPliData.deltaPliCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { size_in: inputVideo },
            internal: "inputSizeChanged",
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { track_in: bunch[PROPERTY.TRACK_IDENTIFIER] },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "ssrcIdentifierIn",
            value: { ssrc_in: bunch[PROPERTY.SSRC] },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: {
              total_glitch_in: { freeze: freezePauseData.freezeCount, pause: freezePauseData.pauseCount },
              delta_glitch_in: { freeze: freezePauseData.deltaFreezeCount, pause: freezePauseData.deltaPauseCount },
            },
            internal: "glitchChanged",
          },
        ];
      }
      break;
    }
    case TYPE.OUTBOUND_RTP: {
      const active = !!bunch[PROPERTY.MEDIA_SOURCE_ID];

      // get SSRC and associated data
      const ssrc = bunch[PROPERTY.SSRC];
      const previousSSRCBunch = getSSRCDataFromBunch(ssrc, previousBunch, DIRECTION.OUTBOUND);
      if (previousSSRCBunch) {
        previousSSRCBunch.timestamp = previousBunch.timestamp;
      }
      const referenceSSRCBunch = getSSRCDataFromBunch(ssrc, referenceReport, DIRECTION.OUTBOUND);
      if (referenceSSRCBunch) {
        referenceSSRCBunch.timestamp = referenceReport.timestamp;
      }

      let trackOut = "";
      let audioLevel = 0;
      let size = { width: 0, height: 0, framerate: 0 };
      if (active && raw.has(bunch[PROPERTY.MEDIA_SOURCE_ID])) {
        const mediaSourceReport = raw.get(bunch[PROPERTY.MEDIA_SOURCE_ID]);
        trackOut = mediaSourceReport[PROPERTY.TRACK_IDENTIFIER];
        if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
          audioLevel = mediaSourceReport[PROPERTY.AUDIO_LEVEL];
        } else {
          size = { width: mediaSourceReport[PROPERTY.WIDTH] || null, height: mediaSourceReport[PROPERTY.HEIGHT] || null, framerate: mediaSourceReport[PROPERTY.FRAMES_PER_SECOND] || null };
        }
      }

      let deviceLabel = "";
      if (trackOut) {
        const track = findTrackInPeerConnectionById(trackOut, _refPC);
        if (track) {
          deviceLabel = track.label;
        }
      }

      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.AUDIO) {
        const audioOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // FF: no media-source, try to find the track from the sender (first track of kind found)
        if (!trackOut) {
          const track = findOutgoingTrackFromPeerConnectionByKind("audio", _refPC);
          if (track) {
            trackOut = track.id;
            deviceLabel = track.label;
          }
        }

        // packets and bytes
        const data = extractAudioVideoPacketSent(bunch, VALUE.AUDIO, previousSSRCBunch, referenceSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "mediaSourceUpdated",
            value: { active_out: active },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { device_out: deviceLabel },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { codec_id_out: audioOutputCodecId },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_packets_out: data.packetsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_packets_out: data.deltaPacketsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_packet_delay_ms_out: data.deltaAvgPacketSendDelay },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_time_packets_delay_out: data.totalPacketSendDelay },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_KBytes_out: data.KBytesSent },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "bytesSentChanged",
            value: { delta_KBytes_out: data.deltaKBytesSent },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_kbs_out: data.kbsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "deviceChanged",
            value: { track_out: trackOut },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { level_out: audioLevel },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            internal: "ssrcIdentifierOut",
            value: { ssrc_out: bunch[PROPERTY.SSRC] },
          },
        ];
      }
      if (bunch[PROPERTY.MEDIA_TYPE] === VALUE.VIDEO) {
        const encoderImplementation = bunch[PROPERTY.ENCODER_IMPLEMENTATION] || null;
        const videoOutputCodecId = bunch[PROPERTY.CODEC_ID] || null;

        // FF: no media-source, try to find the track from the sender (first track of kind found)
        if (!trackOut) {
          const track = findOutgoingTrackFromPeerConnectionByKind("video", _refPC);
          if (track) {
            trackOut = track.id;
            deviceLabel = track.label;
          }
        }

        // Encode time
        const data = extractEncodeTime(bunch, previousSSRCBunch);

        // Video size
        const oldBunch = oldRaw ? oldRaw.get(bunch[PROPERTY.ID]) : null;
        const outputVideo = extractVideoSize(bunch, oldBunch, DIRECTION.OUTBOUND);

        // limitations
        const limitationOut = extractQualityLimitation(bunch);

        // Nack & Pli stats
        const nackPliData = extractNackAndPliCountReceivedWhenSending(
          bunch,
          previousSSRCBunch,
          referenceSSRCBunch,
        );

        // packets and bytes
        const dataSent = extractAudioVideoPacketSent(bunch, VALUE.VIDEO, previousSSRCBunch, referenceSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "mediaSourceUpdated",
            value: { active_out: active },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { device_out: deviceLabel },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { codec_id_out: videoOutputCodecId },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_packets_out: dataSent.packetsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_packets_out: dataSent.deltaPacketsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_packet_delay_ms_out: dataSent.deltaAvgPacketSendDelay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_packets_delay_out: dataSent.totalPacketSendDelay },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_KBytes_out: dataSent.KBytesSent },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "bytesSentChanged",
            value: { delta_KBytes_out: dataSent.deltaKBytesSent },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_kbs_out: dataSent.kbsSent },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { encoder_out: encoderImplementation },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_encode_frame_ms_out: data.delta_ms_encode_frame },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_frames_encoded_out: data.frames_encoded },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_time_encoded_out: data.total_encode_time },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_nack_received_out: nackPliData.nackCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_nack_received_out: nackPliData.deltaNackCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_pli_received_out: nackPliData.pliCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_pli_received_out: nackPliData.deltaPliCount },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { size_out: outputVideo },
            internal: "outputSizeChanged",
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { limitation_out: limitationOut },
            internal: "videoLimitationChanged",
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "deviceChanged",
            value: { track_out: trackOut },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { size_pref_out: size },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            internal: "ssrcIdentifierOut",
            value: { ssrc_out: bunch[PROPERTY.SSRC] },
          },
        ];
      }
      break;
    }
    case TYPE.MEDIA_SOURCE: {
      break;
    }
    case TYPE.CODEC:
      const result = [];
      // Check for Audio codec
      Object.keys(previousBunch[VALUE.AUDIO]).forEach((ssrc) => {
        const ssrcAudioBunch = previousBunch[VALUE.AUDIO][ssrc];
        if ((ssrcAudioBunch.codec_id_in === bunch[PROPERTY.ID]) || (ssrcAudioBunch.codec_id_out === bunch[PROPERTY.ID])) {
          const codec = extractAudioCodec(bunch);
          if (bunch[PROPERTY.ID] === ssrcAudioBunch.codec_id_in) {
            result.push({ ssrc: ssrcAudioBunch.ssrc, type: STAT_TYPE.AUDIO, value: { codec_in: codec } });
          } else {
            result.push({ ssrc: ssrcAudioBunch.ssrc, type: STAT_TYPE.AUDIO, value: { codec_out: codec } });
          }
        }
      });

      // Check for Video codec
      Object.keys(previousBunch[VALUE.VIDEO]).forEach((ssrc) => {
        const ssrcVideoBunch = previousBunch[VALUE.VIDEO][ssrc];
        if ((ssrcVideoBunch.codec_id_in === bunch[PROPERTY.ID]) || (ssrcVideoBunch.codec_id_out === bunch[PROPERTY.ID])) {
          const codec = extractVideoCodec(bunch);
          if (bunch[PROPERTY.ID] === ssrcVideoBunch.codec_id_in) {
            result.push({ ssrc: ssrcVideoBunch.ssrc, type: STAT_TYPE.VIDEO, value: { codec_in: codec } });
          } else {
            result.push({ ssrc: ssrcVideoBunch.ssrc, type: STAT_TYPE.VIDEO, value: { codec_out: codec } });
          }
        }
      });
      return result;
    case TYPE.REMOTE_INBOUND_RTP: {
      // get SSRC and associated data
      const ssrc = bunch[PROPERTY.SSRC];
      const previousSSRCBunch = getSSRCDataFromBunch(ssrc, previousBunch, DIRECTION.OUTBOUND);
      const referenceSSRCBunch = getSSRCDataFromBunch(ssrc, referenceReport, DIRECTION.OUTBOUND);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(
            bunch,
            VALUE.AUDIO,
            referenceSSRCBunch,
            previousSSRCBunch,
        );

        // Jitter (out)
        const jitter = extractLastJitter(bunch, VALUE.AUDIO, previousSSRCBunch);

        // Packets lost
        const packets = extractAudioVideoPacketLost(bunch, VALUE.AUDIO, previousSSRCBunch, referenceSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_rtt_ms_out: data.rtt },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_rtt_ms_out: data.totalRTT },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_rtt_measure_out: data.totalRTTMeasurements },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_jitter_ms_out: jitter },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { timestamp_out: bunch[PROPERTY.TIMESTAMP] },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_packets_lost_out: packets.packetsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_packets_lost_out: packets.deltaPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { percent_packets_lost_out: packets.fractionLost },
          },
        ];
      }

      if (bunch[PROPERTY.KIND] === VALUE.VIDEO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(
            bunch,
            VALUE.VIDEO,
            referenceSSRCBunch,
            previousSSRCBunch,
        );

        // Jitter (out)
        const jitter = extractLastJitter(bunch, VALUE.VIDEO, previousSSRCBunch);

        // Packets lost
        const packets = extractAudioVideoPacketLost(bunch, VALUE.VIDEO, previousSSRCBunch, referenceSSRCBunch);

        return [
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_rtt_ms_out: data.rtt },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_rtt_ms_out: data.totalRTT },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_rtt_measure_out: data.totalRTTMeasurements },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_jitter_ms_out: jitter },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { timestamp_out: bunch[PROPERTY.TIMESTAMP] },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { total_packets_lost_out: packets.packetsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { delta_packets_lost_out: packets.deltaPacketsLost },
          },
          {
            ssrc,
            type: STAT_TYPE.VIDEO,
            value: { percent_packets_lost_out: packets.fractionLost },
          },
        ];
      }
      break;
    }
    case TYPE.REMOTE_OUTBOUND_RTP: {
      // get SSRC and associated data
      const ssrc = bunch[PROPERTY.SSRC];
      const previousSSRCBunch = getSSRCDataFromBunch(ssrc, previousBunch, DIRECTION.OUTBOUND);
      const referenceSSRCBunch = getSSRCDataFromBunch(ssrc, referenceReport, DIRECTION.OUTBOUND);
      if (bunch[PROPERTY.KIND] === VALUE.AUDIO) {
        // Round Trip Time based on RTCP
        const data = extractRTTBasedOnRTCP(
          bunch,
          VALUE.AUDIO,
          referenceSSRCBunch,
          previousSSRCBunch,
        );

        return [
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { delta_rtt_ms_in: data.rtt },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_rtt_ms_in: data.totalRTT },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { total_rtt_measure_in: data.totalRTTMeasurements },
          },
          {
            ssrc,
            type: STAT_TYPE.AUDIO,
            value: { timestamp_in: bunch[PROPERTY.TIMESTAMP] },
          },
        ];
      }
      break;
    }
    case TYPE.TRANSPORT: {
      const selectedCandidatePairId = bunch[PROPERTY.SELECTED_CANDIDATEPAIR_ID];
      return [
        {
          type: STAT_TYPE.NETWORK,
          internal: "selectedPairChanged",
          value: { selected_candidate_pair_id: selectedCandidatePairId },
        },
      ];
    }
    default:
      break;
  }

  // No interesting data
  return [];
};

export const extractPassthroughFields = (bunch, oldBunch, passthrough) => {
  const convertTable = {
    kbits: (valueInBytes) => ((valueInBytes * 8) / 1000),
    ms: (valueInSeconds) => (valueInSeconds * 1000),
    asis: (value) => (value),
  };

  if (!bunch) {
    return {};
  }

  // Don't add measure if identical report
  if (oldBunch && ((oldBunch.timestamp === bunch.timestamp) || (oldBunch.remoteTimestamp && (oldBunch.remoteTimestamp === bunch.remoteTimestamp)))) {
    return {};
  }

  // Example {"inbound-rtp": ["jitter.ms", "ps:bytesReceived"]}
  const fieldsToReport = (passthrough && passthrough[bunch[PROPERTY.TYPE]]) || [];

  const pass = {};
  if (fieldsToReport.length > 0) {
    const ref = bunch[PROPERTY.SSRC] || bunch[PROPERTY.ID];
    const kind = bunch[PROPERTY.KIND] || "";
    const id = `${bunch.type}${kind ? `_${kind}` : "_*"}=${ref}`;
    fieldsToReport.forEach((fields) => {
      // Collect properties (normally one, but several in case of an operation)
      let properties = [fields];
      let operand = "";
      if (fields.startsWith("[") && fields.endsWith("]")) {
        const operation = fields.substring(1, fields.length - 1);
        if (operation.includes("/")) {
          operand = "/";
        } else if (operation.includes("+")) {
          operand = "+";
        } else if (operation.includes("*")) {
          operand = "*";
        } else if (operation.includes("-")) {
          operand = "-";
        }

        properties = operation.split(operand);
      }

      // For each prop, get the value if exists in the report
      const values = [];
      properties.forEach((prop) => {
        const hasMethod = prop.split(":").length > 1;
        const hasMetric = prop.split(".").length > 1;
        const method = hasMethod ? prop.split(":")[0] : "total";
        const metric = hasMetric ? prop.split(".")[1] : "asis";
        const property = hasMethod ? prop.split(":")[1].split(".")[0] : prop.split(".")[0];

        if (property in bunch) {
          let value = convertTable[metric](bunch[property]);
          const currentTimestamp = bunch[PROPERTY.REMOTE_TIMESTAMP] || bunch[PROPERTY.TIMESTAMP];
          if (method === "ps" && oldBunch) {
            const deltaValue = value - convertTable[metric](oldBunch[property]);
            const deltaTimestamp = currentTimestamp - (oldBunch[PROPERTY.REMOTE_TIMESTAMP] || oldBunch[PROPERTY.TIMESTAMP]);
            value = (deltaValue / deltaTimestamp) * 1000;
          }
          values.push({ fields, property, value });
        }
      });

      // Only one result, return it
      if (values.length === 1) {
        const result = values[0];
        if (!(result.property in pass)) {
          pass[result.property] = {};
        }
        pass[result.property][id] = result.value;
        // Several result, compute the operation
      } else if (values.length > 1) {
        const first = values.shift();

        const value = values.reduce((acc, current) => {
          switch (operand) {
            case "+":
              return acc + current.value;
            case "/":
              if (current.value !== 0) {
                return acc / current.value;
              }
              return acc;
            case "*":
              return acc * current.value;
            case "-":
              return acc - current.value;
            default:
              return acc + current.value;
          }
        }, first.value);
        if (!(values[0].fields in pass)) {
          pass[values[0].fields] = {};
        }
        pass[values[0].fields][id] = value;
      }
    });
  }

  return pass;
};
