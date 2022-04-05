import ShortUniqueId from "short-unique-id";

const shortUUID = new ShortUniqueId();

export const getLibName = () => ("WebRTCMetrics");
export const getVersion = () => ("4.0.1");

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
  codec_in: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
  delta_jitter_ms_in: 0,
  percent_packets_lost_in: 0,
  delta_packets_in: 0,
  delta_packets_lost_in: 0,
  total_packets_in: 0,
  total_packets_lost_in: 0,
  total_KBytes_in: 0,
  delta_KBytes_in: 0,
  mos_in: 0,
  mos_emodel_in: 0,
  ssrc: "",
  direction: DIRECTION.INBOUND,
};

export const defaultAudioMetricOut = {
  level_out: 0,
  codec_id_out: "",
  codec_out: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
  delta_jitter_ms_out: 0,
  delta_rtt_ms_out: null,
  total_rtt_ms_out: 0,
  total_rtt_measure_out: 0,
  total_KBytes_out: 0,
  delta_KBytes_out: 0,
  remote_timestamp: null,
  ssrc: "",
  direction: DIRECTION.OUTBOUND,
};

export const defaultVideoMetricIn = {
  codec_id_in: "",
  size_in: { width: null, height: null, framerate: null },
  codec_in: { mime_type: null, clock_rate: null },
  delta_jitter_ms_in: 0,
  delta_rtt_ms_out: null,
  percent_packets_lost_in: 0,
  delta_packets_in: 0,
  delta_packets_lost_in: 0,
  total_packets_in: 0,
  total_packets_lost_in: 0,
  total_KBytes_in: 0,
  delta_KBytes_in: 0,
  decoder_in: null,
  delta_ms_decode_frame_in: 0,
  total_frames_decoded_in: 0,
  total_time_decoded_in: 0,
  delta_nack_out: 0,
  delta_pli_out: 0,
  total_nack_out: 0,
  total_pli_out: 0,
  ssrc: "",
  direction: DIRECTION.INBOUND,
};

export const defaultVideoMetricOut = {
  codec_id_out: "",
  size_out: { width: null, height: null, framerate: null },
  codec_out: { mime_type: null, clock_rate: null },
  delta_jitter_ms_out: 0,
  delta_rtt_ms_out: null,
  total_rtt_ms_out: 0,
  total_rtt_measure_out: 0,
  total_KBytes_out: 0,
  delta_KBytes_out: 0,
  encoder_out: null,
  delta_ms_encode_frame_out: 0,
  total_time_encoded_out: 0,
  total_frames_encoded_out: 0,
  delta_nack_in: 0,
  delta_pli_in: 0,
  total_nack_in: 0,
  total_pli_in: 0,
  limitation_out: { reason: null, durations: null, resolutionChanges: 0 },
  remote_timestamp: null,
  ssrc: "",
  direction: DIRECTION.OUTBOUND,
};

export const getDefaultMetric = (previousStats) => {
  const defaultMetrics = {
    pname: "",
    call_id: "",
    user_id: "",
    timestamp: null,
    count: 0,
    audio: [],
    video: [],
    network: {
      infrastructure: 3,
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
      delta_rtt_connectivity_ms_out: null,
      total_rtt_connectivity_ms_out: 0,
      total_rtt_connectivity_measure_out: 0,
    },
    experimental: {
      time_to_measure_ms: 0,
    },
  };

  if (previousStats) {
    const metrics = {
      ...previousStats,
      audio: [],
      video: [],
      data: { ...previousStats.data },
      network: { ...previousStats.network },
      experimental: { ...previousStats.experimental },
    };
    previousStats.audio.forEach((audio) => {
      metrics.audio.push({ ...audio });
    });
    previousStats.video.forEach((video) => {
      metrics.video.push({ ...video });
    });
    return metrics;
  }

  return {
    ...defaultMetrics,
    audio: [],
    video: [],
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
  pname: `p-${shortUUID()}`, // Default - peer connection name
  cid: `c-${shortUUID()}`, // Default - call identifier
  uid: `u-${shortUUID()}`, // Default - user identifier
  record: false, // Default - no record,
  ticket: true, // Default - ticket generated and so all reports are kept
  // recordFields: ["*"], // Default all fields stored
};

export const TYPE = {
  CANDIDATE_PAIR: "candidate-pair",
  CODEC: "codec",
  INBOUND_RTP: "inbound-rtp",
  LOCAL_CANDIDATE: "local-candidate",
  MEDIA_SOURCE: "media-source",
  OUTBOUND_RTP: "outbound-rtp",
  REMOTE_CANDIDATE: "remote-candidate",
  REMOTE_INBOUND_RTP: "remote-inbound-rtp",
  TRACK: "track",
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
  ROUND_TRIP_TIME: "roundTripTime",
  TOTAL_ROUND_TRIP_TIME: "totalRoundTripTime",
  TOTAL_ROUND_TRIP_TIME_MEASUREMENTS: "roundTripTimeMeasurements",
  FRAME_HEIGHT: "frameHeight",
  FRAME_WIDTH: "frameWidth",
  QUALITY_LIMITATION_REASON: "qualityLimitationReason",
  QUALITY_LIMITATION_DURATIONS: "qualityLimitationDurations",
  QUALITY_LIMITATION_RESOLUTION_CHANGES: "qualityLimitationResolutionChanges",
  ID: "id",
  JITTER: "jitter",
  KIND: "kind",
  MEDIA_TYPE: "mediaType",
  MIME_TYPE: "mimeType",
  LOCAL_CANDIDATE_ID: "localCandidateId",
  NETWORK_TYPE: "networkType",
  RELAY_PROTOCOL: "relayProtocol",
  NOMINATED: "nominated",
  PACKETS_LOST: "packetsLost",
  PACKETS_RECEIVED: "packetsReceived",
  PACKETS_SENT: "packetsSent",
  PROTOCOL: "protocol",
  PORT: "port",
  REMOTE_CANDIDATE_ID: "remoteCandidateId",
  REMOTE_SOURCE: "remoteSource",
  RESPONSES_RECEIVED: "responsesReceived",
  SDP_FMTP_LINE: "sdpFmtpLine",
  SSRC: "ssrc",
  SELECTED: "selected",
  STATE: "state",
  TIMESTAMP: "timestamp",
  TYPE: "type",
  WRITABLE: "writable",
  DECODER_IMPLEMENTATION: "decoderImplementation",
  ENCODER_IMPLEMENTATION: "encoderImplementation",
  FRAMES_DECODED: "framesDecoded",
  FRAMES_ENCODED: "framesEncoded",
  FRAMES_PER_SECOND: "framesPerSecond",
  TOTAL_DECODE_TIME: "totalDecodeTime",
  TOTAL_ENCODE_TIME: "totalEncodeTime",
  PLI: "pliCount",
  NACK: "nackCount",
};

export const VALUE = {
  SUCCEEDED: "succeeded",
  AUDIO: "audio",
  VIDEO: "video",
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
