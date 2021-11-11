# WEBRTC METRICS & STATS

**WebRTCMetrics** is a JavaScript library that aggregates stats received from the WebRTC stack and generates a JSON report containing a **MOS** score for the audio part as well as a **CDR** ticket at the end of the call resuming the reports and other interesting information.

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

Once initialized or retrieved, the `RTCPeerConnection` has to be given as reference to the `WebRTCMetrics` instance created such as in the following example:

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
    refreshEvery: 3000,         // Timer to get the report (in ms). Default to 2000.
    startAfter: 10000,          // Start to grab the stats after a white (in ms). Default to 0
    verbose: true,              // Display verbose logs or not. Default to false.
    record: true                // Record reports in a ticket or not. Default to false.
});

analyzer.onreport = (report) => {
  // Do something with the metrics received (JSON)
};

analyzer.onticket = (ticket) => {
  // Do something with the ticket received - (JSON)
}

// Start the analyzer
analyzer.start();

// Stop the analyzer
analyzer.stop();

// At any time, call ID and user ID can be updated
analyzer.updateUserId('newUserID');
analyzer.updateCallId('newCallID');
```

If you are using **Vanilla** JavaScript without bundling your application (This is the case for example if you are not using a transpiler such as using React/Babel or Angular/TypeScript), you have to load the library differently:

- Copy **WebRTCMetrics.js** from **node_modules/webrtcmetrics/dist/** to your **public** directory or a directory served.

- Load the library from your HTML entry file (aka index.html)

```html
<script src="./WebRTCMetrics.js"></script>
```

- Initialize the analyzer 

```js
const existingPeerConnection = new RTCPeerConnection(config);

