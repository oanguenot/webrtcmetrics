# WEBRTC METRICS & STATS

**WebRTCMetrics** is a JavaScript library that aggregates stats received from several `RTCPeerConnection` objects and
generates JSON reports in live during a call as well as a **Call Detail Records** (CDR) at the end of the call resuming
the main statistics captured.

**WebRTCMetrics** is based on the WebRTC `getStats` API and collect statistics using **probes**. Each probe is
associated to a `RTCPeerConnection`. A probe collects statistics from all streams of a `RTCPeerConnection`.

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

A new instance of the WebRTCMetrics is created when calling the constructor. A JSON configuration can be set to define
the main characteristics of the collect of the statistics.

```javascript
import WebRTCMetrics from "webrtcmetrics";

// Define your configuration
const configuration = {
  refreshEvery: 3000,   // Optional. Refresh every 3 seconds
  startAfter: 5000,     // Optional. Start collecting stats after 5 seconds
  stopAfter: 30000,     // Optional. Stop collecting stats after 30 seconds
  verbose: false,        // Optional. Display verbose logs or not
  silent: true,           // Optional. No log at all if set to true
};

const metrics = new WebRTCMetrics(configuration);
```

As defined in that sample, the following parameters can be configured:

- `refreshEvery`: Number. Contains the duration to wait (in milliseconds) before collecting a new set of statistics.
  Default value is **2000**.

- `startAfter`: Number. Contains the duration to wait (in milliseconds) before collecting the first set of statistics.
  Default value is equals to 0 for starting immediately.

- `stopAfter`: Number. Contains the duration to wait (in milliseconds) before stopping to collect the statistics. This
  duration starts after the `startAfter` duration. Default value is **-1** which means that the statistics are collected
  until the function `stop()` is called.

- `verbose`: Boolean. True for displaying verbose information in the logger such as the raw statistics coming
  from `getStats`. Default is **false**.

- `silent`: Boolean. True to disable logs. When `silent` is set to `true`, the parameter `verbose` becomes obsolete.

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
  passthrough: { "inbound-rtp": ["audioLevel"] }   // Optional. Get any properties from the reports
});
```

_Note:_ The `RTCPeerConnection` parameter is mandatory whereas the `configuration` parameter is optional.

```typescript
createProbe(peerConnection
:
RTCPeerConnection, configuration ? : Object
):
Probe
```

The `configuration` parameter contains the following properties:

- `pname`: String. Contains the name of the `RTCPeerConnection`. This is an arbitrary name that can be used to identify
  statistics received.

- `cid`: String. Contains the identifier of the call. This is an arbitrary name that can be used to gather the
  statistics.

- `uid`: String. Contains the identifier of the user. This is an arbitrary name that can be used to gather the
  statistics.

- `ticket`: Boolean. True for generating a ticket when the collect of statistics is stopped. Default is **true**.

- `record`: Boolean. True to link all reports generated to the ticket. This allows to access to all reports individually
  after the call. Default is **false**.

### Probe lifecycle

Once a probe has been created, it is ready to collect the statistics using **reports**. The application needs to listen
to the event `onreport` to receive them.

After the call, a **ticket** that summarizes all the reports received for a probe can be received by listening to the
event `onticket`. Don't forget to put the property `ticket` to **true** in the configuration of the WebRTCMetrics
Object.

### Complete example

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
metrics.startAllProbes();

// At any time, call ID and user ID can be updated
probe.updateUserId('newUserID');
probe.updateCallId('newCallID');

// Once the call is finished, stop the analyzer when running
if (metrics.running) {
  metrics.stopAllProbes();
}
```

### Additional information

The reports can be obtained by registering to event `onreport`; this callback is called in loop with an interval equals
to the value of the `refreshEvery` parameter and with the **report** generated.

If you don't want to capture the first curve of statistics but something much more linear, you can specify a delay
before receiving the metrics. By default, the stats are captured immediately. But depending on your needs, use the
parameter `startAfter` to delay the capture.

Stats can be captured during a defined period or time. To do that, set a value to the parameter `stopAfter` to stop
receiving reports after that duration given in ms. If you want to capture statistics as long as the call is running,
omit that parameter of set the value to `-1`. In that case, you will have to call manually the method `stop()` of the
probe to stop the collector.

