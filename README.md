# WEBRTC METRICS & STATS

**WebRTCMetrics** is a JavaScript library that aggregates stats received from several `RTCPeerConnection` objects and generates JSON reports in live during a call as well as a **CDR** ticket at the end of the call resuming the main statistics captured.

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

### Breaking changes coming with version 5.0

Version 5.0 comes with a support of multi streams within a single **RTCPeerConnection**. Reports and tickets generated contain statistics for each stream:

- **For report**: Properties `audio` and `video` properties contain now the list streams. Each stream entry contains the statistics.

- **For ticket**: There is a new property `ssrc` which contains the list of all streams captured during the call. Each stream has its own global statistics.

See below for the detailed changes.

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

To create a new probe, call the function `createProbe()` with a `RTCPeerConnection` instance to capture.

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
const probe = metrics.createProbe(existingPeerConnection, {
  pname: 'PeerConnection_1',  // Optional. Name of the peer connection
  cid: 'call007984',          // Optional. Call Id
  uid: 'jdoe@mycorp.com',     // Optional. User Id
  ticket: true,               // Optional. Generate a ticket at the end of the call or not.
  record: true,               // Optional. Record reports in the ticket or not. 
});

probe.onreport = (report) => {
  // Do something with a report collected (JSON)
};

probe.onticket = (ticket) => {
  // Do something with the ticket collected at the end of the call (JSON)
};

metrics.onresult = (result) => {
  // Do something with the global report collected (JSON)
}

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

Stats can be captured during a defined period or time. To do that, set a value to the parameter `stopAfter` to stop receiving reports after that duration given in ms. If you want to capture statistics as long as the call is running, omit that parameter of set the value to `-1`. In that case, you will have to call manually the method `stop()` of the probe to stop the collector. 

