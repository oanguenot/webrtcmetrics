import ShortUniqueId from "short-unique-id";

const shortUUID = new ShortUniqueId();

export const getLibName = () => "WebRTCMetrics";
export const getVersion = () => "5.5.0";

export const DIRECTION = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
};

export const COLLECTOR_STATE = {
  IDLE: "idle",
  RUNNING: "running",
  MUTED: "muted",
};

export const ENGINE_STATE = {
  IDLE: "idle",
  COLLECTING: "collecting",
  ENDED: "ended",
};

export const ICE_CONNECTION_STATE = {
  NEW: "new",
  CHECKING: "checking",
  CONNECTED: "connected",
  COMPLETED: "completed",
  DISCONNECTED: "disconnected",
  FAILED: "failed",
  CLOSED: "closed",
};

export const ICE_GATHERING_STATE = {
  NEW: "new",
  GATHERING: "gathering",
  COMPLETE: "complete",
};

export const getDefaultGlobalMetric = () => {
  const defaultMetrics = {
    delta_time_to_measure_probes_ms: 0, // Total time to measure all probes
    delta_time_consumed_to_measure_ms: 0, // Total time to measure at engine level (additional time needed to compute global stats)
    delta_KBytes_in: 0,
    delta_KBytes_out: 0,
    delta_kbs_in: 0,
    delta_kbs_out: 0,
    total_time_decoded_in: 0,
    total_time_encoded_out: 0,
    probes: [],
  };

  const metrics = {
    ...defaultMetrics,
  };

  return metrics;
};

export const defaultAudioMetricIn = {
  level_in: 0,
  codec_id_in: "",
  codec_in: {
    mime_type: null,
    clock_rate: null,
    sdp_fmtp_line: null,
  },
  track_in: "",
  ssrc: "",
  direction: DIRECTION.INBOUND,
  delta_jitter_ms_in: 0,
  delta_rtt_ms_in: null,
  delta_packets_in: 0,
  delta_packets_lost_in: 0,
  delta_KBytes_in: 0,
  delta_kbs_in: 0,
  delta_synthetized_ms_in: 0,
  delta_playout_delay_ms_in: 0,
  delta_jitter_buffer_delay_ms_in: 0,
  total_rtt_ms_in: 0,
  total_rtt_measure_in: 0,
  total_packets_in: 0,
  total_packets_lost_in: 0,
  total_KBytes_in: 0,
  total_percent_synthetized_in: 0,
  total_synthetized_ms_in: 0,
  total_playout_ms_in: 0,
  total_time_jitter_buffer_delay_in: 0,
  total_jitter_emitted_in: 0,
  percent_synthetized_in: 0,
  timestamp_in: null,
  mos_in: 1,
  percent_packets_lost_in: 0,
};

export const defaultAudioMetricOut = {
  active_out: null,
  level_out: 0,
  codec_id_out: "",
  codec_out: {
    mime_type: null,
    clock_rate: null,
    sdp_fmtp_line: null,
  },
  track_out: "",
  device_out: "",
  ssrc: "",
  direction: DIRECTION.OUTBOUND,
  delta_jitter_ms_out: 0,
  delta_rtt_ms_out: null,
  delta_packet_delay_ms_out: 0,
  delta_packets_lost_out: 0,
  delta_packets_out: 0,
  delta_KBytes_out: 0,
  delta_kbs_out: 0,
  percent_packets_lost_out: 0,
  total_rtt_ms_out: 0,
  total_rtt_measure_out: 0,
  total_time_packets_delay_out: 0,
  total_packets_lost_out: 0,
  total_packets_out: 0,
  total_KBytes_out: 0,
  timestamp_out: null,
  mos_out: 1,
};

export const defaultVideoMetricIn = {
  codec_id_in: "",
  codec_in: {
    mime_type: null,
    clock_rate: null,
  },
  direction: DIRECTION.INBOUND,
  decoder_in: null,
  track_in: "",
  ssrc: "",
  size_in: {
    width: 0,
    height: 0,
    framerate: 0,
  },
  delta_jitter_ms_in: 0,
  delta_packets_in: 0,
  delta_packets_lost_in: 0,
  delta_KBytes_in: 0,
  delta_kbs_in: 0,
  delta_glitch_in: {
    freeze: 0,
    pause: 0,
  },
  delta_decode_frame_ms_in: 0,
  delta_processing_delay_ms_in: 0,
  delta_assembly_delay_ms_in: 0,
  delta_nack_sent_in: 0,
  delta_pli_sent_in: 0,
  delta_jitter_buffer_delay_ms_in: 0,
  percent_packets_lost_in: 0,
  total_packets_in: 0,
  total_packets_lost_in: 0,
  total_KBytes_in: 0,
  total_glitch_in: {
    freeze: 0,
    pause: 0,
  },
  total_frames_decoded_in: 0,
  total_time_decoded_in: 0,
  total_time_processing_delay_in: 0,
  total_time_assembly_delay_in: 0,
  total_time_jitter_buffer_delay_in: 0,
  total_jitter_emitted_in: 0,
  total_nack_sent_in: 0,
  total_pli_sent_in: 0,
};