The first set of statistics collected (first report) is called the **reference report**. It is reported separately from
the others (can't be received in the `onreport` event) but is used for computing statistics of the next ones (for
example **delta_packets_received**).

_Note:_ The `report` and `ticket` parameters received from the events are JSON objects. See below for the content.

### Dealing with multiple streams in a probe

A `RTCPeerConnection` can transport more than one audio and video streams (`MediaStreamTrack`). Statistics is collected
per type of stream (audio or video) and per direction (inbound or outbound).

Each report contains the statistics of all streams in live. Ticket summarizes the statistics of all streams at the end
of the call.

### Creating multiples probes

When connecting to a conference server such as an **SFU**, you can receive multiple `RTCPeerConnection` objects. You can
collect statistics from each by creating as many probes as needed. One for each `RTCPeerConnection`.

As the parameter **refreshEvery**, **startAfter** and **stopAfter** are common to all probes created, the statistics of
all probes are collected one after the other, as soon as possible in order to be able to compare. To avoid any mistake,
each probe has its own `timestamp` when the stats have been collected.

```javascript
const probe1 = metrics.createProbe(pc1, {
  pname: 'pc_1',  // Optional. Name of the peer connection
  ticket: true,               // Optional. Generate a ticket at the end of the call or not.
  record: true,               // Optional. Record reports in the ticket or not. 
});

const probe2 = metrics.createProbe(pc2, {
  pname: 'pc_2',  // Optional. Name of the peer connection
  ticket: true,               // Optional. Generate a ticket at the end of the call or not.
  record: true,               // Optional. Record reports in the ticket or not. 
});

probe1.onticket = (result) => {
  // Do something with the ticket of probe 1
}

probe2.onticket = (result) => {
  // Do something with the ticket of probe 2
}

// Start all registered probes
metrics.startAllProbes();
```

### Collecting stats from all probes

Register to the event `onresult` from the metrics Object created to get a global report that contains all probes reports
as well as some global stats.

_Note:_ This method is equivalent to register to the event `onreport` on each probe individually.

## Report Statistics

Each **report** collected from the event `onreport` contains the following statistics.

### Global statistics

| Name          | Value  | Description                                       |
|:--------------|:------:|:--------------------------------------------------|
| **pname**     | String | Name of the Peer Connection given                 |
| **call_id**   | String | Identifier or abstract name representing the call |
| **user_id**   | String | Identifier or abstract name representing the user |
| **timestamp** | Number | Timestamp of the metric collected                 |
| **count**     | Number | Number of the report                              |

### Audio statistics

Audio statistics are gathered under the `audio` properties which is an object containing all the audio streams
collected (inbound and outbound). Each stream is identified by its `ssrc`.

Each **inbound audio stream** contains the following statistics:

| Name                                  | Value  | Description                                                                                                                |
|:--------------------------------------|:------:|:---------------------------------------------------------------------------------------------------------------------------|
| **codec_in**                          |  JSON  | Description of the audio input codec and parameters used                                                                   |
| **codec_id_in**                       | String | ID of the audio input codec used                                                                                           |
| **delta_KBytes_in**                   | Number | Number of kilobytes (KB) received since the last report                                                                    |
| **delta_kbs_in**                      | Number | Number of kilobits received per second since the last report                                                               |
| **delta_jitter_ms_in**                | Number | Incoming Jitter (in ms)                                                                                                    |
| **delta_packets_lost_in**             | Number | Number of packets lost (not received) since last report                                                                    |
| **delta_packets_in**                  | Number | Number of packets received since the last report                                                                           |
| **delta_rtt_ms_in**                   | Number | Round Trip-Time (in ms). Could be null when no value collected.                                                            |
| **delta_synthetized_ms_in**           | Number | Duration of synthetized voice since last report (in ms)                                                                    |
| **delta_playout_delay_ms_in**         | Number | Delay of the playout path since last report (in ms)                                                                        |
| **delta_jitter_buffer_delay_ms_in**   | Number | Average Jitter buffer delay (in ms)                                                                                        |
| **direction**                         | String | Direction of the stream. "inbound" here.                                                                                   |
| **level_in**                          | Number | Level of the input sound. Detect presence of incoming sound                                                                |
| **mos_emodel_in**                     | Number | Audio quality indicator based on 'MOS E-Model ITU-T G.107.2 (Fullband E-model)'                                            |
| **mos_in**                            | Number | Audio quality indicator based on 'Effective Latency' or 'Codec fitting parameters'                                         |
| **percent_packets_lost_in**           | Number | Percent of audio packet lost (not received) since the last report                                                          |
| **percent_synthetized_in**            | Number | Percent of voice packet synthetized (generated) since the last report                                                      |
| **timestamp_in**                      | Number | Timestamp when report has been sent. Associated with **delta_rtt_ms_in**, **total_rtt_measure_in** and **total_rtt_ms_in** |
| **total_KBytes_in**                   | Number | Number of kilobytes (KB) received since the beginning of the call                                                          |
| **total_packets_lost_in**             | Number | Number of packets lost (not received) since the beginning of the call                                                      |
| **total_packets_in**                  | Number | Number of packets received since the beginning of the call                                                                 |
| **total_rtt_measure_in**              | Number | Number of RTT measurements done                                                                                            |
| **total_rtt_ms_in**                   | Number | Total Round Trip Time since the beginning of the call                                                                      |
| **total_playout_ms_in**               | Number | Total duration of the playout since the beginning of the call (in ms)                                                      |
| **total_synthetized_ms_in**           | Number | Total duration of the synthetized voice since the beginning of the call (in ms)                                            |
| **total_percent_synthetized_in**      | Number | Percent of voice packet synthetized (generated) since the beginning of the call                                            |
| **total_time_jitter_buffer_delay_in** | Number | Total time spent by all audio samples in jitter buffer (in ms)                                                             |
| **total_jitter_emitted_in**           | Number | Total number of audio samples that have come out the jitter buffer (in ms)                                                 |
| **track_in**                          | String | The id of the associated mediastream track                                                                                 |

_Note:_ `mos_emodel_in` and `mos_in` reflects the quality of the audio media received using a rank from 0 (inaudible) to
4.5 (excellent). It is the quality the local user experienced from his call.

Each **outbound audio stream** contains the following statistics

| Name                             |  Value  | Description                                                                                               |
|:---------------------------------|:-------:|:----------------------------------------------------------------------------------------------------------|
| **active_out**                   | Boolean | True if that stream is active (sending media)                                                             |
| **codec_out**                    |  JSON   | Description of the audio output codec and parameters used                                                 |
| **codec_id_out**                 | String  | ID of the audio output codec used                                                                         |
| **delta_packet_delay_ms_out**    | Number  | Average duration spent by packets before being sent (in ms)                                               |
| **delta_KBytes_out**             | Number  | Number of kilobytes (KB) sent since last report                                                           |
| **delta_kbs_out**                | Number  | Number of kbits sent per second since the last report                                                     |
| **delta_jitter_ms_out**          | Number  | Outgoing Jitter (in ms)                                                                                   |
| **delta_packets_lost_out**       | Number  | Number of packets lost (not received by the recipient) since last report                                  |
| **delta_packets_out**            | Number  | Number of packets sent since the last report                                                              |
| **delta_rtt_ms_out**             | Number  | Round Trip-Time (in ms). Could be null when no value collected.                                           |
| **direction**                    | String  | Direction of the stream. "outbound" here.                                                                 |
| **level_out**                    | Number  | Level of the output sound. Detect presence of outgoing sound                                              |
| **mos_emodel_out**               | Number  | Audio quality indicator based on 'MOS E-Model ITU-T G.107.2 (Fullband E-model)'                           |
| **mos_out**                      | Number  | Audio quality indicator based on 'Effective Latency' or 'Codec fitting parameters'                        |
| **percent_packets_lost_out**     | Number  | Percent of audio packet lost (not received by the recipient) since the last report                        |
| **timestamp_out**                | Number  | Timestamp when report has been received. Associated with **delta_jitter_ms_out** and **delta_rtt_ms_out** |
| **total_KBytes_out**             | Number  | Number of kilobytes (KB) sent since the beginning of the call                                             |
| **total_time_packets_delay_out** | Number  | Total time spent for all packets before being sent (in ms)                                                |
| **total_packets_lost_out**       | Number  | Number of packets lost (not received by the recipient) since the beginning of the call                    |
| **total_packets_out**            | Number  | Number of packets sent since the beginning of the call                                                    |
| **total_rtt_measure_out**        | Number  | Number of RTT measurements done                                                                           |
| **total_rtt_ms_out**             | Number  | Total Round Trip Time since the beginning of the call                                                     |
| **track_out**                    | String  | The id of the mediastream track associated                                                                |                                                                                                                                                                                                                                |
| **device_out**                   | String  | The label of the device associated to the **track_out**                                                   |