// Initialize the analyzer
const analyzer = new WebRTCMetrics({
  pc: existingPeerConnection, // Peer connection to monitor - Mandatory
  pname: 'PeerConnection_1',  // Name of the peer connection (Optional)
  cid: 'call007984',          // Call Id (Optional)
  uid: 'jdoe@mycorp.com',     // User Id (Optional)
  refreshEvery: 3000,         // Timer to get the report (in ms). Default to 2000.
  startAfter: 10000,          // Start to grab the stats after a white (in ms). Default to 0
  verbose: true,              // Display verbose logs or not. Default to false.
  record: true                // Record reports in a ticket or not. Default to false.
});
```

## Generating a report

To start generating reports for a `RTCPeerConnection`, call the `start()` method.

Reports can be obtained by registering to event `onreport`; the callback is called in loop with an interval equals to the value of the `refreshEvery` parameter and with the `report` generated.

You can specify a delay before receiving metrics in order to avoid the first curve. So depending on your need, use the parameter `startAfter`. If value is 0, metrics will be retrieved as soon as possible.

This `report` obtained is a JSON object containing the following properties.

### General

| Name | Value | Description |
|:----:|:-----:|:------------|
| **pname** | String | Name of the Peer Connection given |
| **call_id** | String | Identifier or abstract name representing the call |
| **user_id** | String | Identifier or abstract name representing the user |
| **timestamp** | Number | Timestamp of the metric collected |
| **count** | Number | Number of the report |

### Audio properties

| Name | Value | Description |
|:----:|:-----:|:------------|
| **delta_KBytes_received** | Number | Number of kilobytes (KB) received since the last report |
| **delta_KBytes_sent** | Number | Number of kilobytes (KB) sent since last report |
| **delta_jitter_ms** | Number | Jitter (in ms) |
| **delta_packets_lost** | Number | Number of packets lost since last report |
| **delta_packets_received** | Number | Number of packets received since the last report |
| **delta_rtt_ms** | Number | Round Trip-Time (in ms) |
| **input_codec** | JSON | Description of the audio input codec and parameters used |
| **input_codec_id** | String | ID of the audio input codec used |
| **input_level** | Number | Level of the input sound. Detect presence of incoming sound |
| **mos_emodel** | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model'<br>From Haytham Assem & Davide Malone & Jonathan Dunne & Pat O'Sullivan<br>Published in 2013 International Conference on Computing, Networking and Communications (ICNC) |
| **mos** | Number | Audio quality indicator based on 'effective latency' |
| **output_codec** | JSON | Description of the audio output codec and parameters used |
| **output_codec_id** | String | ID of the audio output codec used |
| **output_level** | Number | Level of the output sound. Detect presence of outgoing sound |
| **percent_packets_lost** | Number | Percent of audio packet lost since the last report |
| **total_KBytes_received** | Number | Number of kilobytes (KB) received since the beginning of the call |
| **total_KBytes_sent** | Number | Number of kilobytes (KB) sent since the beginning of the call |
| **total_packets_lost** | Number | Number of packets lost since the beginning of the call |
| **total_packets_received** | Number | Number of packets received since the beginning of the call |
| **total_rtt_measure** | Number | Number of RTT measurements done |
| **total_rtt_ms** | Number | Total Round Trip Time since the beginning of the call |

### Video properties

| Name | Value | Description |
|:----:|:-----:|:------------|
| **decoder** | String | Description of the video decoder used |
| **delta_KBytes_received** | Number | Number of kilobytes (KB) received since the last report |
| **delta_KBytes_sent** | Number | Number of kilobytes (KB) sent since last report |
| **delta_jitter_ms** | Number | Jitter (in ms) |
| **delta_ms_decode_frame** | Number | Time needed to decode a frame |
| **delta_ms_encode_frame** | Number | Time needed to encode a frame |
| **delta_nack_received** | Number | Nack received since the last report|
| **delta_nack_sent** | Number | Nack sent since the last report|
| **delta_packets_lost** | Number | Number of packets lost since last report |
| **delta_packets_received** | Number | Number of packets received since the last report |
| **delta_pli_received** | Number | Pli received since the last report|
| **delta_pli_sent** | Number | Pli sent since the last report|
| **delta_rtt_ms** | Number | Round Trip-Time (in ms) |
| **encoder** | String | Description of the video encoder used |
| **input_codec** | JSON | Description of the video input codec and parameters used |
| **input_codec_id** | String | ID of the video input codec used |
| **input_size** | Number | Size of the input video (from remote peer) |
| **output_codec** | JSON | Description of the video output codec and parameters used |
| **output_codec_id** | String | ID of the video output codec used |
| **output_size** | Number | Size of the output video (own video) |
| **percent_packets_lost** | Number | Percent of audio packet lost since the last report |
| **total_KBytes_received** | Number | Number of kilobytes (KB) received since the beginning of the call |
| **total_KBytes_sent** | Number | Number of kilobytes (KB) sent since the beginning of the call |
| **total_frames_decoded** | Number | Total of frames decoded |
| **total_frames_encoded** | Number | Total of frames encoded |
| **total_nack_received** | Number | Total nack received since the beginning of the call |
| **total_nack_sent** | Number | Total nack sent since the beginning of the call |
| **total_packets_lost** | Number | Number of packets lost since the beginning of the call |
| **total_packets_received** | Number | Number of packets received since the beginning of the call |
| **total_pli_received** | Number | Total pli received since the beginning of the call |
| **total_pli_sent** | Number | Total pli sent since the beginning of the call |
| **total_rtt_measure** | Number | Number of RTT measurements done |
| **total_rtt_ms** | Number | Total Round Trip Time since the beginning of the call |
| **total_time_decoded** | Number | Total time used for decoding all frames |
| **total_time_encoded** | Number | Total time used for encoding all frames |

### Network properties

| Name | Value | Description |
|:----:|:-----:|:------------|
| **infrastructure** | Number | Infrastructure level (0: Eth, 3: Wifi, 5: 4G, 10: 3G) |
| **local_candidate_id** | String | ID of the local candidate used |
| **local_candidate_protocol** | String | Protocol used (udp, tcp) |
| **local_candidate_type** | String | Type of candidate used (host, relay, srflx) |
| **remote_candidate_id** | String | ID of the remote candidate used |
| **remote_candidate_protocol** | String | Protocol used (udp, tcp) |
| **remote_candidate_type** | String | Type of candidate used (host, relay, srflx) |


### Data properties

| Name | Value | Description |
|:----:|:-----:|:------------|
| **delta_KBytes_received** | Number | Number of kilobytes (KB) received since the last report (audio+video) |
| **delta_KBytes_sent** | Number | Number of kilobytes (KB) sent since last report (audio+video) |
| **delta_kbs_incoming_bandwidth** | Number | Available incoming bitrate in kb/s (audio+video) |
| **delta_kbs_outgoing_bandwidth** | Number | Available outgoing bitrate in kb/s for (audio+video) |
| **delta_kbs_received** | Number | Number of kbit received per second since the last report (audio+video) |
| **delta_kbs_sent** | Number | Number of kbit sent per second since the last report (audio+video) |
| **total_KBytes_received** | Number | Number of kilobytes (KB) received since the beginning of the call (audio+video) |
| **total_KBytes_sent** | Number | Number of kilobytes (KB) sent since the beginning of the call (audio+video) |

## Stop reporting

At any time, calling the method `stop()` ends the analyzer. No other reports are received.

## Generating a ticket

By subscribing to the event `onticket`, the callback is fired when the analyzer is stopped (ie: by calling the method `stop()`) with a call ticket equivalent to a **CDR** containing a JSON object resuming the call done.

If the option `cfg.record` has been set to `true`, the ticket contains all the reports generated.

The ticket generated contains the following information:

| Name | Value | Description |
|:----:|:-----:|:------------|
| **ua** | String | User-agent |
| **pname** | String | From config (pname) |
| **call_id** | String | From config (cid) |
| **user_id** | String | From config (uid) |
| **start_time** | Date.toJSON() | Date when the analyzer started |
| **end_time** | Date.toJSON() | Date when the analyzer stopped |
| **version** | String | Version of the exporter (for compatibility reason) |
| **count** | Number | Number of report generated |
| **mos** | Number | Average MOS |
| **reports** | Array | List of reports (when `record=true`) or an empty array |

## Callbacks

Setting the `onreport` and `onticket` to null, unregisters the callback previously registered.

## Monitoring several Peer Connections

Monitoring several peer connections can be done by instantiating several `WebRTCMetrics` objects.

Each will then generates its own reports and final ticket.