export const defaultVideoMetricOut = {
  active_out: null,
  codec_id_out: "",
  codec_out: {
    mime_type: null,
    clock_rate: null,
  },
  track_out: "",
  device_out: "",
  ssrc: "",
  direction: DIRECTION.OUTBOUND,
  encoder_out: null,
  size_out: {
    width: 0,
    height: 0,
    framerate: 0,
  },
  size_pref_out: {
    width: 0,
    height: 0,
    framerate: 0,
  },
  delta_jitter_ms_out: 0,
  delta_rtt_ms_out: null,
  delta_packet_delay_ms_out: 0,
  delta_packets_lost_out: 0,
  delta_packets_out: 0,
  delta_KBytes_out: 0,
  delta_kbs_out: 0,
  delta_encode_frame_ms_out: 0,
  delta_nack_received_out: 0,
  delta_pli_received_out: 0,
  total_rtt_ms_out: 0,
  total_rtt_measure_out: 0,
  total_time_packets_delay_out: 0,
  total_packets_lost_out: 0,
  total_packets_out: 0,
  total_KBytes_out: 0,
  total_time_encoded_out: 0,
  total_frames_encoded_out: 0,
  total_nack_received_out: 0,
  total_pli_received_out: 0,
  percent_packets_lost_out: 0,
  limitation_out: {
    reason: null,
    durations: null,
    resolutionChanges: 0,
  },
  timestamp_out: null,
};

export const getDefaultMetric = (previousStats) => {
  const defaultMetrics = {
    pname: "",
    call_id: "",
    user_id: "",
    timestamp: null,
    count: 0,
    audio: {},
    video: {},
    network: {
      infrastructure: 3,
      selected_candidate_pair_id: "",
      local_candidate_id: "",
      local_candidate_type: "",
      local_candidate_protocol: "",
      local_candidate_relay_protocol: "",
      remote_candidate_id: "",
      remote_candidate_type: "",
      remote_candidate_protocol: "",
    },
    data: {
      total_KBytes_in: 0,
      total_KBytes_out: 0,
      delta_KBytes_in: 0,
      delta_KBytes_out: 0,
      delta_kbs_in: 0,
      delta_kbs_out: 0,
      delta_kbs_bandwidth_in: 0,
      delta_kbs_bandwidth_out: 0,
      delta_rtt_connectivity_ms: null,
      total_rtt_connectivity_ms: 0,
      total_rtt_connectivity_measure: 0,
    },
    experimental: {
      time_to_measure_ms: 0,
    },
    passthrough: {},
  };

  if (previousStats) {
    const metrics = {
      ...previousStats,
      audio: {},
      video: {},
      data: { ...previousStats.data },
      network: { ...previousStats.network },
      experimental: { ...previousStats.experimental },
      passthrough: {},
    };
    Object.keys(previousStats.audio)
      .forEach((ssrc) => {
        metrics.audio[ssrc] = { ...previousStats.audio[ssrc] };
      });
    Object.keys(previousStats.video)
      .forEach((ssrc) => {
        metrics.video[ssrc] = { ...previousStats.video[ssrc] };
      });
    return metrics;
  }

  return {
    ...defaultMetrics,
    audio: {},
    video: {},
    data: { ...defaultMetrics.data },
    network: { ...defaultMetrics.network },
    experimental: { ...defaultMetrics.experimental },
  };
};

export const defaultConfig = {
  refreshEvery: 2000, // Default - generate a report every 2s (in ms). Min 1s.
  startAfter: 0, // Default - Duration (in ms) to wait before starting to grab the stats. 0 starts immediately
  stopAfter: -1, // Default - Max duration (in ms) for grabbing the stats. -1 means until calling stop().
  // keepMaxReport: 50, // Keep the last 50 tickets (new one erases the oldest)
  verbose: false, // Default - minimal logs
  silent: false, // Default - no log at all if set to true
  pname: `p-${shortUUID.rnd(10)}`, // Default - peer connection name
  cid: `c-${shortUUID.rnd(10)}`, // Default - call identifier
  uid: `u-${shortUUID.rnd(10)}`, // Default - user identifier
  record: false, // Default - no record,
  ticket: true, // Default - ticket generated and so all reports are kept
  passthrough: {}, // Access to specific fields directly from the stack {"inbound-rtp": ["jitter", "bytesReceived"]}
  disablePeerConnectionEvents: false, // Default - capture peer connection events
};

export const TYPE = {
  CANDIDATE_PAIR: "candidate-pair",
  CODEC: "codec",
  INBOUND_RTP: "inbound-rtp",
  LOCAL_CANDIDATE: "local-candidate",
  MEDIA_PLAYOUT: "media-playout",
  MEDIA_SOURCE: "media-source",
  OUTBOUND_RTP: "outbound-rtp",
  REMOTE_CANDIDATE: "remote-candidate",
  REMOTE_INBOUND_RTP: "remote-inbound-rtp",
  REMOTE_OUTBOUND_RTP: "remote-outbound-rtp",
  TRANSPORT: "transport",
};