_Note:_ `mos_emodel_out` and `mos_out` reflects the quality of the audio media sent using a rank from 0 (inaudible) to
4.5 (excellent). It is not the quality the remote peer will experience but is a good indicator of the capacity of the
local user to send the media to detect a quality issue on the local side

### Video statistics

Video statistics are gathered under the `video` properties which is an object containing all the video streams
collected (inbound and outbound). Each stream is identified by its `ssrc`.

Each **inbound video stream** contains the following statistics:

| Name                                  | Value  | Description                                                                                               |
|:--------------------------------------|:------:|:----------------------------------------------------------------------------------------------------------|
| **decoder_in**                        | String | Description of the video decoder used                                                                     |
| **delta_KBytes_in**                   | Number | Number of kilobytes (KB) received since the last report                                                   |
| **delta_kbs_in**                      | Number | Number of kbits received per second since the last report                                                 |
| **delta_jitter_ms_in**                | Number | Incoming Jitter (in ms). Could be null when no value collected                                            |
| **delta_glitch_in**                   |  JSON  | Number of freezes and pauses encountered since the last report                                            |
| **delta_decode_frame_ms_in**          | Number | Time needed to decode a frame (in ms)                                                                     |
| **delta_processing_delay_ms_in**      | Number | Time needed to process a frame (in ms)                                                                    |
| **delta_assembly_delay_ms_in**        | Number | Time needed to assemble a frame (in ms)                                                                   |
| **delta_jitter_buffer_delay_ms_in**   | Number | Average Jitter buffer delay (in ms)                                                                       |
| **delta_nack_sent_in**                | Number | Nack sent since the last report                                                                           |
| **delta_packets_lost_in**             | Number | Number of packets lost (not received) since last report                                                   |
| **delta_packets_in**                  | Number | Number of packets received since the last report                                                          |
| **delta_pli_sent_in**                 | Number | Pli sent since the last report                                                                            |
| **codec_in**                          |  JSON  | Description of the video input codec and parameters used                                                  |
| **codec_id_in**                       | String | ID of the video input codec used                                                                          |
| **size_in**                           | Number | Size of the input video (from remote peer) + framerate                                                    |
| **percent_packets_lost_in**           | Number | Percent of audio packet lost (not received) since the last report                                         |
| **total_KBytes_in**                   | Number | Number of kilobytes (KB) received since the beginning of the call                                         |
| **total_frames_decoded_in**           | Number | Total of frames decoded                                                                                   |
| **total_glitch_in**                   |  JSON  | Number of freezes and pauses encountered since the beginning of the call                                  |
| **total_nack_sent_in**                | Number | Total nack sent since the beginning of the call                                                           |
| **total_packets_lost_in**             | Number | Number of packets lost (not received) since the beginning of the call                                     |
| **total_packets_in**                  | Number | Number of packets received since the beginning of the call                                                |
| **total_pli_sent_in**                 | Number | Total pli sent since the beginning of the call                                                            |
| **total_time_decoded_in**             | Number | Total time used for decoding all frames (in ms)                                                           |
| **total_time_processing_delay_in**    | Number | Total time used for processing all frames (in ms)                                                         |
| **total_time_assembly_delay_in**      | Number | Total time used for assembling all frames (in ms)                                                         |
| **total_time_jitter_buffer_delay_in** | Number | Total time spent by all frames in jitter buffer (in ms)                                                   |
| **total_jitter_emitted_in**           | Number | Total number of frames that have come out the jitter buffer (in ms)                                       |
| **timestamp_out**                     | Number | Timestamp when report has been received. Associated with **delta_jitter_ms_out** and **delta_rtt_ms_out** |
| **track_in**                          | String | The id of the mediastream track associated                                                                |                                                                                                                                                                                                                                |

