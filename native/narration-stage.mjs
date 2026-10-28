import {audioPosition} from './time.mjs';

// The existing host drives integer frames. HTMLAudio decodes locked local assets;
// pause/seek/track changes always derive from that frame, never accumulated deltas.
export function createNarrationStage(plan,assets,{sourceOffsets={}}={}){
 for(const [id,seconds] of Object.entries(sourceOffsets))if(!plan.audioTracks?.some(t=>t.id===id)||!Number.isFinite(seconds)||seconds<0)throw Error('INVALID_REQUEST: narration source offset');
 const media=new Map((plan.audioTracks??[]).map(track=>{
   const element=document.createElement('audio');element.preload='auto';
   // Loading src resets playbackRate to defaultPlaybackRate in the browser.
   element.defaultPlaybackRate=element.playbackRate=track.playbackRate??1;element.preservesPitch=true;
   element.src=assets.find(a=>a.id===track.assetId).file.path;document.body.append(element);
   return [track.id,element];
 }));
 let playing=false,currentFrame=0,error=null,generation=0,activeId=null;
 const ready=Promise.all([...media.values()].map(a=>new Promise((resolve,reject)=>{
   a.addEventListener('loadedmetadata',resolve,{once:true});a.addEventListener('error',()=>reject(new Error('Narration asset failed to load')),{once:true});
   if(a.readyState>=1)resolve();
 })));
 function update(frame,force=false){
   currentFrame=frame;const position=audioPosition(plan,frame);
   if(activeId!==position?.track.id){activeId=position?.track.id;generation++;}
   for(const [id,a] of media){
     if(id!==position?.track.id){a.pause();continue;}
     if(a.readyState<1)continue;
     const seconds=Math.min((sourceOffsets[id]??0)+position.seconds,Math.max(0,a.duration-.001));
     if(force||!playing||Math.abs(a.currentTime-seconds)>.12)a.currentTime=seconds;
     if(playing&&a.paused&&!a.ended){
       const attempt=++generation;
       a.play().then(()=>{if(attempt===generation&&playing)error=null;},e=>{if(attempt===generation&&playing)error=e.message;});
     }
     if(!playing)a.pause();
   }
 }
 function syncFrame(active,frame){if(!Number.isSafeInteger(frame)||frame<0)throw Error('Invalid narration frame');const changed=playing!==active;if(changed)generation++;playing=active;update(frame,changed);}
 return {ready,update,dispose(){playing=false;generation++;for(const a of media.values()){a.pause();a.removeAttribute('src');a.load();a.remove();}media.clear();},syncFrame,syncPlayback(active,time){syncFrame(active,Math.max(0,Math.floor(time*plan.output.fps+1e-7)))},
 setVolume(value){if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('Volume must be between 0 and 1');for(const a of media.values())a.volume=value;},
 snapshot:()=>({frame:currentFrame,playing,error,active:audioPosition(plan,currentFrame)?.track.id??null,tracks:[...media].map(([id,a])=>({id,time:a.currentTime,paused:a.paused,muted:a.muted,volume:a.volume,duration:a.duration,playbackRate:a.playbackRate}))})};
}
