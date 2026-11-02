/* Dashboard Pelatihan Masyarakat KP – aplikasi frontend (GitHub Pages) */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function api(action,params){
  const u=new URL(CONFIG.API_URL);u.searchParams.set("action",action);
  Object.entries(params||{}).forEach(([k,v])=>{if(v!=="")u.searchParams.set(k,v)});
  const r=await fetch(u.toString());if(!r.ok)throw new Error("HTTP "+r.status);
  const j=await r.json();if(!j.ok)throw new Error(j.error||"gagal");return j.data}
async function loadBoot(){
  const ttl=(CONFIG.CACHE_MENIT||15)*60000;
  try{const c=JSON.parse(sessionStorage.getItem("kkp_boot")||"null");if(c&&Date.now()-c.t<ttl)return c.d}catch(e){}
  let tok="";try{tok=sessionStorage.getItem("kkp_tok")||""}catch(e){}
  const d=await api("bootstrap",{token:tok});
  try{sessionStorage.setItem("kkp_boot",JSON.stringify({t:Date.now(),d:d}))}catch(e){}
  return d}
function fail(e){
  const cfg=/GANTI/.test(CONFIG.API_URL);
  $("ldt").innerHTML=cfg?"<b>API belum dikonfigurasi.</b><br>Isi <code>API_URL</code> di <code>docs/js/config.js</code> dengan URL Web App Apps Script Anda.":"<b>Gagal memuat data.</b><br>"+esc(e.message)+"";
  if(e.message==="unauthorized"){$("ldt").innerHTML="<b>Dashboard ini dilindungi.</b><br>Masukkan token untuk melanjutkan.<br><br><input id='ltok' type='password' placeholder='Token' style='max-width:200px'> <button id='lgo'>Masuk</button>";
  $("lgo").onclick=()=>{try{sessionStorage.setItem("kkp_tok",$("ltok").value.trim())}catch(x){}location.reload()}}
  $("ldspin").hidden=true;$("ldretry").hidden=cfg}
