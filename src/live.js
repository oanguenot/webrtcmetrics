import { alertOnFramerate, alertOnPeak } from "./utils/rules";

const getValueFromReport = (data, property, report, withoutSSRC = false) => {
  if (!report) {
    return null;
  }

  if (withoutSSRC) {
    return data.type in report && property in report[data.type]
      ? report[data.type][property]
      : null;
  }
  return data.type in report &&
    data.ssrc in report[data.type] &&
    property in report[data.type][data.ssrc]
    ? report[data.type][data.ssrc][property]
    : null;
};

const getValueFromReportValues = (property, reportValues) => reportValues.find((reportValue) => {
  if (property in reportValue.value) {
    return reportValue.value[property];
  }
  return null;
});

export const doLiveTreatment = (data, previousReport, values) => {
  const events = [];

  const addEvent = (at, category, name, ssrc, details) => {
    events.push({
      at,
      category,
      name,
      ssrc,
      details,
    });
  };

  // track id changed = device changed
  const compareAndSendEventForDevice = (property) => {
    const currentTrackId = data.value[property];
    const previousTrackId = getValueFromReport(data, property, previousReport);
    const currentDevice = getValueFromReportValues("device_out", values);
    const oldDevice = getValueFromReport(data, "device_out", previousReport);
    let eventName = "track-stop";

    if (previousTrackId !== currentTrackId) {
      // Message when currentTrackId is null
      let message = `The existing outbound ${data.type} stream from ${
        oldDevice || "unknown"
      } has been stopped or muted`;
      if (currentTrackId && previousTrackId) {
        // Message when trackId changed
        message = `The existing outbound ${
          data.type
        } device has been changed to ${
          currentDevice ? currentDevice.value.device_out : "unknown"
        }`;
        eventName = "track-change";
      } else if (!previousTrackId) {
        // Message when new trackId
        message = `A new outbound ${data.type} stream from ${
          currentDevice ? currentDevice.value.device_out : "unknown"
        } has been started or unmuted`;
        eventName = "track-start";
      }

      addEvent(new Date().toJSON(), "call", eventName, data.ssrc, {
        message,
        direction: "outbound",
        kind: data.type,
        value: currentTrackId,
        value_old: previousTrackId,
      });
    }
  };

  // width / framerate changed = resolution changed
  const compareAndSendEventForSize = (property) => {
    const size = data.value[property];
    const previousSize = getValueFromReport(data, property, previousReport);
    const currentActive = property.includes("out")
      ? getValueFromReportValues("active_out", values)
      : true;
    // Only send event for resolution and framerate if there is an active stream
    if (currentActive) {
      if (previousSize?.width !== size.width) {
        addEvent(
          new Date().toJSON(),
          "quality",
          !previousSize || previousSize.width < size.width
            ? "size-up"
            : "size-down",
          data.ssrc,
          {
            message: `The resolution of the ${
              property.includes("out") ? "outbound" : "inbound"
            } ${data.type} stream has ${
              !previousSize || previousSize.width < size.width
                ? "increased"
                : "decreased"
            } to ${size.width}x${size.height}`,
            direction: property.includes("out") ? "outbound" : "inbound",
            kind: data.type,
            value: `${size.width}x${size.height}`,
            value_old: `${previousSize ? previousSize.width : 0}x${
              previousSize ? previousSize.height : 0
            }`,
          },
        );
      }
      if (alertOnFramerate(previousSize?.framerate, size?.framerate)) {
        addEvent(
          new Date().toJSON(),
          "quality",
          !previousSize || previousSize.framerate < size.framerate
          ? "fps-up"
          : "fps-down",
          data.ssrc,
          {
            message: `The framerate of the ${
              property.includes("out") ? "outbound" : "inbound"
            } ${data.type} stream has ${
              !previousSize || previousSize.framerate < size.framerate
                ? "increased"
                : "decreased"
            } to ${size.framerate}`,
            direction: property.includes("out") ? "outbound" : "inbound",
            kind: data.type,
            value: size.framerate,
            value_old: previousSize ? previousSize.framerate : 0,
          },
        );
      }
    }
  };

  // Outbound active property changed: camera or microphone track removed (muted) or added again (unmuted)
  const compareAndSendEventForOutboundMediaSource = (property) => {
    const active = data.value[property];
    const previousActive = getValueFromReport(data, property, previousReport);
    if (active !== previousActive) {
      addEvent(
        new Date().toJSON(),
        "call",
        active ? "track-active" : "track-inactive",
        data.ssrc,
        {
          message: `The ${property.includes("out") ? "outbound" : "inbound"} ${
            data.type
          } stream switched to ${active ? "active" : "inactive"}`,
          direction: property.includes("out") ? "outbound" : "inbound",
          kind: data.type,
          value: active,
          value_old: previousActive,
        },
      );
    }
  };

  // VideoLimitation Change = cpu, bandwidth, other, none
  const compareAndSendEventForOutboundLimitation = (property) => {
    const limitation = data.value[property];
    const previousLimitation = getValueFromReport(
      data,
      property,
      previousReport,
    );

    if (
      !previousLimitation ||
      limitation.reason !== previousLimitation.reason
    ) {
      addEvent(
        new Date().toJSON(),
        "quality",
        "limitation",
        data.ssrc,
        {
          message: `The outbound video stream resolution is ${
            limitation.reason === "none"
              ? "no more limited"
              : `limited due to ${limitation.reason} reason`
          }`,
          direction: property.includes("out") ? "outbound" : "inbound",
          kind: data.type,
          value: limitation.reason,
          value_old: previousLimitation,
        },
      );
    }
  };

  // BytesSent changed a lot /10 or x10 = possibly track has been muted/unmuted
  const compareAndSendEventForBytes = (property) => {
    const bytesExchanged = data.value[property];
    const previousBytesExchanged = getValueFromReport(
      data,
      property,
      previousReport,
    );
    const currentActive = property.includes("out")
      ? getValueFromReportValues("active_out", values)
      : true;

    if (currentActive) {
      if (alertOnPeak(previousBytesExchanged, bytesExchanged)) {
        addEvent(
          new Date().toJSON(),
          "quality",
          bytesExchanged > previousBytesExchanged ? "peak-up" : "peak-down",
          data.ssrc,
          {
            message: `A peak has been detected for the ${
              property.includes("out") ? "outbound" : "inbound"
            } ${data.type} steam.`,
            direction: property.includes("out") ? "outbound" : "inbound",
            kind: data.type,
            value: bytesExchanged,
            value_old: previousBytesExchanged,
          },
        );
      }
    }
  };

  const compareAndSendEventForSelectedCandidatePairChanged = (property) => {
    const selectedCandidatePairId = data.value[property];
    const previousSelectedCandidatePairId = getValueFromReport(
      data,
      property,
      previousReport,
      true,
    );
    if (selectedCandidatePairId !== previousSelectedCandidatePairId) {
      addEvent(new Date().toJSON(), "signal", "route-change", null, {
        message: `The selected candidates pair changed to ${selectedCandidatePairId}`,
        direction: null,
        kind: null,
        value: selectedCandidatePairId,
        value_old: previousSelectedCandidatePairId,
      });
    }
  };

  const compareAndSendEventForNewSSRC = (property) => {
    const ssrc = data.value[property];
    const previouSsrc = getValueFromReport(
      data,
      property,
      previousReport,
    );

    if (ssrc && !previouSsrc) {
      addEvent(new Date().toJSON(), "call", "track-added", ssrc, {
        message: `New track added to the call ${ssrc}`,
        direction: property.includes("in") ? "inbound" : "outbound",
        kind: data.type,
        value: ssrc,
        value_old: null,
      });
    }
  };

  switch (data.internal) {
    case "deviceChanged": {
      if (previousReport) {
        compareAndSendEventForDevice("track_out");
      }
      break;
    }
    case "inputSizeChanged": {
      compareAndSendEventForSize("size_in");
      break;
    }
    case "outputSizeChanged": {
      compareAndSendEventForSize("size_out");
      break;
    }
    case "bytesSentChanged": {
      compareAndSendEventForBytes("delta_KBytes_out");
      break;
    }
    case "bytesReceivedChanged": {
      if (previousReport) {
        compareAndSendEventForBytes("delta_KBytes_in");
      }
      break;
    }
    case "mediaSourceUpdated": {
      if (previousReport) {
        compareAndSendEventForOutboundMediaSource("active_out");
      }
      break;
    }
    case "videoLimitationChanged": {
      compareAndSendEventForOutboundLimitation("limitation_out");
      break;
    }
    case "selectedPairChanged": {
      compareAndSendEventForSelectedCandidatePairChanged(
        "selected_candidate_pair_id",
      );
      break;
    }
    case "ssrcIdentifierIn": {
      compareAndSendEventForNewSSRC("ssrc_in");
      break;
    }
    case "ssrcIdentifierOut": {
      compareAndSendEventForNewSSRC("ssrc_out");
      break;
    }
    default:
      break;
  }

  return events;
};
