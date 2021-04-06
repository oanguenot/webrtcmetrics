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
    pc: existingPeerConnection,
    pname: 'PeerConnection_1',
    cid: 'call007984',
    uid: 'jdoe@mycorp.com',
    refreshTimer: 3000,
    verbose: true,
});
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
| **total_packets_received** | Number | Number of packers received since the beginning of the call |
| **total_packets_lost** | Number | Number of packers lost since the beginning of the call |
| **delta_packets_received** | Number | Number of packers received since the last statistic |
| **delta_packets_lost** | Number | Number of packers lost since last statistic |

## Audio metrics

| Name | Value | Description |
|:----:|:-----:|:------------|
| **mos** | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model'<br>From Haytham Assem & Davide Malone & Jonathan Dunne & Pat O'Sullivan<br>Published in 2013 International Conference on Computing, Networking and Communications (ICNC) |

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

The following metrics are in progress

| Name | Description |
|:----:|:------------|
| cet | call establishment time<br> Should be added to the Network part ? |
| selected_local_candidate | containing<br>- type: "host|srflx|relay",<br> -protocol: "udp|tcp, <br>- port: Number<br> Should be added in the  Network part |
| selected_remote_candidate| containing<br>- type: "host|srflx|relay",<br> -protocol: "udp|tcp, <br>- port: Number<br> Should be added in the  Network part |
| candidates_number | Number of candidates generated<br> Should be added in the Network part |
| audio_bandwidth | Available audio bandwidth |
| video_bandwidth | Available video bandwidth |
| video_resolution_used | Current resolution used |
| audio_data_received | Total number of data received in audio |
| video_data_received | Total number of data received in video |


