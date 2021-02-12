# WebRTCMetrics

**WebRTCMetrics** is a JavaScript library that aggregates stats received from the WebRTC stack to help Web applications grabbing metrics and information in real time.

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

Once initialized the `RTCPeerConnection`, give it to the `WebRTCMetrics` instance created such in the following example:

```js
import WebRTCMetrics from "webrtcmetrics";

// Somewhere in your code
const pc = new RTCPeerConnection(config);

const analyzer = new WebRTCMetrics({ pc });
analyzer.onmetrics = (metrics) => {
  // Do something with the metrics received
};

// Start the analyzer
analyzer.start();
```

## Audio Information

| Name | Value | Description |
|:----:|:-----:|:------------|
| **input_codec** | JSON | Description of the audio input codec and parameters used |
| **input_level** | Number | Level of the input sound (speakers) |
| **output_codec** | JSON | Description of the audio output codec and parameters used |
| **output_level** | Number | Level of the output sound (microphone) |

## Audio Statistics

| Name | Value | Description |
|:----:|:-----:|:------------|
| **last_three_jitter** | Array | Last 3 Jitter values received (in ms) |
| **last_three_rtt** | Array | last 3 RTT values received (in ms) |
| **percent_packets_lost** | Number | Percent of audio packet lost since the last statistic |
| **total_packets_received** | Number | Number of packers received since the begining of the call |
| **total_packets_lost** | Number | Number of packers lost since the begining of the call |
| **delta_packets_received** | Number | Number of packers received since the last statistic |
| **delta_packets_lost** | Number | Number of packers lost since last statistic |

## Audio metrics

| Name | Value | Description |
|:----:|:-----:|:------------|
| **mos** | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model' |

## Video Statistics

| Name | Value | Description |
|:----:|:-----:|:------------|
| **input_codec** | JSON | Description of the video input codec and parameters used |
| **input_size** | Number | Size of the input video (from remote peer) |
| **output_codec** | JSON | Description of the video output codec and parameters used |
| **output_size** | Number | Size of the output video (own video) |

## Network

| Name | Value | Description |
|:----:|:-----:|:------------|
| **infrastructure** | Number | Infrastructure level (0: Eth, 3: Wifi, 5: 4G, 10: 3G) |


### Metrics to add

cet (call establishment time) --> Network ?
local_candidate {type: "host|srflx|relay", protocol: "udp|tcp, port: Number} --> Network ?
remote_candidate_type {type: "host|srflx|relay", protocol: "udp|tcp, port: Number} --> Network ?
candidates_number: Number --> Network


