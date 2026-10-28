import {createNarrationStage} from './native/narration-stage.mjs';
let plan,narrator;const urls=[],backgrounds=new Map();
export const voiceReady=(async()=>{const response=await fetch('voice-plan.json');if(!response.ok)throw Error('VOICE_PLAN_MISSING');plan=await response.json();const assets=[];
 // Preserve the existing native stage and full-file seek behavior. Chapter packages limit its load.
 for(const a of plan.assets.filter(a=>plan.audioTracks.some(t=>t.assetId===a.id)||(plan.background??[]).some(t=>t.assetId===a.id))){const r=await fetch(a.file.path);if(!r.ok)throw Error('AUDIO_ASSET_MISSING:'+a.id);const url=URL.createObjectURL(await r.blob());urls.push(url);assets.push({...a,file:{...a.file,path:url}});}
 narrator=createNarrationStage(plan,assets);await narrator.ready;
 for(const layer of plan.background??[]){
  const asset=assets.find(a=>a.id===layer.assetId);if(!asset)throw Error('BACKGROUND_ASSET_MISSING');
  const stage=createNarrationStage({output:plan.output,audioTracks:[{id:layer.kind,assetId:asset.id,startFrame:0,durationFrames:layer.frames,playbackRate:1}]},[asset]);await stage.ready;backgrounds.set(layer.kind,{stage,enabled:true});
 }
 window.historyNarration={update(frame){narrator.update(frame);for(const b of backgrounds.values())b.stage.update(frame);},syncPlayback(active,time){narrator.syncPlayback(active,time);for(const b of backgrounds.values())b.stage.syncPlayback(active,time);},setVolume(value){narrator.setVolume(value);},setBackgroundEnabled(kind,value){const b=backgrounds.get(kind);if(!b)throw Error('BACKGROUND_NOT_FOUND');b.enabled=Boolean(value);b.stage.setVolume(b.enabled?1:0);},snapshot(){return {...narrator.snapshot(),backgrounds:[...backgrounds].map(([kind,b])=>({kind,enabled:b.enabled,...b.stage.snapshot()}))};},dispose(){narrator.dispose();for(const b of backgrounds.values())b.stage.dispose();}};
})();
export function updateVoice(frame){window.historyNarration.update(frame);}
addEventListener('pagehide',()=>{window.historyNarration?.dispose();urls.forEach(u=>URL.revokeObjectURL(u));},{once:true});
