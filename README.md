# WEBRTC METRICS & STATS

**WebRTCMetrics** is a JavaScript library that aggregates stats received from several `RTCPeerConnection` and generates JSON reports in live during a call as well as a **CDR** ticket at the end of the call resuming the main statistics captured.

**WebRTCMetrics** launches several **probes** that collect statistics. Each probe is associated to a `RTCPeerConnection`.

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

### Create a new instance

A new instance of the WebRTCMetrics is created when calling the constructor. A JSON configuration can be set to define the main characteristics of the collect of the statistics.

```javascript
import WebRTCMetrics from "webrtcmetrics";

// Define your configuration
const configuration = {
  refreshEvery: 3000,   // Optional. Refresh every 3 seconds
  startAfter: 5000,     // Optional. Start collecting stats after 5 seconds
  stopAfter: 30000,     // Optional. Stop collecting stats after 30 seconds
  verbose: true,        // Optional. Display verbose logs or not.
};

const metrics = new WebRTCMetrics(configuration);
```

As defined in that sample, the following parameters can be configured:

- `refreshEvery`: Number. Contains the number of milliseconds to wait before collecting a new set of statistics. Default value is **2000**.

- `startAfter`: Number. Contains the duration to wait before collecting the first set of statistics. Default value is equals to 0 for starting immediately.

- `stopAfter`: Number. Contains the duration before stopping to collect the statistics. This duration starts after the `startAfter` duration. Default value is **-1** which means that the statistics are collected until the function `stop()` is called.

- `verbose`: Boolean. True for displaying verbose information in the logger. default is **false**.

_Note:_ The **configuration** parameter is optional.

### Create a new probe

A **probe** collects the statistics associated to a `RTCPeerConnection`.

To create a new probe, call the function `createProbe()`.

```javascript
import WebRTCMetrics from "webrtcmetrics";

// Should exist somewhere in your code
const existingPeerConnection = new RTCPeerConnection(config);

// Initialize the analyzer
const metrics = new WebRTCMetrics();

const probe = metrics.createProbe(existingPeerConnection, {
  pname: 'PeerConnection_1',  // Optional. Name of the peer connection
  cid: 'call007984',          // Optional. Call Id
  uid: 'jdoe@mycorp.com',     // Optional. User Id
  ticket: true,               // Optional. Generate a ticket at the end of the call or not.
  record: true,               // Optional. Record reports in the ticket or not. 
});
```

_Note:_ The `RTCPeerConnection` parameter is mandatory whereas the `configuration` parameter is optional.

As defined in that sample, the configuration contains the following parameters:

- `pname`: String. Contains the name of the `RTCPeerConnection`. This is an arbitrary name that can be used to identify statistics received.

- `cid`: String. Contains the identifier of the call. This is an arbitrary name that can be used to gather the statistics.

- `uid`: String. Contains the identifier of the user. This is an arbitrary name that can be used to gather the statistics.

- `ticket`: Boolean. True for generating a ticket when the collect of statistics is stopped. Default is **true**.

- `record`: Boolean. True to link all reports generated to the ticket. This allow to access to all reports after the call. Default is **false**.

### Probe lifecycle

Once a probe has been created, call the function `start()` to collect the statistics. You need to listen to the event `onreport` to receive them.

A final **ticket** that summarizes all the reports received for a probe can be received by listening to the event `onticket`. Don't forget to put the parameter `ticket` to **true** in the configuration of the WebRTCMetrics Object.

```javascript
...
const probe = metrics.createProbe(existingPeerConnection, {
  pname: 'PeerConnection_1',  // Optional. Name of the peer connection
  cid: 'call007984',          // Optional. Call Id
  uid: 'jdoe@mycorp.com',     // Optional. User Id
  ticket: true,               // Optional. Generate a ticket at the end of the call or not.
  record: true,               // Optional. Record reports in the ticket or not. 
});

probe.onreport = (report) => {
  // Do something with the metrics received (JSON)
};

probe.onticket = (ticket) => {
  // Do something with the metrics received (JSON)
};

// Start collecting statistics
probe.start();

// At any time, call ID and user ID can be updated
probe.updateUserId('newUserID');
probe.updateCallId('newCallID');

// Stop the analyzer when running
if(probe.isRunning) {
  probe.stop();
}
```

Reports can be obtained by registering to event `onreport`; this callback is called in loop with an interval equals to the value of the `refreshEvery` parameter and with the **report** generated.

If you don't want to capture the first curve of statistics but something much more linear, you can specify a delay before receiving the metrics. By default, the stats are captured immediately. But depending on your needs, use the parameter `startAfter` to delay the capture. 

Stats can't be captured during a period only. In that case, set a value to the parameter `stopAfter` to stop receiving reports after that duration given in ms. If you want to capture as long as the call is running, set the value to `-1`. In that case, you will have to call manually the method `stop()`. 

The first set of statistics collected is called the **reference report**. It is not be reported as the others (can't be received in the `onreport` event) but is used for computing statistics of the next one (for example delta_packets_received).

_Note:_ The `report` and `ticket` parameters received from the events are JSON objects. See below for the content.

### Creating multiples probes

When connecting to a conference server such as an **SFU**, you can receive multiple `RTCPeerConnection` objects. You can collect statistics from each by creating as many as probes as needed. One for each `RTCPeerConnection`.

As the parameter **refreshEvery**, **startsAfter** and **stopAfter** are common to all probes created, the statistics of all probes are collected one after the other, as soon as possible in order to be able to compare. To avoid any mistake, each probe has its own `timestamp` when the stats have been collected.

## Report Statistics

Each **report** contains the following statistics.

### Global part

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

At any time, calling the method `stop()` stops collecting statistics on that probe. No other reports are received.

## Generating a ticket

When calling the method `stop()` or automatically after a duration equals to `stopAfter`, a ticket is generated with the most important information collected. This ticket is generated only if the option `ticket` has not been manually set to `false`.

To obtain that ticket, subscribe to the event `onticket`. The callback is fired when the probe is stopped (ie: by calling the method `stop()`)  or after the `stopAfter`. The callback is called with a JSON parameter corresponding to something like a **CDR**.

If the option `record` has been set to `true`, the ticket contains all the reports generated.

The ticket generated contains the following information:

| Name | Value | Description |
|:----:|:-----:|:------------|
| **ua** | Object | Contains the `ua`, the `pname` and the `user_id` |
| **call** | Object | Contains the `call_id` and the `start_time` and `end_time` |
| **details** | Object | Contains the list of reports as well as the reference report |
| **jitter** | Object | `min`, `max` and `avg` values for audio and video |
| **rtt** | Object | `min`, `max` and `avg` values for audio and video |
| **mos** | Object | `min`, `max` and `avg` values |
| **packetsLost** | Object | `percent` values for audio and video |
| **bitrate** | Object | `min`, `max` and `avg` values  for incoming and outgoing |
| **traffic** | Object | `min`, `max` and `avg` values  for incoming and outgoing |

## Additional information

### Callbacks

Setting the `onreport` and `onticket` to null, unregisters the callback previously registered.

### Probes

You can get the list of available probes by using the `probes` accessor.

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();

metrics.createProbe(firstPeerConnection);
metrics.createProbe(secondPeerConnection);

// Get the list of existing probes
const probes = metrics.probes;
```

Probes can be started and stopped all together.

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();

metrics.createProbe(firstPeerConnection);
metrics.createProbe(secondPeerConnection);

// Start all probes
metrics.startAllProbes();

// Stop all probes
metrics.stopAllProbes();
```