Each **outbound video stream** contains the following statistics

| Name                             |  Value  | Description                                                                                               |
|:---------------------------------|:-------:|:----------------------------------------------------------------------------------------------------------|
| **active_out**                   | Boolean | True if that stream is active (sending media)                                                             |
| **codec_out**                    |  JSON   | Description of the video output codec and parameters used                                                 |
| **codec_id_out**                 | String  | ID of the video output codec used                                                                         |
| **delta_packet_delay_ms_out**    | Number  | Average duration spent by packets before being sent (in ms)                                               |
| **delta_KBytes_out**             | Number  | Number of kilobytes (KB) sent since last report                                                           |
| **delta_kbs_out**                | Number  | Number of kbits sent per second since the last report                                                     |
| **delta_jitter_ms_out**          | Number  | Outgoing Jitter (in ms). Could be null when no value collected.                                           |
| **delta_packets_lost_out**       | Number  | Number of packets lost (not received by the recipient) since last report                                  |
| **delta_encode_frame_ms_out**    | Number  | Time needed to encode a frame                                                                             |
| **delta_nack_received_out**      | Number  | Nack received since the last report                                                                       |
| **delta_pli_received_out**       | Number  | Pli received since the last report                                                                        |
| **delta_rtt_ms_out**             | Number  | Round Trip-Time (in ms). Could be null when no value collected.                                           |
| **encoder_out**                  | String  | Description of the video encoder used                                                                     |
| **size_out**                     | Object  | Size of the output video sent + framerate (could be lower than the size asked)                            |
| **size_pref_out**                | Object  | Size of the output video asked + framerate                                                                |
| **percent_packets_lost_out**     | Number  | Percent of audio packet lost (not received by the recipient) since the last report                        |
| **limitation_out**               | Object  | Object containing the reason and the durations spent in each state                                        |
| **total_KBytes_out**             | Number  | Number of kilobytes (KB) sent since the beginning of the call                                             |
| **total_time_packets_delay_out** | Number  | Total time spent for all packets before being sent (in ms)                                                |
| **total_packets_lost_out**       | Number  | Number of packets lost (not received by the recipient) since the beginning of the call                    |
| **total_frames_encoded_out**     | Number  | Total of frames encoded                                                                                   |
| **total_nack_received_out**      | Number  | Total nack received since the beginning of the call                                                       |
| **total_pli_received_out**       | Number  | Total pli received since the beginning of the call                                                        |
| **total_rtt_measure_out**        | Number  | Number of RTT measurements done                                                                           |
| **total_rtt_ms_out**             | Number  | Total Round Trip Time since the beginning of the call                                                     |
| **total_time_encoded_out**       | Number  | Total time used for encoding all frames                                                                   |
| **timestamp_out**                | Number  | Timestamp when report has been received. Associated with **delta_jitter_ms_out** and **delta_rtt_ms_out** |
| **track_out**                    | String  | The id of the mediastream track associated                                                                |
| **device_out**                   | String  | The label of the device associated to the **track_out**                                                   |

### Network properties

| Name                               | Value  | Description                                                             |
|:-----------------------------------|:------:|:------------------------------------------------------------------------|
| **infrastructure**                 | Number | Infrastructure level (0: Eth, 3: Wifi, 5: 4G, 10: 3G).<br/>(Deprecated) |
| **local_candidate_id**             | String | ID of the local candidate used                                          |
| **local_candidate_protocol**       | String | Protocol used (udp, tcp)                                                |
| **local_candidate_relay_protocol** | String | Protocol used when relayed with TURN (udp, tcp, tls)                    |
| **local_candidate_type**           | String | Type of candidate used (host, relay, srflx)                             |
| **remote_candidate_id**            | String | ID of the remote candidate used                                         |
| **remote_candidate_protocol**      | String | Protocol used (udp, tcp)                                                |
| **remote_candidate_type**          | String | Type of candidate used (host, relay, srflx)                             |