export const PROPERTY = {
  AUDIO_LEVEL: "audioLevel",
  AVAILABLE_OUTGOING_BITRATE: "availableOutgoingBitrate",
  AVAILABLE_INCOMING_BITRATE: "availableIncomingBitrate",
  BYTES_RECEIVED: "bytesReceived",
  BYTES_SENT: "bytesSent",
  CANDIDATE_TYPE: "candidateType",
  CHANNELS: "channels",
  CLOCK_RATE: "clockRate",
  CODEC_ID: "codecId",
  CURRENT_ROUND_TRIP_TIME: "currentRoundTripTime",
  DECODER_IMPLEMENTATION: "decoderImplementation",
  ENCODER_IMPLEMENTATION: "encoderImplementation",
  FRACTION_LOST: "fractionLost",
  FRAME_HEIGHT: "frameHeight",
  FRAME_WIDTH: "frameWidth",
  FRAMES_DECODED: "framesDecoded",
  FRAMES_ENCODED: "framesEncoded",
  FRAMES_PER_SECOND: "framesPerSecond",
  FREEZE_COUNT: "freezeCount",
  HEIGHT: "height",
  QUALITY_LIMITATION_REASON: "qualityLimitationReason",
  QUALITY_LIMITATION_DURATIONS: "qualityLimitationDurations",
  QUALITY_LIMITATION_RESOLUTION_CHANGES: "qualityLimitationResolutionChanges",
  ID: "id",
  JITTER: "jitter",
  JITTER_BUFFER_DELAY: "jitterBufferDelay",
  JITTER_BUFFER_EMITTED_COUNT: "jitterBufferEmittedCount",
  KIND: "kind",
  LOCAL_CANDIDATE_ID: "localCandidateId",
  MEDIA_TYPE: "mediaType",
  MIME_TYPE: "mimeType",
  MEDIA_SOURCE_ID: "mediaSourceId",
  NACK: "nackCount",
  NETWORK_TYPE: "networkType",
  NOMINATED: "nominated",
  RELAY_PROTOCOL: "relayProtocol",
  PACKETS_LOST: "packetsLost",
  PACKETS_RECEIVED: "packetsReceived",
  PACKETS_SENT: "packetsSent",
  PAUSE_COUNT: "pauseCount",
  PLAYOUT_ID: "playoutId",
  PLI: "pliCount",
  PROTOCOL: "protocol",
  PORT: "port",
  REMOTE_CANDIDATE_ID: "remoteCandidateId",
  REMOTE_SOURCE: "remoteSource",
  REMOTE_TIMESTAMP: "remoteTimestamp",
  RESPONSES_RECEIVED: "responsesReceived",
  ROUND_TRIP_TIME: "roundTripTime",
  SDP_FMTP_LINE: "sdpFmtpLine",
  SSRC: "ssrc",
  SELECTED: "selected",
  SELECTED_CANDIDATEPAIR_ID: "selectedCandidatePairId",
  SCALABILITY_MODE: "scalabilityMode",
  STATE: "state",
  SYNTHETIZED_SAMPLES_DURATION: "synthesizedSamplesDuration",
  TIMESTAMP: "timestamp",
  TRACK_IDENTIFIER: "trackIdentifier",
  TRANSPORT_ID: "transportId",
  TOTAL_ASSEMBLY_TIME: "totalAssemblyTime",
  TOTAL_DECODE_TIME: "totalDecodeTime",
  TOTAL_ENCODE_TIME: "totalEncodeTime",
  TOTAL_PACKETS_SEND_DELAY: "totalPacketSendDelay",
  TOTAL_PLAYOUT_DELAY: "totalPlayoutDelay",
  TOTAL_PROCESSING_DELAY: "totalProcessingDelay",
  TOTAL_SAMPLES_COUNT: "totalSamplesCount",
  TOTAL_SAMPLES_DURATION: "totalSamplesDuration",
  TOTAL_ROUND_TRIP_TIME: "totalRoundTripTime",
  TOTAL_ROUND_TRIP_TIME_MEASUREMENTS: "roundTripTimeMeasurements",
  TYPE: "type",
  WIDTH: "width",
};

export const VALUE = {
  SUCCEEDED: "succeeded",
  AUDIO: "audio",
  VIDEO: "video",
  DATA: "data",
};

export const INFRASTRUCTURE_VALUE = {
  ETHERNET: 0,
  CELLULAR_5G: 2,
  WIFI: 3, // default
  CELLULAR_4G: 5,
  CELLULAR: 10,
};

export const INFRASTRUCTURE_LABEL = {
  ETHERNET: "ethernet",
  CELLULAR_4G: "cellular",
  WIFI: "wifi",
};

export const STAT_TYPE = {
  AUDIO: "audio",
  VIDEO: "video",
  NETWORK: "network",
  DATA: "data",
};
