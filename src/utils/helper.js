import { v4 as uuidv4 } from "uuid";

export const getLibName = () => ("WebRTCMetrics");
export const getVersion = () => ("1.2.4");

export const getDefaultMetric = () => (
  {
    pname: "",
    call_id: "",
    user_id: "",
    timestamp: null,
    audio: {
      input_level: 0,
      output_level: 0,
      input_codec: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
      output_codec: { mime_type: null, clock_rate: null, sdp_fmtp_line: null },
      last_three_jitter: [0, 0, 0],
      percent_packets_lost: null,
      delta_packets_received: 0,
      delta_packets_lost: 0,
      total_packets_received: 0,
      total_packets_lost: 0,
      total_bytes_received: 0,
      delta_bytes_received: 0,
      total_bytes_sent: 0,
      delta_bytes_sent: 0,
      mos: 0,
    },
    video: {
      input_size: { width: null, height: null },
      output_size: { width: null, height: null },
      input_codec: { mime_type: null, clock_rate: null },
      output_codec: { mime_type: null, clock_rate: null },
      total_bytes_received: 0,
      delta_bytes_received: 0,
      total_bytes_sent: 0,
      delta_bytes_sent: 0,
      decoder: null,
      encoder: null,
      delta_ms_encode_frame: 0,
      delta_ms_decode_frame: 0,
    },
    network: {
      infrastructure: 3,
      local_candidate_type: "",
      local_candidate_protocol: "",
      remote_candidate_type: "",
      remote_candidate_protocol: "",
    },
    data: {
      last_three_rtt: [0, 0, 0],
      total_bytes_received: 0,
      total_bytes_sent: 0,
      delta_bytes_received: 0,
      delta_bytes_sent: 0,
      delta_kbs_received: 0,
      delta_kbs_sent: 0,
    },
  }
);

export const defaultConfig = {
  refreshTimer: 2500, // Default - generate a report every 2,5s
  verbose: false, // Default - minimal logs
  pname: `p-${uuidv4()}`, // Default - peer connection name
  cid: `c-${uuidv4()}`, // Default - call identifier
  uid: `u-${uuidv4()}`, // Default - user identifier
  record: false, // Default - no record,
  recordFields: ["*"], // Default all fields stored
};

export const TYPE = {
  CANDIDATE_PAIR: "candidate-pair",
  CODEC: "codec",
  INBOUND_RTP: "inbound-rtp",
  LOCAL_CANDIDATE: "local-candidate",
  MEDIA_SOURCE: "media-source",
  OUTBOUND_RTP: "outbound-rtp",
  REMOTE_CANDIDATE: "remote-candidate",
  TRACK: "track",
};

export const PROPERTY = {
  AUDIO_LEVEL: "audioLevel",
  AVAILABLE_OUTGOING_BITRATE: "availableOutgoingBitrate",
  BYTES_RECEIVED: "bytesReceived",
  BYTES_SENT: "bytesSent",
  CANDIDATE_TYPE: "candidateType",
  CHANNELS: "channels",
  CLOCK_RATE: "clockRate",
  CODEC_ID: "codecId",
  CURRENT_ROUND_TRIP_TIME: "currentRoundTripTime",
  FRAME_HEIGHT: "frameHeight",
  FRAME_WIDTH: "frameWidth",
  ID: "id",
  JITTER: "jitter",
  KIND: "kind",
  MEDIA_TYPE: "mediaType",
  MIME_TYPE: "mimeType",
  LOCAL_CANDIDATE_ID: "localCandidateId",
  NETWORK_TYPE: "networkType",
  NOMINATED: "nominated",
  PACKETS_LOST: "packetsLost",
  PACKETS_RECEIVED: "packetsReceived",
  PROTOCOL: "protocol",
  PORT: "port",
  REMOTE_CANDIDATE_ID: "remoteCandidateId",
  REMOTE_SOURCE: "remoteSource",
  SDP_FMTP_LINE: "sdpFmtpLine",
  SELECTED: "selected",
  STATE: "state",
  TIMESTAMP: "timestamp",
  TYPE: "type",
  WRITABLE: "writable",
  DECODER_IMPLEMENTATION: "decoderImplementation",
  ENCODER_IMPLEMENTATION: "encoderImplementation",
  FRAMES_DECODED: "framesDecoded",
  FRAMES_ENCODED: "framesEncoded",
  TOTAL_DECODE_TIME: "totalDecodeTime",
  TOTAL_ENCODE_TIME: "totalEncodeTime",
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

export const average = (nums) => (nums.reduce((a, b) => (a + b)) / nums.length);