(async function main(){
  if(CONFIG.LOGO_URL){const i=document.createElement("img");i.src=CONFIG.LOGO_URL;i.alt="Logo";i.className="logo";$("hdr").prepend(i)}
  if(innerWidth<720)$("flt").open=false;
  $("ldretry").onclick=()=>location.reload();
  try{const D=await loadBoot();start(D);$("ld").hidden=true}catch(e){fail(e)}
})();
function start(D){

const BL=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const fmt=n=>n.toLocaleString("id-ID");
const $=id=>document.getElementById(id);
const f={t:"",m:"",b:"",d:"",p:"",j:"",s:"",r:"",n:""};
const years=[...new Set(D.ev.map(e=>e[3]))].sort();
function fill(id,opts){$(id).innerHTML=opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("")}
fill("fT",[["","Semua tahun"],...years.map(y=>[y,y])]);
fill("fM",[["","Semua bulan"],...BL.map((m,i)=>[i+1,m])]);
fill("fB",[["","Semua penyelenggara"],...D.bal.map((b,i)=>[i,b])]);
fill("fD",[["","Semua bidang"],...D.bid.map((b,i)=>[i,b])]);
fill("fJ",[["","Semua metode"],...D.met.map((b,i)=>[i,b])]);fill("fS",[["","Semua skema"],...D.ska.map((b,i)=>[i,b])]);fill("fR",[["","Semua program"],...D.ter.map((b,i)=>[i,b])]);
fill("fN",[["","Semua"],["dn","Dalam negeri"],["ln","Luar negeri"]]);
if(years.length===1){f.t=String(years[0]);$("fT").value=f.t}
[["fT","t"],["fM","m"],["fB","b"],["fD","d"],["fJ","j"],["fS","s"],["fR","r"],["fN","n"]].forEach(([id,k])=>$(id).onchange=e=>{f[k]=e.target.value;render()});
$("rst").onclick=()=>{Object.assign(f,{t:years.length===1?String(years[0]):"",m:"",b:"",d:"",p:"",j:"",s:"",r:"",n:""});$("fT").value=f.t;["fM","fB","fD","fJ","fS","fR","fN"].forEach(i=>$(i).value="");render()};
$("chip").onclick=()=>{f.p="";render()};$("q").oninput=render;
const ok=(e,L,skip)=>(skip==="t"||f.t===""||e[3]==f.t)&&(skip==="m"||f.m===""||e[4]==f.m)&&(f.b===""||e[1]==f.b)&&(f.d===""||e[2]==f.d)&&(f.j===""||e[5]==f.j)&&(f.s===""||e[6]==f.s)&&(f.r===""||e[7]==f.r)&&(skip==="n"||f.n===""||(f.n==="ln")===(L[0]==="Luar Negeri"))&&(skip==="p"||f.p===""||L[0]===f.p);
const sel=skip=>D.rows.filter(r=>ok(D.ev[r[0]],D.loc[r[1]],skip));
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const ch={};
function draw(id,cfg){if(ch[id]){ch[id].destroy()}Chart.defaults.color=css("--mut");Chart.defaults.borderColor=css("--grid");ch[id]=new Chart($(id),cfg)}
const base={responsive:true,maintainAspectRatio:false,animation:false};
function render(){
const R=sel(),evs=new Set(R.map(r=>r[0])),pe=R.reduce((a,r)=>a+r[2],0);
const pv=new Set(R.map(r=>D.loc[r[1]][0]).filter(p=>p!=="Luar Negeri")),kb=new Set(R.map(r=>D.loc[r[1]].join("|")));
$("kpis").innerHTML=[["Jumlah pelatihan",fmt(evs.size),"kegiatan (nama + balai + bulan)"],["Peserta dilatih",fmt(pe),"orang"],["Provinsi terjangkau",pv.size,"dari 38 provinsi"],["Kab/Kota terjangkau",kb.size,"lokasi domisili peserta"],["Rata-rata peserta",evs.size?fmt(Math.round(pe/evs.size)):0,"orang per pelatihan"]].map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b><span>${k[2]}</span></div>`).join("");
const ty=f.t?[f.t]:Object.keys(D.tg),wt=ty.filter(y=>D.tg[y][0]!=null),tt=wt.reduce((a,y)=>a+D.tg[y][0],0),tw=wt.reduce((a,y)=>a+D.tg[y][1],0);
let hh="Indikator: Masyarakat KP yang dilatih (orang)";
if(wt.length)hh+=" · Target "+(wt.length>1?wt[0]+"–"+wt[wt.length-1]:wt[0])+": "+fmt(tt)+" · Realisasi: "+fmt(tw)+" ("+(tw/tt*100).toFixed(1).replace(".",",")+"%)";
ty.filter(y=>D.tg[y][0]==null).forEach(y=>{hh+=" · "+y+" ("+D.tg[y][2].replace("Realisasi ","")+"): "+fmt(D.tg[y][1])+" orang, target belum tersedia"});
$("hp").textContent=hh+" · Sumber: Formulir 2 – Data Pendukung Capaian IKU";
let dn=0,ln=0;sel("n").forEach(r=>{D.loc[r[1]][0]==="Luar Negeri"?ln+=r[2]:dn+=r[2]});const tn=dn+ln,pc=v=>tn?(v/tn*100).toFixed(v>0&&v/tn<0.01?2:1).replace(".",",")+"%":"0%";
$("dnln").innerHTML="<b>Domisili peserta</b> (mengikuti filter lain): Dalam negeri <b>"+fmt(dn)+"</b> orang ("+pc(dn)+") · Luar negeri <b>"+fmt(ln)+"</b> orang ("+pc(ln)+")";
$("chip").style.display=f.p?"inline-block":"none";$("chip").textContent="Provinsi: "+f.p+" ✕";
// per tahun
const RY=sel("t"),ya=years.map(y=>{const s=new Set(),p={n:0};RY.forEach(r=>{if(D.ev[r[0]][3]===y){s.add(r[0]);p.n+=r[2]}});return[s.size,p.n]});
draw("cY",{type:"bar",data:{labels:years.map(y=>D.tg[y][3]?y+"*":y),datasets:[{data:ya.map(a=>a[0]),backgroundColor:years.map(y=>f.t==""||f.t==y?css("--blue"):css("--grid")),borderRadius:6}]},options:{...base,plugins:{legend:{display:false},tooltip:{callbacks:{afterLabel:c=>fmt(ya[c.dataIndex][1])+" peserta"}}},onClick:(e,a)=>{if(a.length){const y=String(years[a[0].index]);f.t=f.t===y&&years.length>1?"":y;$("fT").value=f.t;render()}},scales:{y:{beginAtZero:true}}}});
// per bulan
const RM=sel("m"),mc=y=>BL.map((_,i)=>{const s=new Set();let n=0;RM.forEach(r=>{const e=D.ev[r[0]];if(e[4]===i+1&&(y===""||e[3]==y)){s.add(r[0]);n+=r[2]}});return[s.size,n]});
const ys=f.t===""?years:[f.t],PC=[css("--cyan"),css("--gold"),css("--blue"),"#8E5BA8","#E07B39"],MA=ys.map(y=>mc(y));
draw("cM",{type:"bar",data:{labels:BL,datasets:ys.map((y,k)=>({label:String(y),data:MA[k].map(a=>a[0]),backgroundColor:BL.map((_,i)=>f.m==""||f.m==i+1?PC[years.indexOf(Number(y))%5]:css("--grid")),borderRadius:5}))},options:{...base,plugins:{legend:{display:ys.length>1},tooltip:{callbacks:{afterLabel:c=>fmt(MA[c.datasetIndex][c.dataIndex][1])+" peserta"}}},onClick:(e,a)=>{if(a.length){const m=String(a[0].index+1);f.m=f.m===m?"":m;$("fM").value=f.m;render()}},scales:{y:{beginAtZero:true,title:{display:true,text:"Jumlah pelatihan"}}}}});
// provinsi
const RP=sel("p"),pm={};RP.forEach(r=>{const p=D.loc[r[1]][0];pm[p]=(pm[p]||0)+r[2]});
const pa=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,20);
draw("cP",{type:"bar",data:{labels:pa.map(a=>a[0]),datasets:[{data:pa.map(a=>a[1]),backgroundColor:pa.map(a=>f.p===""||f.p===a[0]?css("--blue"):css("--grid")),borderRadius:4}]},options:{...base,indexAxis:"y",plugins:{legend:{display:false}},onClick:(e,a)=>{if(a.length){const p=pa[a[0].index][0];f.p=f.p===p?"":p;render()}}}});
// bidang
const bm={};R.forEach(r=>{const k=D.ev[r[0]][2];bm[k]=(bm[k]||0)+r[2]});const bk=Object.keys(bm);
draw("cD",{type:"doughnut",data:{labels:bk.map(k=>D.bid[k]),datasets:[{data:bk.map(k=>bm[k]),backgroundColor:["#0A2E6E","#0F6CBD","#19A7CE","#F2A900","#7FB8E6","#5B6B80","#E07B39","#2A9D8F","#8E5BA8","#B5C99A","#C44536","#3D5A80","#6B9080","#FFB4A2","#9AA5B1"],borderWidth:0}]},options:{...base,cutout:"58%",plugins:{legend:{position:"right",labels:{boxWidth:10}}}}});
// balai
const lm={};R.forEach(r=>{const k=D.ev[r[0]][1];lm[k]=(lm[k]||0)+r[2]});const lk=Object.keys(lm).sort((a,b)=>lm[b]-lm[a]);
draw("cB",{type:"bar",data:{labels:lk.map(k=>D.bal[k]),datasets:[{data:lk.map(k=>lm[k]),backgroundColor:css("--cyan"),borderRadius:4}]},options:{...base,indexAxis:"y",plugins:{legend:{display:false}}}});
// tabel
const A={};R.forEach(r=>{const a=A[r[0]]||(A[r[0]]={n:0,L:{}});a.n+=r[2];a.L[r[1]]=(a.L[r[1]]||0)+r[2]});
const q=$("q").value.toLowerCase();
let T=Object.entries(A).map(([i,a])=>{const e=D.ev[i],ls=Object.entries(a.L).sort((x,y)=>y[1]-x[1]),l=D.loc[ls[0][0]];return{nm:e[0],b:D.bal[e[1]],lo:l[1]+", "+l[0]+(ls.length>1?` (+${ls.length-1} lokasi lain)`:""),m:BL[e[4]-1]+" "+e[3],n:a.n,id:i}});
T=T.filter(t=>!q||(t.nm+" "+t.lo).toLowerCase().includes(q)).sort((a,b)=>b.n-a.n);
$("tb").innerHTML=T.slice(0,200).map((t,i)=>`<tr><td data-l="No">${i+1}</td><td data-l="Pelatihan" class="nm">${esc(t.nm)}</td><td data-l="Penyelenggara">${esc(t.b)}</td><td data-l="Lokasi">${esc(t.lo)}</td><td data-l="Waktu">${t.m}</td><td data-l="Peserta" class="n"><a href="#" class="pl" data-id="${t.id}" title="Lihat daftar peserta">${fmt(t.n)}</a></td></tr>`).join("");
$("tn").textContent=`Menampilkan ${Math.min(200,T.length)} dari ${fmt(T.length)} pelatihan, diurutkan menurut jumlah peserta.`;
}
const PC=new Map();let ML=[],CUR=null;
const getTok=()=>{try{return sessionStorage.getItem("kkp_tok")||""}catch(e){return""}};
const setTok=t=>{try{sessionStorage.setItem("kkp_tok",t)}catch(e){}};
const NEGKL=x=>x[5]||"Luar negeri";
function mrender(){const q=$("mq").value.toLowerCase(),ln=f.n==="ln";
$("mth").innerHTML=ln?"<th>No</th><th>Nama peserta</th><th>JK</th><th>Pendidikan</th><th>Negara</th>":"<th>No</th><th>Nama peserta</th><th>JK</th><th>Pendidikan</th><th>Kab/Kota</th><th>Provinsi</th>";
const R=ML.filter(x=>!q||(x[0]+" "+(ln?NEGKL(x):x[3]+" "+x[4])).toLowerCase().includes(q));
$("mtb").innerHTML=R.slice(0,500).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x[0])}</td><td>${x[1]==="L"||x[1]==="P"?x[1]:"-"}</td><td>${esc(x[2])}</td>`+(ln?`<td>${esc(NEGKL(x))}</td>`:`<td>${esc(x[3])}</td><td>${esc(x[4])}</td>`)+"</tr>").join("");
$("mtn").textContent=`Menampilkan ${Math.min(500,R.length)} dari ${fmt(R.length)} peserta.`+(R.length>500?" Gunakan kolom pencarian untuk mempersempit.":"")}
function mshow(list){const ln=f.n==="ln";
ML=list.filter(x=>(!f.p||x[4]===f.p)&&(f.n===""||ln===(x[4]==="Luar Negeri")));
const lk=ML.filter(x=>x[1]==="L").length,pr=ML.filter(x=>x[1]==="P").length,pv=new Set(ML.map(x=>x[4]).filter(p=>p!=="Luar Negeri")),lnn=ML.filter(x=>x[4]==="Luar Negeri").length;
$("ms").innerHTML=(ln?[["Peserta",fmt(ML.length)],["Laki-laki",fmt(lk)],["Perempuan",fmt(pr)],["Negara asal",new Set(ML.map(NEGKL)).size]]:[["Peserta",fmt(ML.length)],["Laki-laki",fmt(lk)],["Perempuan",fmt(pr)],["Provinsi asal",pv.size],["Luar negeri",lnn]]).map(a=>`<span>${a[0]}: <b>${a[1]}</b></span>`).join("");
$("mauth").hidden=true;$("mq").hidden=false;$("mq").value="";$("mq").placeholder=ln?"Cari nama atau negara…":"Cari nama, kab/kota, atau provinsi…";mrender()}
async function mload(){const key=CUR;
$("mtb").innerHTML="";$("mtn").textContent="Memuat daftar peserta dari server…";$("ms").innerHTML="";
try{if(!PC.has(key))PC.set(key,await api("peserta",{key:key,token:getTok()}));mshow(PC.get(key))}
catch(e){if(String(e.message)==="unauthorized"){$("mq").hidden=true;$("mauth").hidden=false;$("mtn").textContent=getTok()?"Kata sandi salah. Coba lagi.":"Daftar peserta memuat data pribadi. Masukkan kata sandi (token) untuk melanjutkan.";$("mtok").focus()}
else $("mtn").textContent="Gagal memuat: "+e.message}}
function openMd(id){const e=D.ev[id];CUR=e[8];
$("mht").textContent=e[0];$("mhs").textContent=D.bal[e[1]]+" · "+BL[e[4]-1]+" "+e[3]+" · Bidang: "+D.bid[e[2]];
$("md").hidden=false;document.body.style.overflow="hidden";mload()}
function closeMd(){$("md").hidden=true;document.body.style.overflow=""}
$("tb").onclick=e=>{const a=e.target.closest(".pl");if(a){e.preventDefault();openMd(a.dataset.id)}};
$("mx").onclick=closeMd;$("md").onclick=e=>{if(e.target.id==="md")closeMd()};$("mq").oninput=mrender;
$("mgo").onclick=()=>{setTok($("mtok").value.trim());mload()};$("mtok").onkeydown=e=>{if(e.key==="Enter")$("mgo").click()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMd()});
$("rf").onclick=()=>{try{sessionStorage.removeItem("kkp_boot")}catch(e){}location.reload()};
$("ver").textContent=D.meta?"Data diperbarui: "+new Date(D.meta.generated).toLocaleString("id-ID")+" · "+fmt(D.meta.peserta)+" baris peserta":"";
render();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",render);

}