### Data properties

These stats are collected from the candidate-pair stats.

| Name                               | Value  | Description                                                                           |
|:-----------------------------------|:------:|:--------------------------------------------------------------------------------------|
| **delta_KBytes_in**                | Number | Number of kilobytes (KB) received since the last report (audio+video)                 |
| **delta_KBytes_out**               | Number | Number of kilobytes (KB) sent since last report (audio+video)                         |
| **delta_kbs_bandwidth_in**         | Number | Available incoming bitrate in kb/s (audio+video)                                      |
| **delta_kbs_bandwidth_out**        | Number | Available outgoing bitrate in kb/s for (audio+video)                                  |
| **delta_kbs_in**                   | Number | Number of kbits received per second since the last report (audio+video)               |
| **delta_kbs_out**                  | Number | Number of kbits sent per second since the last report (audio+video)                   |
| **delta_rtt_connectivity_ms**      | Number | Round Trip-Time (in ms) computed from STUN connectivity checks                        |
| **total_KBytes_in**                | Number | Number of kilobytes (KB) received since the beginning of the call (audio+video)       |
| **total_KBytes_out**               | Number | Number of kilobytes (KB) sent since the beginning of the call (audio+video)           |
| **total_rtt_connectivity_measure** | Number | Number of RTT measurements done (from STUN connectivity checks)                       |
| **total_rtt_connectivity_ms**      | Number | Total Round Trip Time since the beginning of the call (from STUN connectivity checks) |

### Experimental

These stats are subject to change in the future

|          Name          | Value  | Description                                                                                    |
|:----------------------:|:------:|:-----------------------------------------------------------------------------------------------|
| **time_to_measure_ms** | Number | Time (ms) to measure a probe which means the time to collect and the time to compute the stats |

## Stop reporting

At any time, calling the method `stop()` stops collecting statistics on that probe. No other reports are received.

## Generating a ticket

When calling the method `stop()` or automatically after a duration equals to `stopAfter`, a ticket is generated with the
most important information collected. This ticket is generated only if the option `ticket` has not been manually set
to `false`.

To obtain that ticket, subscribe to the event `onticket`. The callback is fired when the probe is stopped (ie: by
calling the method `stop()`)  or after the `stopAfter`. The callback is called with a JSON parameter corresponding to
something like a **CDR**.

If the option `record` has been set to `true`, the ticket contains all the reports generated.

The ticket generated contains the following information:

| Name              | Value  | Description                                                  |
|:------------------|:------:|:-------------------------------------------------------------|
| **call**          | Object | Contains the `call_id` and the `events` related to the call  |
| **configuration** | Object | Contains some configuration parameters such as the frequency |
| **data**          | Object | Contains the global statistics of the call                   |
| **details**       | Object | Contains the list of reports as well as the reference report |
| **ended**         |  Date  | End date of the ticket                                       |
| **ssrc**          | Object | Contains the list of all statistics for all streams          |
| **started**       |  Date  | Start date of the ticket                                     |
| **ua**            | Object | Contains the `ua`, the `pname` and the `user_id`             |
| **version**       | String | The version of the ticket format                             |

Each **SSRC** is an object containing the following statistics:

| Name            | Value  | Description                                                                            |
|:----------------|:------:|:---------------------------------------------------------------------------------------|
| **direction**   | String | The direction of the stream. Can be `inbound` or `outbound`                            |
| **type**        | String | The type of the stream. Can be `audio` or `video`                                      |
| **bitrate**     | Object | `min`, `max`, `avg`, `values` and `volatility` for Bitrate                             |
| **jitter**      | Object | `min`, `max`, `avg`, `values` and `volatility` for Jitter                              |
| **loss**        | Object | `total`, `min`, `max`, `avg`, `values` and `volatility` for Packets Loss               |
| **rtt**         | Object | (Outbound only) `min`, `max`, `avg`, `values` and `volatility` for Round Trip Time     |
| **mos**         | Object | (Audio only) `min`, `max`, `avg`, `values` and `volatility`                            |
| **traffic**     | Object | `min`, `max`, `avg`, `values` and `volatility` for Traffic                             |
| **limitations** | Object | (Video outbound only) `bandwidth`, `cpu`, `other`, `none` for Limitations (in percent) |

