# WebRTCMetrics

**WebRTCMetrics** is a JavaScript library that aggregates stats received from the WebRTC stack and generates a JSON report containing a **MOS** for the audio part as well as other interesting information that can help a Web application to analyze in real time the WebRTC metrics.

## Install

Using NPM

```bash
$ npm install webrtcmetrics
```

Using Yarn

```bash
$ yarn add webrtcmetrics
```

## Usage

Once initialized the `RTCPeerConnection`, give it to the `WebRTCMetrics` instance created such as in the following example:

```js
import WebRTCMetrics from "webrtcmetrics";

// Should exist somewhere in your code
const existingPeerConnection = new RTCPeerConnection(config);

// Initialize the analyzer
const analyzer = new WebRTCMetrics(
  { 
    pc: existingPeerConnection, // Peer connection to monitor - Mandatory
    pname: 'PeerConnection_1',  // Name of the peer connection (Optional)
    cid: 'call007984',          // Call Id (Optional)
    uid: 'jdoe@mycorp.com',     // User Id (Optional)
    refreshTimer: 3000,         // Timer to get the metrics (in ms)
    verbose: true,              // Display verbose logs or not
});
analyzer.onmetrics = (metrics) => {
  // Do something with the metrics received
};

// Start the analyzer
analyzer.start();
```

## Metrics

`metrics` obtained is a JSON object containing the following properties.

### Root

| Name | Value | Description |
|:----:|:-----:|:------------|
| **name** | String | Name of the Peer Connection given |
| **call_id** | String | Identifier or abstract name representing the call |
| **user_id** | String | Identifier or abstract name representing the user |
| **timestamp** | Number | Timestamp of the metric collected |

### Audio

| Name | Value | Description |
|:----:|:-----:|:------------|
| **input_codec** | JSON | Description of the audio input codec and parameters used |
| **input_level** | Number | Level of the input sound. Detect presence of incoming sound |
| **output_codec** | JSON | Description of the audio output codec and parameters used |
| **output_level** | Number | Level of the output sound. Detect presence of outgoing sound |
| **last_three_jitter** | Array | Last 3 Jitter values received (in ms) |
| **percent_packets_lost** | Number | Percent of audio packet lost since the last metric |
| **total_packets_received** | Number | Number of packets received since the beginning of the call |
| **total_packets_lost** | Number | Number of packets lost since the beginning of the call |
| **delta_packets_received** | Number | Number of packets received since the last metric |
| **delta_packets_lost** | Number | Number of packets lost since last metric |
| **total_bytes_received** | Number | Number of bytes received since the beginning of the call |
| **total_bytes_send** | Number | Number of bytes sent since the beginning of the call |
| **delta_bytes_received** | Number | Number of bytes received since the last metric |
| **delta_bytes_sent** | Number | Number of bytes sent since last metric |
| **mos** | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model'<br>From Haytham Assem & Davide Malone & Jonathan Dunne & Pat O'Sullivan<br>Published in 2013 International Conference on Computing, Networking and Communications (ICNC) |

### Video

| Name | Value | Description |
|:----:|:-----:|:------------|
| **input_codec** | JSON | Description of the video input codec and parameters used |
| **input_size** | Number | Size of the input video (from remote peer) |
| **output_codec** | JSON | Description of the video output codec and parameters used |
| **output_size** | Number | Size of the output video (own video) |
| **total_bytes_received** | Number | Number of bytes received since the beginning of the call |
| **total_bytes_send** | Number | Number of bytes sent since the beginning of the call |
| **delta_bytes_received** | Number | Number of bytes received since the last metric |
| **delta_bytes_sent** | Number | Number of bytes sent since last metric |

### Network

| Name | Value | Description |
|:----:|:-----:|:------------|
| **infrastructure** | Number | Infrastructure level (0: Eth, 3: Wifi, 5: 4G, 10: 3G) |
| **local_candidate_type** | String | Type of candidate used (host, relay, srflx) |
| **local_candidate_protocol** | String | Protocol used (udp, tcp) |
| **remote_candidate_type** | String | Type of candidate used (host, relay, srflx) |
| **remote_candidate_protocol** | String | Protocol used (udp, tcp) |

### Data

| Name | Value | Description |
|:----:|:-----:|:------------|
| **last_three_rtt** | Array | last 3 RTT values received (in ms) |
| **total_bytes_received** | Number | Number of bytes received since the beginning of the call (audio+video) |
| **total_bytes_send** | Number | Number of bytes sent since the beginning of the call (audio+video) |
| **delta_bytes_received** | Number | Number of bytes received since the last metric (audio+video) |
| **delta_bytes_sent** | Number | Number of bytes sent since last metric (audio+video) |
| **delta_kbs_received** | Number | Number of KB received per seconds since the last metric (audio+video) |
| **delta_kbs_sent** | Number | Number of KB sent per seconds since the last metric (audio+video) |

### Metrics to add

The following metrics are in progress

| Name | Description |
|:----:|:------------|
| cet | call establishment time<br> Should be added to the Network part ? |
| candidates_number | Number of candidates generated<br> Should be added in the Network part |
| audio_bandwidth | Available audio bandwidth |
| video_bandwidth | Available video bandwidth |
