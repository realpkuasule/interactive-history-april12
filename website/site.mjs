import qrcode from './vendor/qrcode.mjs';
const dialog=document.querySelector('#share-dialog');
for(const button of document.querySelectorAll('[data-share]'))button.addEventListener('click',()=>{
 const url=new URL(location.href);url.hash='';
 const input=document.querySelector('#share-url'),status=document.querySelector('#share-status'),target=document.querySelector('#share-qr');
 input.value=url.href;target.replaceChildren();
 if(url.protocol==='https:'&&!['localhost','127.0.0.1'].includes(url.hostname)){
  const qr=qrcode(0,'M');qr.addData(url.href);qr.make();target.innerHTML=qr.createSvgTag({cellSize:6,margin:24,scalable:true,alt:'当前页面的分享二维码'});status.textContent='';
 }else status.textContent='本地预览地址不能跨设备打开。公开上线后可扫码分享。';
 dialog.showModal();
});
document.querySelector('#copy-link')?.addEventListener('click',async()=>{
 const input=document.querySelector('#share-url'),status=document.querySelector('#share-status');
 try{await navigator.clipboard.writeText(input.value);status.textContent='链接已复制。';}catch{input.focus();input.select();status.textContent='请复制上方链接。';}
});
// Only size the containing web frame; native playback and canvas stay untouched.
for(const frame of document.querySelectorAll('.native-player'))frame.addEventListener('load',()=>{
 try{const doc=frame.contentDocument,main=doc.querySelector('main');const resize=()=>{frame.style.height=Math.ceil(main.getBoundingClientRect().height)+'px';};new ResizeObserver(resize).observe(main);resize();}catch{ /* Same-origin static exports are required by the builder. */ }
});