## PassThrough

**WebRTCMetrics** allows to capture any properties from the underlying reports generated by the WebRTC stack (aka
getStats API).

### Basic usage

For doing that, you need to know which report the property belongs to, and use the key `passthrough` to give it to *
*WebRTCMetrics**.

Here is an example for capturing the audio level for any incoming streams as well as for the local source used

```js
probe1 = metrics.createProbe(pc1, {
  pname: 'pc-bob-1',          // Name of the peer connection (Optional)
  cid: 'call007984',          // Call Id (Optional)
  uid: 'Bob',                 // User Id (Optional)
  passthrough: {
    "inbound-rtp": ["audioLevel"],
    "media-source": ["audioLevel"]
  }
});
```

The result will be added to each report in the following way:

```json
{
  "passthrough": {
    "audioLevel": {
      "inbound-rtp_audio=3691646660": 0.09140293588061159,
      "media-source_audio=4252341231": 0.02352323323412
    }
  }
}
```

### Advanced usage (units)

Starting version v5.4 you use some tags for collecting the property directly using the right unit.

For that, you can use tag `ms` for using milliseconds and `kbits` instead of having bytes.

```js
probe1 = metrics.createProbe(pc1, {
  pname: 'pc-bob-1',          // Name of the peer connection (Optional)
  cid: 'call007984',          // Call Id (Optional)
  uid: 'Bob',                 // User Id (Optional)
  passthrough: {
    "inbound-rtp": ["bytesReceived.kbits"],
    "remote-inbound": ["jitter.ms"]
  }
});
```

Some metrics are cumulative, if you want to have a value per second, you can use the tag `ps`.

```js
probe1 = metrics.createProbe(pc1, {
  pname: 'pc-bob-1',          // Name of the peer connection (Optional)
  cid: 'call007984',          // Call Id (Optional)
  uid: 'Bob',                 // User Id (Optional)
  passthrough: {
    "inbound-rtp": ["ps:bytesReceived.kbits"],
    "remote-inbound": ["jitter.ms"]
  }
});
```

### Advanced usage (computation)

Starting version 5.4, you can do computation with the properties collected

For that, you have to specify the properties to used and the operand.

```js
probe1 = metrics.createProbe(pc1, {
  pname: 'pc-bob-1',          // Name of the peer connection (Optional)
  cid: 'call007984',          // Call Id (Optional)
  uid: 'Bob',                 // User Id (Optional)
  passthrough: {
    "remote-inbound-rtp": [
      "[totalRoundTripTime/roundTripTimeMeasurements]"
    ],
    "inbound-rtp": [
      "[framesDecoded-keyFramesDecoded]",
      "[totalDecodeTime/framesDecoded]",
      "[pauseCount+freezeCount]",
      "[totalFreezesDuration+totalPausesDuration]"
    ]
  }
});
```

The following operands are supported: `/`, `+`, `-`, `*`. But only one kind of operand can be used in a formula.
You can have more than 2 properties in a formula.

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

### Events and custom events

Each probe records some WebRTC events related to the `RTCPeerConnection` or to the devices used. These events are
collected and available in the **ticket** report.

Additionally, to these events, **custom events** can be recorded too.

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();

const probe = metrics.createProbe(firstPeerConnection);

// ssrc is optional but can be used to link events together. Null by default.
const ssrc = null;

// Data can be any Object
const data = { custom: "data" };

// At any time, for storing an event
probe.addCustomEvent('an event', 'a category', 'a description of the event', new Date(), ssrc, { custom: "data" });

// At any time, for storing a period
probe.addCustomEvent('an event', 'a category', 'a description of the event', new Date(), ssrc, { custom: "data" }, new Date());
```

### Setting the logs level

Logs level can be set in two different ways:

- When initializing the library and by using the `verbose` flag from the configuration object.

- By using the method `setupLogLevel`

```javascript
import WebRTCMetrics from "webrtcmetrics";

const metrics = new WebRTCMetrics();
metrics.setupLogLevel('SILENT');
```
