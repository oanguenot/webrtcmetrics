const getValueFromReport = (data, property, report, withoutSSRC = false) => {
  if (withoutSSRC) {
    return ((data.type in report && property in report[data.type]) ? report[data.type][property] : null);
  }
  return ((data.type in report && data.ssrc in report[data.type] && property in report[data.type][data.ssrc]) ? report[data.type][data.ssrc][property] : null);
};

const getValueFromReportValues = (property, reportValues) => (
  reportValues.find((reportValue) => (property in reportValue.value ? reportValue.value[property] : null))
);

export const doLiveTreatment = (data, previousReport, values) => {
  // track id changed = device changed
  const compareAndSendEventForDevice = (property) => {
    const currentTrackId = data.value[property];
    const previousTrackId = getValueFromReport(data, property, previousReport);
    const currentDevice = getValueFromReportValues("device_out", values);
    const oldDevice = getValueFromReport(data, "device_out", previousReport);
    let eventName = "track-stop";

    if (previousTrackId !== currentTrackId) {
      // Message when currentTrackId is null
      let message = `The existing outbound ${data.type} stream from ${oldDevice || "unknown"} has been stopped or muted`;
      if (currentTrackId && previousTrackId) {
        // Message when trackId changed
        message = `The existing outbound ${data.type} device has been changed to ${currentDevice ? currentDevice.value.device_out : "unknown"}`;
        eventName = "track-change";
      } else if (!previousTrackId) {
        // Message when new trackId
        message = `A new outbound ${data.type} stream from ${currentDevice ? currentDevice.value.device_out : "unknown"} has been started or unmuted`;
        eventName = "track-start";
      }

      this.addCustomEvent(
        new Date().toJSON(),
        "call",
        eventName,
        message,
        {
          ssrc: data.ssrc,
          value: currentTrackId,
          value_old: previousTrackId,
          kind: data.type,
          direction: "outbound",
        },
      );
    }
  };

  // width / framerate changed = resolution changed
  const compareAndSendEventForSize = (property) => {
    const size = data.value[property];
    const previousSize = getValueFromReport(data, property, previousReport);
    const currentActive = property.includes("out") ? getValueFromReportValues("active_out", values) : true;
    // Only send event for resolution and framerate if there is an active stream
    if (currentActive) {
      if (!previousSize || previousSize.width !== size.width) {
        this.addCustomEvent(
          new Date().toJSON(),
          "quality",
          (!previousSize || previousSize.width < size.width) ? "size-up" : "size-down",
          `The resolution of the ${property.includes("out") ? "outbound" : "inbound"} ${data.type} stream has ${!previousSize || previousSize.width < size.width ? "increased" : "decreased"} to ${size.width}x${size.height}`,
          {
            direction: property.includes("out") ? "outbound" : "inbound",
            ssrc: data.ssrc,
            kind: data.type,
            value: `${size.width}x${size.height}`,
            value_old: `${previousSize ? previousSize.width : 0}x${previousSize ? previousSize.height : 0}`,
          },
        );
      }
      if (!previousSize || (previousSize.framerate !== undefined && Math.abs(previousSize.framerate - size.framerate) > 2)) {
        this.addCustomEvent(
          new Date().toJSON(),
          "quality",
          (!previousSize || previousSize.framerate < size.framerate) ? "fps-up" : "fps-down",
          `The framerate of the ${property.includes("out") ? "outbound" : "inbound"} ${data.type} stream has ${!previousSize || previousSize.framerate < size.framerate ? "increased" : "decreased"} to ${size.framerate}`,
          {
            direction: property.includes("out") ? "outbound" : "inbound",
            kind: data.type,
            ssrc: data.ssrc,
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
      this.addCustomEvent(
        new Date().toJSON(),
        "call",
        active ? "track-active" : "track-inactive",
        `The ${property.includes("out") ? "outbound" : "inbound"} ${data.type} stream switched to ${active ? "active" : "inactive"}`,
        {
          direction: property.includes("out") ? "outbound" : "inbound",
          kind: data.type,
          ssrc: data.ssrc,
          value: active,
          value_old: previousActive,
        },
      );
    }
  };

  // VideoLimitation Change = cpu, bandwidth, other, none
  const compareAndSendEventForOutboundLimitation = (property) => {
    const limitation = data.value[property];
    const previousLimitation = getValueFromReport(data, property, previousReport);

    if (!previousLimitation || (limitation.reason !== previousLimitation.reason)) {
      this.addCustomEvent(
        new Date().toJSON(),
        "quality",
        limitation.reason === "none" ? "unlimited" : limitation.reason,
        `The outbound video stream resolution is ${limitation.reason === "none" ? "no more limited" : `limited due to ${limitation.reason} reason`}`,
        {
          direction: property.includes("out") ? "outbound" : "inbound",
          kind: data.type,
          ssrc: data.ssrc,
          value: limitation.reason,
          value_old: previousLimitation,
        },
      );
    }
  };

  // BytesSent changed a lot /10 or x10 = possibly track has been muted/unmuted
  const compareAndSendEventForBytes = (property) => {
    const bytesExchanged = data.value[property];
    const previousBytesExchanged = getValueFromReport(data, property, previousReport);
    const currentActive = property.includes("out") ? getValueFromReportValues("active_out", values) : true;
    const lowThreshold = previousBytesExchanged / 10;
    const highThreshold = previousBytesExchanged * 10;

    if (currentActive) {
      if (bytesExchanged > highThreshold || bytesExchanged < lowThreshold) {
        this.addCustomEvent(
          new Date().toJSON(),
          "quality",
          bytesExchanged > highThreshold ? "peak-up" : "peak-down",
          `A peak has been detected for the ${property.includes("out") ? "outbound" : "inbound"} ${data.type} steam. Could be linked to a ${bytesExchanged > highThreshold ? "unmute" : "mute"}`,
          {
            direction: property.includes("out") ? "outbound" : "inbound",
            kind: data.type,
            ssrc: data.ssrc,
            peak: bytesExchanged > highThreshold ? "up" : "down",
            value: bytesExchanged,
            value_old: previousBytesExchanged,
          },
        );
      }
    }
  };

  const compareAndSendEventForSelectedCandidatePairChanged = (property) => {
    const selectedCandidatePairId = data.value[property];
    const previousSelectedCandidatePairId = getValueFromReport(data, property, previousReport, true);
    if (selectedCandidatePairId !== previousSelectedCandidatePairId) {
      this.addCustomEvent(
        new Date().toJSON(),
        "signal",
        "route-change",
        `The selected candidates pair changed to ${selectedCandidatePairId}`,
        {
          value: selectedCandidatePairId,
          value_old: previousSelectedCandidatePairId,
        },
      );
    }
  };

  if (previousReport) {
    switch (data.internal) {
      case "deviceChanged": {
        compareAndSendEventForDevice("track_out");
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
        compareAndSendEventForBytes("delta_KBytes_in");
        break;
      }
      case "mediaSourceUpdated": {
        compareAndSendEventForOutboundMediaSource("active_out");
        break;
      }
      case "videoLimitationChanged": {
        compareAndSendEventForOutboundLimitation("limitation_out");
        break;
      }
      case "selectedPairChanged": {
        compareAndSendEventForSelectedCandidatePairChanged("selected_candidate_pair_id");
        break;
      }
      default:
        break;
    }
  }
};