The first set of statistics collected (first report) is called the **reference report**. It is not been reported as the others (can't be received in the `onreport` event) but is used for computing statistics of the next ones (for example delta_packets_received).

_Note:_ The `report` and `ticket` parameters received from the events are JSON objects. See below for the content.

### Dealing with multiple streams in a probe

A `RTCPeerConnection` can transport more than one audio and video streams (`MediaStreamTrack`). Statistics will be collected per type of stream (audio or video) and per direction (inbound or outbound).

Each report the statistics of all streams. Same for the ticket.

### Creating multiples probes

When connecting to a conference server such as an **SFU**, you can receive multiple `RTCPeerConnection` objects. You can collect statistics from each by creating as many probes as needed. One for each `RTCPeerConnection`.

As the parameter **refreshEvery**, **startAfter** and **stopAfter** are common to all probes created, the statistics of all probes are collected one after the other, as soon as possible in order to be able to compare. To avoid any mistake, each probe has its own `timestamp` when the stats have been collected.

### Collecting stats from all probes

Register to the event `onresult` from the metrics Object created to get a global report that contains all probes reports as well as some global stats. 

_Note:_ This method is equivalent to register to the event `onreport` on each probe individually.

## Report Statistics 

Each **report** collected from the event `onreport` contains the following statistics.

### Global statistics

| Name | Value | Description |
|:----:|:-----:|:------------|
| **pname** | String | Name of the Peer Connection given |
| **call_id** | String | Identifier or abstract name representing the call |
| **user_id** | String | Identifier or abstract name representing the user |
| **timestamp** | Number | Timestamp of the metric collected |
| **count** | Number | Number of the report |

### Audio statistics

Audio statistics are gathered under the `audio` properties which is an array containing all the audio streams collected (inbound and outbound).

Each **inbound audio stream** contains the following statistics:

| Name                        | Value  | Description                                                                                                                                                                                                                                                                |
|:----------------------------|:------:|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **codec_in**                |  JSON  | Description of the audio input codec and parameters used                                                                                                                                                                                                                   |
| **codec_id_in**             | String | ID of the audio input codec used                                                                                                                                                                                                                                           |
| **delta_KBytes_in**         | Number | Number of kilobytes (KB) received since the last report                                                                                                                                                                                                                    |
| **delta_kbs_in**            | Number | Number of kilobits received per second since the last report                                                                                                                                                                                                               |
| **delta_jitter_ms_in**      | Number | Incoming Jitter (in ms)                                                                                                                                                                                                                                                    |
| **delta_packets_lost_in**   | Number | Number of packets lost (not received) since last report                                                                                                                                                                                                                    |
| **delta_packets_in**        | Number | Number of packets received since the last report                                                                                                                                                                                                                           |
| **direction**               | String | Direction of the stream. "inbound" here.                                                                                                                                                                                                                                   |
| **level_in**                | Number | Level of the input sound. Detect presence of incoming sound                                                                                                                                                                                                                |
| **mos_emodel_in**           | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model'<br>From Haytham Assem & Davide Malone & Jonathan Dunne & Pat O'Sullivan<br>Published in 2013 International Conference on Computing, Networking and Communications (ICNC) |
| **mos_in**                  | Number | Audio quality indicator based on 'effective latency'                                                                                                                                                                                                                       |
| **percent_packets_lost_in** | Number | Percent of audio packet lost (not received) since the last report                                                                                                                                                                                                          |
| **total_KBytes_in**         | Number | Number of kilobytes (KB) received since the beginning of the call                                                                                                                                                                                                          |
| **total_packets_lost_in**   | Number | Number of packets lost (not received) since the beginning of the call                                                                                                                                                                                                      |
| **total_packets_in**        | Number | Number of packets received since the beginning of the call                                                                                                                                                                                                                 |

Each **outbound audio stream** contains the following statistics

| Name                         | Value  | Description                                                                                                                                                                                                                                                                |
|:-----------------------------|:------:|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **codec_out**                |  JSON  | Description of the audio output codec and parameters used                                                                                                                                                                                                                  |
| **codec_id_out**             | String | ID of the audio output codec used                                                                                                                                                                                                                                          |
| **delta_KBytes_out**         | Number | Number of kilobytes (KB) sent since last report                                                                                                                                                                                                                            |
| **delta_kbs_out**            | Number | Number of kbits sent per second since the last report                                                                                                                                                                                                                      |
| **delta_jitter_ms_out**      | Number | Outgoing Jitter (in ms)                                                                                                                                                                                                                                                    |
| **delta_packets_lost_out**   | Number | Number of packets lost (not received by the recipient) since last report                                                                                                                                                                                                   |
| **delta_packets_out**        | Number | Number of packets sent since the last report                                                                                                                                                                                                                               |
| **delta_rtt_ms_out**         | Number | Round Trip-Time (in ms). Could be null when no value collected.                                                                                                                                                                                                            |
| **direction**                | String | Direction of the stream. "outbound" here.                                                                                                                                                                                                                                  |
| **level_out**                | Number | Level of the output sound. Detect presence of outgoing sound                                                                                                                                                                                                               |
| **mos_emodel_out**           | Number | Audio quality indicator based on 'Monitoring VoIP Call Quality Using Improved Simplified E-model'<br>From Haytham Assem & Davide Malone & Jonathan Dunne & Pat O'Sullivan<br>Published in 2013 International Conference on Computing, Networking and Communications (ICNC) |
| **mos_out**                  | Number | Audio quality indicator based on 'effective latency'                                                                                                                                                                                                                       |
| **percent_packets_lost_out** | Number | Percent of audio packet lost (not received by the recipient) since the last report                                                                                                                                                                                         |
| **remote_timestamp**         | Number | Remote timestamp associated with **delta_jitter_ms_out** and **delta_rtt_ms_out**                                                                                                                                                                                          |
| **total_KBytes_out**         | Number | Number of kilobytes (KB) sent since the beginning of the call                                                                                                                                                                                                              |
| **total_packets_lost_out**   | Number | Number of packets lost (not received by the recipient) since the beginning of the call                                                                                                                                                                                     |
| **total_packets_out**        | Number | Number of packets sent since the beginning of the call                                                                                                                                                                                                                     |
| **total_rtt_measure_out**    | Number | Number of RTT measurements done                                                                                                                                                                                                                                            |
| **total_rtt_ms_out**         | Number | Total Round Trip Time since the beginning of the call                                                                                                                                                                                                                      |

### Video statistics

Video statistics are gathered under the `video` properties which is an array containing all the video streams collected (inbound and outbound).

Each **inbound video stream** contains the following statistics:

| Name                           | Value | Description                                                                       |
|:-------------------------------|:-----:|:----------------------------------------------------------------------------------|
| **decoder_in**                 | String | Description of the video decoder used                                             |
| **delta_KBytes_in**            | Number | Number of kilobytes (KB) received since the last report                           |
| **delta_kbs_in**               | Number | Number of kbits received per second since the last report                         |
| **delta_jitter_ms_in**         | Number | Incoming Jitter (in ms). Could be null when no value collected.                   |
| **delta_ms_decode_frame_in**   | Number | Time needed to decode a frame                                                     |
| **delta_nack_in**              | Number | Nack received since the last report                                               |
| **delta_packets_lost_in**      | Number | Number of packets lost (not received) since last report                           |
| **delta_packets_in**           | Number | Number of packets received since the last report                                  |
| **delta_pli_in**               | Number | Pli received since the last report                                                |
| **delta_pli_out**              | Number | Pli sent since the last report                                                    |
| **codec_in**                   | JSON | Description of the video input codec and parameters used                          |
| **codec_id_in**                | String | ID of the video input codec used                                                  |
| **size_in**                    | Number | Size of the input video (from remote peer) + framerate                            |
| **percent_packets_lost_in**    | Number | Percent of audio packet lost (not received) since the last report                 |
| **total_KBytes_in**            | Number | Number of kilobytes (KB) received since the beginning of the call                 |
| **total_frames_decoded_in**    | Number | Total of frames decoded                                                           |
| **total_nack_in**              | Number | Total nack received since the beginning of the call                               |
| **total_nack_out**             | Number | Total nack sent since the beginning of the call                                   |
| **total_packets_lost_in**      | Number | Number of packets lost (not received) since the beginning of the call             |
| **total_packets_in**           | Number | Number of packets received since the beginning of the call                        |
| **total_pli_in**               | Number | Total pli received since the beginning of the call                                |
| **total_pli_out**              | Number | Total pli sent since the beginning of the call                                    |
| **total_time_decoded_in**      | Number | Total time used for decoding all frames                                           |
| **remote_timestamp**           | Number | Remote timestamp associated with **delta_jitter_ms_out** and **delta_rtt_ms_out** |

Each **outbound video stream** contains the following statistics

| Name                          | Value | Description                                                                       |
|:------------------------------|:-----:|:----------------------------------------------------------------------------------|
| **delta_KBytes_out**          | Number | Number of kilobytes (KB) sent since last report                                   |
| **delta_kbs_out**             | Number | Number of kbits sent per second since the last report                             |
| **delta_jitter_ms_out**       | Number | Outgoing Jitter (in ms). Could be null when no value collected.                   |
| **delta_ms_encode_frame_out** | Number | Time needed to encode a frame                                                     |
| **delta_nack_in**             | Number | Nack received since the last report                                               |
| **delta_nack_out**            | Number | Nack sent since the last report                                                   |
| **delta_pli_in**              | Number | Pli received since the last report                                                |
| **delta_pli_out**             | Number | Pli sent since the last report                                                    |
| **delta_rtt_ms_out**          | Number | Round Trip-Time (in ms). Could be null when no value collected.                   |
| **encoder_out**               | String | Description of the video encoder used                                             |
| **codec_out**                 | JSON | Description of the video output codec and parameters used                         |
| **codec_id_out**              | String | ID of the video output codec used                                                 |
| **size_out**                  | Number | Size of the output video (own video) + framerate                                  |
| **limitation_out**            | Object| Object containing the reason and the durations spent in each state                |
| **total_KBytes_out**          | Number | Number of kilobytes (KB) sent since the beginning of the call                     |
| **total_frames_encoded_out**  | Number | Total of frames encoded                                                           |
| **total_nack_in**             | Number | Total nack received since the beginning of the call                               |
| **total_nack_out**            | Number | Total nack sent since the beginning of the call                                   |
| **total_pli_in**              | Number | Total pli received since the beginning of the call                                |
| **total_pli_out**             | Number | Total pli sent since the beginning of the call                                    |
| **total_rtt_measure_out**     | Number | Number of RTT measurements done                                                   |
| **total_rtt_ms_out**          | Number | Total Round Trip Time since the beginning of the call                             |
| **total_time_encoded_out**    | Number | Total time used for encoding all frames                                           |
| **remote_timestamp**          | Number | Remote timestamp associated with **delta_jitter_ms_out** and **delta_rtt_ms_out** |


### Network properties

| Name | Value | Description                                                             |
|:----:|:-----:|:------------------------------------------------------------------------|
| **infrastructure** | Number | Infrastructure level (0: Eth, 3: Wifi, 5: 4G, 10: 3G).<br/>(Deprecated) |
| **local_candidate_id** | String | ID of the local candidate used                                          |
| **local_candidate_protocol** | String | Protocol used (udp, tcp)                                                |
| **local_candidate_relay_protocol** | String | Protocol used when relayed with TURN (udp, tcp, tls)    |
| **local_candidate_type** | String | Type of candidate used (host, relay, srflx)                             |
| **remote_candidate_id** | String | ID of the remote candidate used                                         |
| **remote_candidate_protocol** | String | Protocol used (udp, tcp)                                                |
| **remote_candidate_type** | String | Type of candidate used (host, relay, srflx)                             |

### Data properties

These stats are collected from the candidate-pair stats.

| Name                               | Value  | Description                                                                           |
|:-----------------------------------|:------:|:--------------------------------------------------------------------------------------|
| **delta_KBytes_in**                | Number | Number of kilobytes (KB) received since the last report (audio+video)                 |
| **delta_KBytes_out**               | Number | Number of kilobytes (KB) sent since last report (audio+video)                         |
| **delta_kbs_bandwidth_in**         | Number | Available incoming bitrate in kb/s (audio+video)                                      |
| **delta_kbs_bandwidth_out**        | Number | Available outgoing bitrate in kb/s for (audio+video)                                  |
| **delta_kbs_in**                   | Number | Number of kbits received per second since the last report (audio+video)                |
| **delta_kbs_out**                  | Number | Number of kbits sent per second since the last report (audio+video)                    |
| **delta_rtt_connectivity_ms**      | Number | Round Trip-Time (in ms) computed from STUN connectivity checks                        |
| **total_KBytes_in**                | Number | Number of kilobytes (KB) received since the beginning of the call (audio+video)       |
| **total_KBytes_out**               | Number | Number of kilobytes (KB) sent since the beginning of the call (audio+video)           |
| **total_rtt_connectivity_measure** | Number | Number of RTT measurements done (from STUN connectivity checks)                       |
| **total_rtt_connectivity_ms**      | Number | Total Round Trip Time since the beginning of the call (from STUN connectivity checks) |

### Experimental

These stats are subject to changes in the future

| Name | Value | Description |
|:----:|:-----:|:------------|
| **time_to_measure_ms** | Number | Time (ms) to measure a probe which means the time to collect and the time to compute the stats |

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
| **started** | Date | Start date of the ticket |
| **ended** | Date | End date of the ticket |
| **call** | Object | Contains the `call_id` and the `events` related to the call |
| **details** | Object | Contains the list of reports as well as the reference report |
| **jitter** | Object | `min`, `max`, `avg` and `volatility` values for audio and video |
| **rtt** | Object | `min`, `max`, `avg` and `volatility` values for audio and video and connectivity (STUN) |
| **mos** | Object | `min`, `max`, `avg` and `volatility` values |
| **packetsLost** | Object | `percent` values for audio and video |
| **bitrate** | Object | `min`, `max`, `avg` and `volatility` values  for incoming and outgoing |
| **traffic** | Object | `min`, `max`, `avg` and `volatility` values  for incoming and outgoing |

## Additional information

### Callbacks

Setting the `onreport`, `onticket` and `onresult` to `null`, unregisters the callback previously registered.

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

### Events && custom events

Each probe records some WebRTC events related to the `RTCPeerConnection`. These events are collected and available in the **ticket** report. 

Additionally to these events, **custom events** can be recorded too.

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();

const probe = metrics.createProbe(firstPeerConnection);

// At any time
probe.addCustomEvent('an event', 'a category', 'a description of the event');
```

These events will be added to the existing ones.‡

### Setting the logs level

Logs level can be set in two different ways:

- When initializing the library and by using the `verbose` flag from the configuration object.

- By using the method `setupLogLevel`

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();
metrics.setupLogLevel('SILENT');
```
