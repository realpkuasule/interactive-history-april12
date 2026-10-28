// Half-open shot intervals; never integrate rounded frame durations.
export function validateNativeProgressRange(range,supported){
  if(range===undefined)return;
  if(!supported||!Array.isArray(range)||range.length!==2||!range.every(Number.isFinite)||range[0]<0||range[0]>=range[1]||range[1]>1)throw Error('INVALID_REQUEST: native progress range');
}
export function framePosition(plan, frame) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error('Invalid integer frame');
  const shot = plan.shots.find(s => frame >= s.startFrame && frame < s.startFrame + s.durationFrames);
  if (!shot) throw new Error('Frame outside plan');
  const localFrame = frame - shot.startFrame;
  const u = localFrame / shot.durationFrames;
  const mapping = shot.referenceMapping;
  return { shot, frame, localFrame, seconds: localFrame / plan.output.fps,
    nativeSeconds: localFrame * (shot.nativePlaybackRate ?? 1) / plan.output.fps,
    timeMs: 1000 * localFrame / plan.output.fps, u,
    nativeProgress:shot.nativeProgressRange?shot.nativeProgressRange[0]+u*(shot.nativeProgressRange[1]-shot.nativeProgressRange[0]):u,
    referenceTime: mapping ? mapping.startPtsSeconds + u * (mapping.endPtsSeconds - mapping.startPtsSeconds) : null,
    ...(shot.materialMapping?{materialTime:shot.materialMapping.startPtsSeconds+u*(shot.materialMapping.endPtsSeconds-shot.materialMapping.startPtsSeconds)}:{}) };
}

// Decoded presentation timestamps define the displayed source frame, including VFR.
export function audioPosition(plan,frame){
  if(!Number.isSafeInteger(frame)||frame<0)throw new Error('Invalid audio frame');
  const track=plan.audioTracks?.find(t=>frame>=t.startFrame&&frame<t.startFrame+t.durationFrames);
  return track?{track,seconds:(frame-track.startFrame)/plan.output.fps*(track.playbackRate??1)}:null;
}

export function referenceFrameAt(decodedFrames, time) {
  if (!Number.isFinite(time)) throw new Error('Invalid reference time');
  // Affine mapping can land a few IEEE-754 ULPs below an exact decoded timestamp.
  const tolerance = 4 * Number.EPSILON * Math.max(1, Math.abs(time));
  const frame = decodedFrames.findLast(f => f.ptsSeconds <= time + tolerance);
  if (!frame) throw new Error('No decoded frame at reference time');
  return frame;
}

// Observed reference events must first be mapped onto the same output-frame timeline.
// This tolerance never applies to sample requests, frame counts or internal seek positions.
export function compareReferenceEventFrame(actualFrame, referenceFrame) {
  if (![actualFrame, referenceFrame].every(f => Number.isSafeInteger(f) && f >= 0)) throw Error('Invalid integer frame');
  const deltaFrames = actualFrame - referenceFrame;
  if (Math.abs(deltaFrames) > 1) throw Error('REFERENCE_EVENT_ALIGNMENT ' + deltaFrames);
  return {deltaFrames, toleranceFrames: 1};
}
