// Authored diagram bindings only. Motion, camera and strokes remain native Huashu.
export function relationGeometry(link,a,b,W,H,index=0){
 const lane=link.laneY??(.30-index*.045);
 const points=[[a.x,a.y-(a.item.height??.16)*H/2],...(link.route??[[a.x/W,lane],[b.x/W,lane]]).map(p=>[p[0]*W,p[1]*H]),[b.x,b.y-(b.item.height??.16)*H/2]];
 const label=link.labelPosition??[(a.x+b.x)/2/W,lane-.018];
 return {points,label:[label[0]*W,label[1]*H]};
}
export function relationState(link,u){
 const start=link.enter?.[0]??.15,end=link.enter?.[1]??.45;
 const reveal=Math.max(0,Math.min(1,(u-start)/(end-start)));
 const withdraw=link.exit?1-Math.max(0,Math.min(1,(u-link.exit[0])/(link.exit[1]-link.exit[0]))):1;
 return {reveal,opacity:withdraw,active:reveal>0&&withdraw>0};
}
export function boxesOverlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function timelineWindow(nodes,current,slots=7){const index=nodes.findIndex(n=>n.id===current);const start=Math.max(0,Math.min(nodes.length-slots,index-Math.floor(slots/2)));return {nodes:nodes.slice(start,start+slots),start,total:nodes.length};}
export function relationAppearance(link){const status=link.status??'unverified';return {dashed:['interpreted','disputed'].includes(link.semantics)||status!=='reviewed',suffix:status==='disputed'?'〔有争议〕':status==='unverified'?'〔未核验〕':''};}
