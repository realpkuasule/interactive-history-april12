// Caption content/timing adaptation only. The native host remains the frame clock.
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
function chunks(value){
 const paragraphs=Array.isArray(value)?value:[value];requireValue(paragraphs.length&&paragraphs.every(v=>typeof v==='string'&&v.trim()),'CAPTION_TEXT_REQUIRED');
 return paragraphs.flatMap(p=>{const result=[];let line='';for(const ch of p.trim()){line+=ch;if(/[。！？；]/u.test(ch)||[...line].length>=44){result.push(line);line='';}}if(line)result.push(line);return result;});
}
export function createCaptionPlan(content,plan,voice={audioTracks:[],captions:{}}){
 const planned=[];
 for(const shot of plan.shots){
  const node=content.nodes.find(n=>n.id===shot.nodeId);let cues;
  if(shot.captions!==undefined){
   requireValue(Array.isArray(shot.captions)&&shot.captions.length,'CAPTION_CUES_REQUIRED');let previous=0;
   cues=shot.captions.map(c=>{requireValue(typeof c.text==='string'&&c.text.trim()&&Number.isSafeInteger(c.startFrame)&&Number.isSafeInteger(c.endFrame)&&c.startFrame>=previous&&c.endFrame>c.startFrame&&c.endFrame<=shot.durationFrames,'CAPTION_LOCAL_RANGE');previous=c.endFrame;return {...c,startFrame:shot.startFrame+c.startFrame,endFrame:shot.startFrame+c.endFrame};});
  }else{
   const texts=chunks(shot.narration??node.narration??node.paragraphs),weights=texts.map(t=>[...t].length),total=weights.reduce((a,b)=>a+b,0);let prefix=0;
   cues=texts.map((text,i)=>{const startFrame=shot.startFrame+Math.floor(shot.durationFrames*prefix/total);prefix+=weights[i];const endFrame=shot.startFrame+Math.floor(shot.durationFrames*prefix/total);requireValue(endFrame>startFrame,'CAPTION_TIMELINE_TOO_SHORT');return {text,startFrame,endFrame};});
  }
  cues.forEach((c,i)=>planned.push({id:shot.id+'-caption-'+i,nodeId:node.id,shotId:shot.id,text:c.text,startFrame:c.startFrame,endFrame:c.endFrame,timingKind:'planned',sourceKind:shot.captions?'authored_shot_cue':shot.narration?'shot_narration':node.narration?'node_narration':'node_paragraphs'}));
 }
 let cues=planned;
 if(voice.audioTracks?.length){cues=[];for(const track of voice.audioTracks){
  const observed=voice.captions?.[track.id]??[],trackEnd=track.startFrame+track.durationFrames,rate=track.playbackRate??1;
  requireValue(Number.isFinite(rate)&&rate>0,'CAPTION_PLAYBACK_RATE');
  if(!observed.length){for(const cue of planned){const startFrame=Math.max(track.startFrame,cue.startFrame),endFrame=Math.min(trackEnd,cue.endFrame);if(endFrame>startFrame)cues.push({...cue,id:track.id+'-'+cue.id,startFrame,endFrame,trackId:track.id});}continue;}
  let previous=0;for(const [i,c]of observed.entries()){
   requireValue(typeof c.text==='string'&&c.text.trim()&&Number.isFinite(c.startMs)&&Number.isFinite(c.endMs)&&c.startMs>=previous&&c.endMs>c.startMs&&c.endMs<=track.durationFrames/plan.output.fps*rate*1000+1e-6,'CAPTION_AUDIO_RANGE');previous=c.endMs;
   const startFrame=track.startFrame+Math.ceil(c.startMs*plan.output.fps/(1000*rate)),endFrame=Math.min(trackEnd,track.startFrame+Math.ceil(c.endMs*plan.output.fps/(1000*rate)));
   requireValue(endFrame>startFrame,'CAPTION_TIMELINE_TOO_SHORT');const shot=plan.shots.find(s=>startFrame>=s.startFrame&&startFrame<s.endFrame);
   cues.push({id:track.id+'-caption-'+i,nodeId:shot.nodeId,shotId:shot.id,text:c.text,startFrame,endFrame,trackId:track.id,timingKind:c.timingKind??'provided_audio_timing',sourceKind:'audio_caption',sourceCueIds:c.sourceCueIds??[]});
  }
 }}
 cues.sort((a,b)=>a.startFrame-b.startFrame);let previous=0;for(const cue of cues){requireValue(cue.startFrame>=previous&&cue.endFrame<=plan.frames,'CAPTION_OVERLAP_OR_RANGE');previous=cue.endFrame;}
 // Speech ends and reading ends are different. Keep the raw observed range;
 // hold only through the current shot, before any next caption or audio track.
 for(const [i,cue]of cues.entries())if(cue.sourceKind==='audio_caption'){
  const shot=plan.shots.find(s=>s.id===cue.shotId),nextTrack=voice.audioTracks.filter(t=>t.startFrame>cue.startFrame).reduce((end,t)=>Math.min(end,t.startFrame),plan.frames),limit=Math.min(shot.endFrame,cues[i+1]?.startFrame??plan.frames,nextTrack);
  cue[cue.timingKind==='observed'?'observedRange':'providedRange']={startFrame:cue.startFrame,endFrame:cue.endFrame};
  if(limit>cue.endFrame){cue.endFrame=limit;cue.timingKind=cue.timingKind==='observed'?'observed_start_with_planned_hold':'provided_start_with_planned_hold';cue.displayEndOrigin='reconstructed_design';}
 }
 return {schemaVersion:'1.0',defaultVisible:true,placement:'canvas',fps:plan.output.fps,cues};
}
export function captionAt(plan,frame){return plan.cues.find(c=>frame>=c.startFrame&&frame<c.endFrame)??null;}
