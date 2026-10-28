import {framePosition} from './native/time.mjs';
import {voiceReady,updateVoice} from './voice-bridge.js';
import {relationGeometry,relationState,timelineWindow,relationAppearance} from './visual-layout.js';
import {captionAt} from './captions.js';
const data=await(await fetch('content.json')).json(),plan=await(await fetch('request.json')).json();
const captions=await(await fetch('caption-plan.json')).json();let captionsVisible=true,currentFrame=0;
const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),{width:W,height:H,fps}=plan.output,P=plan.style;
const roleFonts=document.querySelector('link[href="fonts.css"]')?await(await fetch('font-plan.json')).json():null;
const T=roleFonts?{heading:roleFonts.roles.heading.weight,body:roleFonts.roles.body.weight,label:roleFonts.roles.body.weight}:{heading:650,body:450,label:550,...P.typography};
const font=(weight,size,role='body')=>`${roleFonts?.roles[role].style==='italic'?'italic ':''}${weight} ${size}px ${roleFonts?.roles[role].cssFamily??'HistoryText'}`;
const C={fill:P.motif==='archive'?'#e6e9df':'#faf3df',ink:P.motif==='archive'?'#18333b':P.ink,muted:P.motif==='archive'?'#45616a':P.secondary,edge:P.secondary,rule:P.motif==='archive'?'#9faeaa':'#c8b99a',shadow:P.motif==='archive'?'#091a23':'#d2c3a6',...P.card};
U.setStage(W,H);if(roleFonts){for(const role of Object.values(roleFonts.roles))for(const face of role.faces){const loaded=await document.fonts.load(`${face.cssWeight??face.weight} 20px ${face.cssFamily}`);if(loaded.length!==1||loaded[0].status!=='loaded')throw Error('FONT_LOAD_FAILED:'+face.id);}}else await Promise.all(Object.values(T).map(weight=>document.fonts.load(font(weight,20))));await document.fonts.ready;await voiceReady;
const images=new Map(await Promise.all((data.media??[]).map(async m=>{const image=new Image();image.src=m.file.path;await image.decode();return [m.id,image];})));
const timing={output:{fps},shots:plan.shots.map(s=>({...s,referenceMapping:null}))};
let geometry=[],calls={U:0,MO:0,CAM:0,DG:0};
function text(value,x,y,size,color=P.ink,maxWidth=Infinity,type='text',weight=T.body){const role=type==='heading'?'heading':'body';if(roleFonts)weight=roleFonts.roles[role].weight;c.font=font(weight,size,role);c.fillStyle=color;const w=c.measureText(value).width;if(w>maxWidth)throw Error('TEXT_INTERNAL_TRUNCATION:'+value);c.fillText(value,x,y);geometry.push({type,text:value,font:c.font,fontRole:role,x:c.textAlign==='center'?x-w/2:x,y:y-size,width:w,height:size});}
function wrapped(value,x,y,width,size,maxLines=Infinity,color=P.ink,weight=T.body){let line='',lines=0;for(const ch of value){c.font=font(roleFonts?T.body:weight,size);if(c.measureText(line+ch).width>width&&line){text(line,x,y,size,color,Infinity,'text',weight);y+=size*1.55;lines++;line='';}line+=ch;}if(line){text(line,x,y,size,color,Infinity,'text',weight);lines++;}if(lines>maxLines)throw Error('TEXT_INTERNAL_TRUNCATION:'+value);return y;}
// Finite authored card layers; shapes and stroke construction stay with native DG.
function shape(points,options){DG.shape(c,points,options);calls.DG++;}
function rect(x,y,w,h,options){shape(DG.rectPts(x,y,w,h),options);calls.DG++;}
function rule(points,color,width){c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';DG.drawPartial(c,points,DG.cum(points),DG.len(points));calls.DG+=3;c.restore();}
function cardSurface(x,y,w,h,accent){
 const edge=accent?P.accent:C.edge,left=x-w/2,top=y-h/2,offset=H*.005;
 rect(x+offset,y+offset,w,h,{fill:C.shadow});
 rect(x,y,w,h,{fill:C.fill,stroke:edge,lw:H*.0028});
 if(P.motif==='charter'){
  rect(x,y,w-H*.016,h-H*.016,{stroke:C.rule,lw:H*.0009});
  for(const sx of [-1,1])for(const sy of [-1,1]){const px=x+sx*(w/2-H*.015),py=y+sy*(h/2-H*.015);rule([[px-sx*H*.018,py],[px,py],[px,py-sy*H*.018]],P.accent,H*.0018);shape([[px-H*.003,py],[px,py-H*.003],[px+H*.003,py],[px,py+H*.003]],{fill:P.accent});}
 }else if(P.motif==='archive'){
  rect(left+H*.006,y,H*.005,h-H*.014,{fill:edge});
  const right=x+w/2-H*.012;shape([[right-H*.015,top+H*.012],[right,top+H*.012],[right,top+H*.027]],{fill:C.rule});
 }
 rule([[left+W*.015,top+H*.069],[x+w/2-W*.015,top+H*.069]],C.rule,H*.001);
 return offset;
}
const colors={command:P.ink,alliance:P.accent,recognition:P.secondary,conflict:'#b6614d',sequence:P.secondary,interpreted:P.accent,disputed:P.secondary};
function draw(frame){
 currentFrame=frame;
 const loc=framePosition(timing,frame),shot=plan.shots.find(s=>s.id===loc.shot.id),node=data.nodes.find(n=>n.id===shot.nodeId),u=loc.u,t=loc.seconds;geometry=[];calls={U:0,MO:0,CAM:0,DG:0};
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=P.background;c.fillRect(0,0,W,H);
 if(P.motif==='charter'){c.strokeStyle=P.secondary;c.lineWidth=1;c.strokeRect(W*.025,H*.025,W*.95,H*.95);c.strokeRect(W*.031,H*.035,W*.938,H*.93);}else if(P.motif==='archive'){c.strokeStyle=P.secondary;c.globalAlpha=.12;for(let x=W*.045;x<W*.96;x+=W*.04){c.beginPath();c.moveTo(x,H*.11);c.lineTo(x,H*.70);c.stroke();}c.globalAlpha=1;}
 text(data.event,W*.045,H*.068,H*.030,P.ink,Infinity,'heading',T.heading);text(node.timelineLabel??node.historicalDate.label,W*.68,H*.068,H*.022,P.secondary,W*.28,'text',T.label);
 c.strokeStyle=P.secondary;c.lineWidth=1;c.beginPath();c.moveTo(W*.045,H*.095);c.lineTo(W*.955,H*.095);c.stroke();
 const duration=shot.durationFrames/fps,cam=shot.camera?.length?CAM.at(shot.camera,t):{x:W/2,y:H/2,z:1};calls.CAM++;
 const progress=MO.smooth(MO.seg(t,0,duration*.35));calls.MO++;const exit=shot.id===plan.shots.at(-1).id?1:1-MO.smooth(MO.seg(t,duration*.96,duration));calls.MO++;
 const positions=new Map(shot.visual.items.map((item,i)=>{const state=relationState({...item,enter:item.enter??[i*.025,.22+i*.025]},u),q=MO.smooth(state.reveal);calls.MO++;const x=U.lerp((item.fromPosition?.[0]??item.position[0])*W,item.position[0]*W,q),y=U.lerp((item.fromPosition?.[1]??item.position[1]+.025)*H,item.position[1]*H,q);calls.U+=2;return[item.id,{item,x,y,q,alpha:state.opacity*q}];}));
 const activeRelations=[];
 CAM.with(c,cam,()=>{
 for(const band of shot.visual.bands??[]){text(band.label,W*.045,(band.y-.10)*H,H*.018,P.secondary);c.strokeStyle=P.secondary;c.globalAlpha=.24;c.beginPath();c.moveTo(W*.045,band.y*H);c.lineTo(W*.95,band.y*H);c.stroke();c.globalAlpha=1;}

 for(const binding of shot.visual.images??[]){const m=data.media.find(m=>m.id===binding.mediaId),image=images.get(m.id),box={x:binding.x*W,y:binding.y*H,width:binding.width*W,height:binding.height*H};const zoom=U.lerp(1,binding.focusZoom??1.035,progress);calls.U++;c.save();c.globalAlpha=exit;rect(box.x+box.width/2,box.y+box.height/2,box.width,box.height,{fill:C.fill,stroke:P.secondary,lw:H*.002});const inset=H*.004;const scale=Math.min((box.width-inset*2)/image.naturalWidth,(box.height-inset*2)/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;const x=box.x+(box.width-iw)/2,y=box.y+(box.height-ih)/2;c.save();c.beginPath();c.rect(box.x,box.y,box.width,box.height);c.clip();c.translate(box.x+box.width/2,box.y+box.height/2);c.scale(zoom,zoom);c.translate(-box.x-box.width/2,-box.y-box.height/2);c.drawImage(image,x,y,iw,ih);c.restore();geometry.push({type:'image',id:m.id,...box,decoded:true,alpha:exit});wrapped(binding.caption??m.caption,box.x,box.y+box.height+H*.027,box.width,H*.017,3,P.secondary);c.restore();}
 const labels=[];
 for(const [i,link] of (shot.visual.links??[]).entries()){const a=positions.get(link.from),b=positions.get(link.to),state=relationState(link,u),p=MO.smooth(state.reveal),alpha=state.opacity*exit*Math.min(a.alpha,b.alpha);calls.MO++;if(!state.active||alpha<.001)continue;const g=relationGeometry(link,a,b,W,H,i);c.save();c.globalAlpha=alpha;c.strokeStyle=colors[link.semantics]??P.accent;c.lineWidth=H*.002;c.lineCap='round';c.setLineDash(relationAppearance(link).dashed?[H*.007,H*.005]:[]);DG.drawPartial(c,g.points,DG.cum(g.points),DG.len(g.points)*p);calls.DG+=3;if(p>.95){c.setLineDash([]);for(const point of [g.points[0],g.points.at(-1)]){shape(DG.circlePts(point[0],point[1],H*.0035),{fill:P.background,stroke:c.strokeStyle,lw:H*.0015});calls.DG++;}}c.restore();activeRelations.push({id:link.id??link.from+'-'+link.to,semantics:link.semantics,status:link.status??'unverified',opacity:alpha,reveal:p});if(p>.85)labels.push({link,g,alpha:alpha*(p-.85)/.15});}
 for(const {item,x,y,alpha}of positions.values()){if(alpha<.001)continue;c.save();c.globalAlpha=alpha*exit;const w=(item.width??.22)*W,h=(item.height??.16)*H,offset=cardSurface(x,y,w,h,item.accent);const label=item.states?.filter(s=>u>=s.at).at(-1)?.label??item.label;text(label,x-w/2+W*.015,y-h/2+H*.050,H*.0315,C.ink,w-W*.03,'card-title',T.heading);if(item.detail)wrapped(item.detail,x-w/2+W*.015,y-h/2+H*.116,w-W*.03,H*.024,Math.max(1,Math.floor((h-H*.131)/(H*.024*1.55))+1),C.muted);c.restore();geometry.push({type:'card',id:item.id,x:x-w/2-H*.002,y:y-h/2-H*.002,width:w+offset+H*.004,height:h+offset+H*.004,alpha:alpha*exit});}
 for(const {link,g,alpha}of labels){c.save();c.globalAlpha=alpha;c.font=font(T.label,H*.022);const value=link.label+relationAppearance(link).suffix,width=c.measureText(value).width,x=g.label[0]-width/2,y=g.label[1],pad=W*.007;rect(g.label[0],y-H*.008,width+pad*2,H*.042,{fill:P.background,stroke:P.secondary,lw:H*.0008});text(value,x,y,H*.022,colors[link.semantics]??P.secondary,Infinity,'relation-label',T.label);const label=geometry.at(-1);Object.assign(label,{x:x-pad,y:y-H*.029,width:width+pad*2,height:H*.042,alpha,id:link.id??link.from+'-'+link.to});c.restore();}
 });
 // Historical order is ordinal, deliberately independent from playback frame spacing.
 const windowed=timelineWindow(data.nodes,node.id);text('历史时间 · 非等比例'+(windowed.total>windowed.nodes.length?' · 显示邻近事件，完整轴见下方':''),W*.045,H*.735,H*.017,P.secondary);
 const historyTimeline=windowed.nodes.map((n,i)=>({id:n.id,x:W*(.08+(windowed.nodes.length===1?.42:.84*i/(windowed.nodes.length-1))),active:n.id===node.id,date:n.historicalDate.label,precision:n.historicalDate.precision}));
 c.strokeStyle=P.secondary;c.lineWidth=1;c.beginPath();c.moveTo(W*.08,H*.76);c.lineTo(W*.92,H*.76);c.stroke();
 for(const n of historyTimeline){c.fillStyle=n.active?P.accent:P.secondary;c.beginPath();c.arc(n.x,H*.76,n.active?H*.008:H*.004,0,Math.PI*2);c.fill();const original=data.nodes.find(x=>x.id===n.id);wrapped(original.timelineLabel??original.historicalDate.label,n.x-W*.055,H*.791,W*.115,H*.014,2,n.active?P.accent:P.secondary);}
 text(node.title,W*.045,H*.855,H*.029,P.ink,W*.9,'heading',T.heading);
 if(shot.visual.imageCredit)text(shot.visual.imageCredit,W*.045,H*.702,H*.014,P.secondary,W*.91);
 text(shot.visual.legend??'线条是解释设计；虚线为解释性或有争议的联系，不能单独证明因果。',W*.045,H*.120,H*.014,P.secondary,W*.91);
 const cue=captionAt(captions,frame),caption={visible:captionsVisible,text:cue?.text??'',cueId:cue?.id??null,timingKind:cue?.timingKind??null};
 if(captionsVisible&&cue){
  const box={x:W*.045,y:H*.875,width:W*.91,height:H*.092};rect(W*.5,box.y+box.height/2,box.width,box.height,{fill:'#10242b'});
  const size=H*.033,width=box.width-W*.036,lines=[];let line='';c.save();c.textAlign='center';c.font=font(T.label,size);
  for(const ch of cue.text){if(c.measureText(line+ch).width>width&&line){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);if(lines.length>2)throw Error('CAPTION_INTERNAL_TRUNCATION:'+cue.text);
  const baseline=box.y+box.height/2-(lines.length-1)*size*1.35/2+size*.35;lines.forEach((line,i)=>text(line,W*.5,baseline+i*size*1.35,size,'#fffdf3',width,'caption-text',T.label));c.restore();geometry.push({type:'caption-box',...box});
 }
 if(geometry.some(g=>Object.values(g).some(v=>typeof v==='number'&&!Number.isFinite(v))))throw Error('NONFINITE_GEOMETRY');
 updateVoice(frame);window.historyState={frame,nodeId:node.id,shotId:shot.id,chapterId:node.chapterId,localSeconds:t,u,milliseconds:loc.timeMs,camera:cam,geometry,calls,progress,historyTimeline,activeRelations,caption};window.parent.postMessage({source:'history-event',...window.historyState},location.origin);return window.historyState;
}
window.historyComposition={draw,data,plan,setCaptionsVisible(value){captionsVisible=Boolean(value);return draw(currentFrame);}};draw(0);window.historyReady();
