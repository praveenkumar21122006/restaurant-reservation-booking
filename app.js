/* Ember & Oak — SPA + LocalStorage mock API layer */
const LS_RES='rrs_reservations_v1', LS_TBL='rrs_tables_v1';
const HOLD_MIN=120; // 2-hour window
const OPEN_HOURS={0:[10,21],1:[11,22],2:[11,22],3:[11,22],4:[11,22],5:[11,23],6:[11,23]}; // day: [open, close)
const DAYNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const DEFAULT_TABLES=[
 {id:'T1',name:'T1',capacity:2,type:'2-top',zone:'Main Hall',adjacent:['T2','T3']},
 {id:'T2',name:'T2',capacity:2,type:'2-top',zone:'Main Hall',adjacent:['T1','T4']},
 {id:'T3',name:'T3',capacity:4,type:'4-top',zone:'Main Hall',adjacent:['T1','T4','T5']},
 {id:'T4',name:'T4',capacity:4,type:'4-top',zone:'Main Hall',adjacent:['T2','T3','T6']},
 {id:'T5',name:'T5',capacity:6,type:'6-top',zone:'Main Hall',adjacent:['T3','T6','T7']},
 {id:'T6',name:'T6',capacity:4,type:'4-top',zone:'Main Hall',adjacent:['T4','T5','T8']},
 {id:'T7',name:'T7',capacity:2,type:'2-top',zone:'Patio',adjacent:['T5','T8','T9']},
 {id:'T8',name:'T8',capacity:4,type:'Booth',zone:'Booth Row',adjacent:['T6','T7','T10']},
 {id:'T9',name:'T9',capacity:4,type:'Booth',zone:'Booth Row',adjacent:['T7','T10','T11']},
 {id:'T10',name:'T10',capacity:6,type:'6-top',zone:'Patio',adjacent:['T8','T9','T12']},
 {id:'T11',name:'T11',capacity:2,type:'2-top',zone:'Patio',adjacent:['T9','T12']},
 {id:'T12',name:'T12',capacity:8,type:'Round',zone:'Main Hall',adjacent:['T10','T11']},
];
const ACTIVE=['Pending','Confirmed','Checked-In'];

let tables=load(LS_TBL,null);
let reservations=load(LS_RES,null);
if(!tables){tables=DEFAULT_TABLES;save(LS_TBL,tables);}
if(!reservations){reservations=seedReservations();save(LS_RES,reservations);}

let booking={party:2,date:todayStr(),time:null,tables:[],zone:'',editingId:null};
let currentId=null, reassignId=null, adminView='floor';

function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch{return f;}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v));}
function todayStr(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return todayStr(d);}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function uid(){return 'r'+Date.now().toString(36)+Math.floor(Math.random()*999);}
function makeCode(){const c='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return 'EO-'+s;}
function toMin(t){const[a,b]=t.split(':').map(Number);return a*60+b;}
function fmtTime(t){let[h,m]=t.split(':').map(Number);const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`;}
function overlaps(d1,t1,d2,t2){if(d1!==d2)return false;return Math.abs(toMin(t1)-toMin(t2))<HOLD_MIN;}
function isActive(r){return ACTIVE.includes(r.status);}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);}
function validPhone(p){return (p.replace(/\D/g,'').length)>=7;}

/* ---------- seed ---------- */
function seedReservations(){
 const t=todayStr(), tm=todayStr(new Date(Date.now()-864e5));
 return [
  {id:uid(),code:'EO-AK42QZ',firstName:'Maya',lastName:'Chen',email:'maya@example.com',phone:'(503) 555-0111',notes:'Window seat, anniversary',partySize:2,date:t,time:'18:30',tables:['T1'],status:'Confirmed',createdAt:Date.now()-72e5},
  {id:uid(),code:'EO-B7T9WR',firstName:'Jonas',lastName:'Weber',email:'jonas@example.com',phone:'(503) 555-0142',notes:'',partySize:4,date:t,time:'19:00',tables:['T3'],status:'Pending',createdAt:Date.now()-54e5},
  {id:uid(),code:'EO-C3M8PL',firstName:'Priya',lastName:'Nair',email:'priya@example.com',phone:'(503) 555-0177',notes:'Nut allergy',partySize:6,date:t,time:'19:30',tables:['T5'],status:'Checked-In',createdAt:Date.now()-36e5},
  {id:uid(),code:'EO-D9X2KN',firstName:'Sam',lastName:'Okafor',email:'sam@example.com',phone:'(503) 555-0199',notes:'Birthday cake in fridge',partySize:8,date:t,time:'20:00',tables:['T10','T12'],status:'Confirmed',createdAt:Date.now()-18e5},
  {id:uid(),code:'EO-E5H6TD',firstName:'Lena',lastName:'Marsh',email:'lena@example.com',phone:'(503) 555-0130',notes:'',partySize:2,date:tm,time:'19:00',tables:['T2'],status:'Completed',createdAt:Date.now()-9e6},
  {id:uid(),code:'EO-F8J2VB',firstName:'Theo',lastName:'Park',email:'theo@example.com',phone:'(503) 555-0160',notes:'No-show last time',partySize:4,date:tm,time:'20:00',tables:['T4'],status:'Cancelled',createdAt:Date.now()-8e6},
 ];
}

/* ---------- operating hours / slots ---------- */
function hoursFor(dateStr){const d=new Date(dateStr+'T12:00:00');return OPEN_HOURS[d.getDay()];}
function slotsFor(dateStr){
 const [o,c]=hoursFor(dateStr);const out=[];
 for(let h=o;h<c;h++){for(const m of [0,30]){if(h===c-1&&m>0)break;out.push(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'));}}
 // block past slots today
 if(dateStr===todayStr()){const now=new Date();const cur=now.getHours()*60+now.getMinutes()+30;
  return out.filter(s=>toMin(s)>cur);}
 return out;
}
function isOpenNow(){const n=new Date();const d=todayStr();const[ o,c]=hoursFor(d);const h=n.getHours()+n.getMinutes()/60;return h>=o&&h<c;}

/* ---------- availability engine ---------- */
function freeTables(date,time,zone='',ignoreId=null){
 return tables.filter(t=>{
  if(zone&&t.zone!==zone)return false;
  return !reservations.some(r=>r.id!==ignoreId&&isActive(r)&&r.tables.includes(t.id)&&overlaps(r.date,r.time,date,time));
 });
}
function suggestTables(date,time,party,zone='',ignoreId=null){
 const free=freeTables(date,time,zone,ignoreId);
 const single=free.filter(t=>t.capacity>=party).sort((a,b)=>a.capacity-b.capacity);
 if(single.length)return {tables:[single[0]],combined:false};
 // combine adjacent: greedy BFS over adjacency among free tables
 const freeSet=new Set(free.map(t=>t.id));
 const byId=Object.fromEntries(tables.map(t=>[t.id,t]));
 // try pairs then triples of adjacent free tables
 const combos=[];
 for(const t of free){
  for(const a of t.adjacent||[]){
   if(freeSet.has(a)&&a!==t.id){const pair=[t.id,a].sort().join('+');
    if(!combos.includes(pair))combos.push(pair);}
  }
 }
 combos.sort((x,y)=>capSum(x,byId)-capSum(y,byId));
 for(const c of combos){const ids=c.split('+');if(capSum(c,byId)>=party)return {tables:ids.map(id=>byId[id]),combined:true};}
 // fallback: any greedy accumulation of adjacent chain
 const sorted=[...free].sort((a,b)=>b.capacity-a.capacity);
 let chain=[],cap=0;
 for(const t of sorted){if(!chain.length||chain.some(id=>byId[id].adjacent?.includes(t.id))){chain.push(t.id);cap+=t.capacity;if(cap>=party)return {tables:chain.map(id=>byId[id]),combined:true};}}
 return {tables:[],combined:false};
 function capSum(c,byId){return c.split('+').reduce((s,id)=>s+(byId[id]?.capacity||0),0);}
}
function slotStatus(date,slot,party){
 const s=suggestTables(date,slot,party,booking.zone,booking.editingId);
 return s.tables.length?'open':'full';
}

/* ---------- navigation ---------- */
function go(view){
 document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
 document.getElementById('view-'+view).classList.remove('hidden');
 document.querySelectorAll('.navlink').forEach(n=>n.classList.toggle('active',n.dataset.nav===view));
 document.getElementById('mobileMenu').classList.add('hidden');
 if(view==='book')initWizard();
 if(view==='admin'){initAdmin();renderKPIs();renderFloor();renderLedger();}
 if(view==='home')renderHome();
 window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- home ---------- */
function renderHome(){
 const badge=isOpenNow()
  ?'<span class="inline-flex items-center gap-1.5">🟢 Open now — walk-ins welcome</span>'
  :'<span class="inline-flex items-center gap-1.5">🔴 Currently closed — book ahead</span>';
 document.getElementById('heroOpenBadge').innerHTML=badge;
 const ob=document.getElementById('openBadge');
 ob.innerHTML=isOpenNow()?'🟢 Open now':'🔴 Closed';
 ob.className='hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full '+(isOpenNow()?'bg-emerald-100 text-emerald-800':'bg-stone-200 text-stone-600');
 const hl=document.getElementById('hoursList');hl.innerHTML='';
 DAYNAMES.forEach((d,i)=>{
  // map: index 0=Sunday.. fix order Mon first
  const idx=[1,2,3,4,5,6,0][i];const[o,c]=OPEN_HOURS[idx];
  const today=new Date().getDay()===idx;
  hl.innerHTML+=`<div class="flex justify-between py-2 text-sm ${today?'font-bold':''}"><span>${DAYNAMES[idx]} ${today?'<span class="ml-2 text-[10px] bg-bark text-cream px-2 py-0.5 rounded-full">TODAY</span>':''}</span><span class="text-stone-500">${fmtTime(o+':00')} – ${fmtTime(c+':00')}</span></div>`;
 });
 document.getElementById('statToday').textContent=reservations.filter(r=>r.date===todayStr()&&r.status!=='Cancelled').length;
 document.getElementById('homeTables').innerHTML=tables.map(t=>`
  <div class="border border-stone-200 rounded-2xl p-3 text-center bg-cream">
   <div class="font-display font-bold text-lg">${t.name}</div>
   <div class="text-xs text-stone-500">${t.type} • ${t.capacity} seats</div>
   <div class="text-[11px] font-semibold text-ember mt-1">${esc(t.zone)}</div>
  </div>`).join('');
}

/* ---------- wizard ---------- */
function initWizard(){
 if(!booking.date||booking.date<todayStr())booking.date=todayStr();
 document.getElementById('bkDate').min=todayStr();
 document.getElementById('bkDate').max=addDays(todayStr(),60);
 document.getElementById('bkDate').value=booking.date;
 document.getElementById('bkZone').value=booking.zone||'';
 renderParty();renderSlots();renderSteps();wizardNext(booking.editingId?4:1,true);
 onDateChange();
}
function renderSteps(){
 const labels=['Party','Date & Time','Availability','Details'];
 document.getElementById('stepsBar').innerHTML=labels.map((l,i)=>{
  const n=i+1,cur=window._step||1;
  const cls=n<cur?'stepdone':n===cur?'stepactive':'';
  return `<div class="stepdot ${cls}"><span class="stepnum">${n<cur?'✓':n}</span><span class="steplabel hidden sm:block">${l}</span></div>`;
 }).join('');
}
function wizardNext(n,silent){
 // guards
 if(n===3&&!booking.time){flashSlots();return;}
 window._step=n;
 document.querySelectorAll('.wizard-step').forEach(s=>s.classList.add('hidden'));
 document.getElementById('step-'+n).classList.remove('hidden');
 renderSteps();
 if(n===3)renderAvailability();
}
function renderParty(){
 const g=document.getElementById('partyGrid');g.innerHTML='';
 for(let i=1;i<=10;i++){
  g.innerHTML+=`<button onclick="setParty(${i})" class="partybtn ${booking.party===i?'selected':''}">${i}</button>`;
 }
 g.innerHTML+=`<button onclick="setParty(12)" class="partybtn ${booking.party>10?'selected':''}">10+</button>`;
}
function setParty(n){booking.party=n;booking.time=null;renderParty();renderSlots();}
function onDateChange(){
 const v=document.getElementById('bkDate').value;
 if(!v)return;
 if(v<todayStr()){document.getElementById('bkDate').value=todayStr();booking.date=todayStr();}
 else booking.date=v;
 const[o,c]=hoursFor(booking.date);
 document.getElementById('bkDateHint').textContent=`Open ${fmtTime(o+':00')} – ${fmtTime(c+':00')} on ${booking.date}. Past times are blocked.`;
 booking.time=null;booking.zone=document.getElementById('bkZone').value;
 renderSlots();
}
function renderSlots(){
 booking.zone=document.getElementById('bkZone')?.value||booking.zone||'';
 const grid=document.getElementById('slotGrid');
 const slots=slotsFor(booking.date);
 if(!slots.length){grid.innerHTML='<p class="col-span-full text-sm text-stone-500 bg-cream border border-stone-200 rounded-xl p-3">No more slots today — try tomorrow.</p>';return;}
 grid.innerHTML=slots.map(s=>{
  const st=slotStatus(booking.date,s,booking.party);
  const dis=st==='full';
  return `<button ${dis?'disabled':''} onclick="setTime('${s}')" class="slot ${booking.time===s?'selected':''}" title="${dis?'Fully booked':'Available'}">${fmtTime(s)}${dis?' • full':''}</button>`;
 }).join('');
}
function setTime(t){booking.time=t;renderSlots();}
function flashSlots(){wizardNext(2);document.getElementById('slotGrid').style.animation='none';setTimeout(()=>{alert('Please choose a date and an available time slot first.');},50);}
function renderAvailability(){
 const sum=document.getElementById('availSummary');
 sum.textContent=`${booking.party} guest(s) • ${booking.date} • ${booking.time?fmtTime(booking.time):'—'} ${booking.zone?'• '+booking.zone:''}`;
 const box=document.getElementById('availResult');
 if(!booking.time){box.innerHTML='<p class="text-sm">No time selected.</p>';return;}
 const s=suggestTables(booking.date,booking.time,booking.party,booking.zone,booking.editingId);
 if(s.tables.length){
  booking.tables=s.tables.map(t=>t.id);
  box.innerHTML=`<div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
   <p class="font-bold text-emerald-900">✓ ${s.combined?'Tables combined for your party':'Table available'} — ${s.tables.map(t=>t.name).join(' + ')}</p>
   <p class="text-sm text-emerald-800 mt-1">${s.tables.map(t=>`${t.name} (${t.capacity} seats, ${esc(t.zone)})`).join(' • ')}${s.combined?' — adjacent tables will be joined by staff.':''}</p>
   <p class="text-xs text-emerald-700 mt-2">Held for a 2-hour window. No double-booking: conflicting tables were excluded automatically.</p></div>`;
  document.getElementById('toDetailsBtn').disabled=false;
 }else{
  booking.tables=[];
  const alts=slotsFor(booking.date).filter(s=>slotStatus(booking.date,s,booking.party)==='open').slice(0,5);
  box.innerHTML=`<div class="bg-red-50 border border-red-200 rounded-2xl p-4">
   <p class="font-bold text-red-800">✕ Fully booked for ${fmtTime(booking.time)}.</p>
   <p class="text-sm text-red-700 mt-1">Try a nearby open slot:</p>
   <div class="mt-2 flex flex-wrap gap-2">${alts.map(a=>`<button onclick="setTime('${a}');renderAvailability();renderSlots();" class="iconbtn">${fmtTime(a)}</button>`).join('')||'No alternatives this day.'}</div></div>`;
 }
}
function showErr(m){const e=document.getElementById('formError');e.textContent=m;e.classList.remove('hidden');}
function confirmBooking(){
 const f=document.getElementById('gFirst').value.trim(),l=document.getElementById('gLast').value.trim(),
  e=document.getElementById('gEmail').value.trim(),p=document.getElementById('gPhone').value.trim(),
  n=document.getElementById('gNotes').value.trim();
 document.getElementById('formError').classList.add('hidden');
 if(!booking.tables.length){showErr('No table held — go back and pick an available slot.');return;}
 if(f.length<1||l.length<1)showErr('First and last name are required.');
 else if(!validEmail(e))showErr('Please enter a valid email address.');
 else if(!validPhone(p))showErr('Phone number is mandatory (min 7 digits).');
 else if(booking.party<1)showErr('Guest count must be positive.');
 else{
  // final double-book guard
  const clash=reservations.some(r=>r.id!==booking.editingId&&isActive(r)&&r.tables.some(t=>booking.tables.includes(t))&&overlaps(r.date,r.time,booking.date,booking.time));
  if(clash){showErr('Those tables were just taken for that window. Please pick another slot.');renderSlots();return;}
  let rec;
  if(booking.editingId){
   rec=reservations.find(r=>r.id===booking.editingId);
   Object.assign(rec,{firstName:f,lastName:l,email:e,phone:p,notes:n,partySize:booking.party,date:booking.date,time:booking.time,tables:[...booking.tables]});
  }else{
   rec={id:uid(),code:makeCode(),firstName:f,lastName:l,email:e,phone:p,notes:n,partySize:booking.party,date:booking.date,time:booking.time,tables:[...booking.tables],status:'Confirmed',createdAt:Date.now()};
   reservations.push(rec);
  }
  save(LS_RES,reservations);
  currentId=rec.id;booking.editingId=null;
  showConfirmation(rec);
 }
}
function showConfirmation(r){
 go('confirm'); // will hide; re-show confirm view manually
 document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
 document.getElementById('view-confirm').classList.remove('hidden');
 document.getElementById('confirmCode').textContent=r.code;
 document.getElementById('confirmDetails').innerHTML=`
  <div class="grid sm:grid-cols-2 gap-2">
   <div><span class="text-stone-500">Guest:</span> <b>${esc(r.firstName)} ${esc(r.lastName)}</b></div>
   <div><span class="text-stone-500">Party:</span> <b>${r.partySize}</b></div>
   <div><span class="text-stone-500">Date:</span> <b>${r.date}</b></div>
   <div><span class="text-stone-500">Time:</span> <b>${fmtTime(r.time)}</b> (2-hr hold)</div>
   <div><span class="text-stone-500">Tables:</span> <b>${r.tables.join(', ')}</b></div>
   <div><span class="text-stone-500">Status:</span> <span class="status-pill st-${esc(r.status)}">${esc(r.status)}</span></div>
   <div class="sm:col-span-2"><span class="text-stone-500">Contact:</span> ${esc(r.email)} • ${esc(r.phone)}</div>
   ${r.notes?`<div class="sm:col-span-2"><span class="text-stone-500">Notes:</span> ${esc(r.notes)}</div>`:''}
  </div>`;
}
function startModify(){
 const r=reservations.find(x=>x.id===currentId);if(!r)return;
 booking={party:r.partySize,date:r.date,time:r.time,tables:[...r.tables],zone:'',editingId:r.id};
 document.getElementById('gFirst').value=r.firstName;document.getElementById('gLast').value=r.lastName;
 document.getElementById('gEmail').value=r.email;document.getElementById('gPhone').value=r.phone;
 document.getElementById('gNotes').value=r.notes||'';
 go('book');initWizard();
 document.getElementById('gFirst').value=r.firstName;document.getElementById('gLast').value=r.lastName;
 document.getElementById('gEmail').value=r.email;document.getElementById('gPhone').value=r.phone;
 document.getElementById('gNotes').value=r.notes||'';
}
function cancelCurrent(){
 if(!confirm('Cancel this reservation?'))return;
 const r=reservations.find(x=>x.id===currentId);if(r){r.status='Cancelled';save(LS_RES,reservations);showConfirmation(r);}
}

/* ---------- manage lookup ---------- */
function lookupBooking(){
 const code=document.getElementById('lookupCode').value.trim().toUpperCase();
 const box=document.getElementById('lookupResult');
 const r=reservations.find(x=>x.code.toUpperCase()===code);
 if(!r){box.innerHTML='<p class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">No reservation found for that code.</p>';return;}
 currentId=r.id;
 box.innerHTML=`<div class="bg-cream border border-stone-200 rounded-2xl p-4 text-sm space-y-1">
  <p><b>${esc(r.firstName)} ${esc(r.lastName)}</b> • ${r.partySize} guests • <span class="status-pill st-${r.status}">${r.status}</span></p>
  <p>${r.date} at ${fmtTime(r.time)} • Tables ${r.tables.join(', ')}</p>
  <p class="text-stone-500">${esc(r.email)} • ${esc(r.phone)}</p>
  <div class="pt-2 flex gap-2"><button onclick="startModify();go('book')" class="iconbtn">Modify</button>
  <button onclick="cancelLookup('${r.id}')" class="iconbtn">Cancel booking</button></div></div>`;
}
function cancelLookup(id){if(!confirm('Cancel this reservation?'))return;const r=reservations.find(x=>x.id===id);r.status='Cancelled';save(LS_RES,reservations);lookupBooking();}

/* ---------- admin ---------- */
function initAdmin(){
 document.getElementById('flDate').value=todayStr();
 const sel=document.getElementById('flTime');sel.innerHTML='';
 slotsFor(todayStr()).forEach(s=>{sel.innerHTML+=`<option ${isNowSlot(s)?'selected':''} value="${s}">${fmtTime(s)}</option>`;});
 if(!sel.value&&slotsFor(todayStr()).length)sel.value=slotsFor(todayStr())[0];
 adminTab('floor');
}
function isNowSlot(s){const n=new Date();const m=n.getHours()*60+n.getMinutes();return Math.abs(toMin(s)-m)<60;}
function adminTab(v){
 adminView=v;
 document.getElementById('admin-floor').classList.toggle('hidden',v!=='floor');
 document.getElementById('admin-ledger').classList.toggle('hidden',v!=='ledger');
 document.getElementById('tabFloor').classList.toggle('active',v==='floor');
 document.getElementById('tabLedger').classList.toggle('active',v==='ledger');
}
function tableStatusAt(tid,date,time){
 const hit=reservations.filter(r=>isActive(r)&&r.tables.includes(tid)&&overlaps(r.date,r.time,date,time));
 if(hit.some(r=>r.status==='Checked-In'))return {k:'Occupied',cls:'border-rose-300 bg-rose-50',pill:'bg-rose-600 text-white',res:hit[0]};
 if(hit.length)return {k:'Reserved',cls:'border-amber-300 bg-amber-50',pill:'bg-amber-500 text-white',res:hit[0]};
 return {k:'Available',cls:'border-emerald-300 bg-emerald-50',pill:'bg-emerald-500 text-white',res:null};
}
function renderFloor(){
 const date=document.getElementById('flDate').value||todayStr();
 let time=document.getElementById('flTime').value;
 if(!time){ // rebuild options for picked date
  const sel=document.getElementById('flTime');sel.innerHTML=slotsFor(date).map(s=>`<option value="${s}">${fmtTime(s)}</option>`).join('');
  time=sel.value;
 }
 const grid=document.getElementById('floorGrid');grid.innerHTML='';
 tables.forEach(t=>{
  const st=tableStatusAt(t.id,date,time);
  grid.innerHTML+=`<div ondrop="dropRes(event,'${t.id}')" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" onclick="showTable('${t.id}')" class="tablecard ${st.cls}">
   <div class="flex items-center justify-between"><span class="font-display font-bold text-xl">${t.name}</span><span class="status-pill ${st.pill}">${st.k}</span></div>
   <div class="text-xs text-stone-600 mt-1">${t.type} • ${t.capacity} seats • ${esc(t.zone)}</div>
   <div class="text-xs font-semibold mt-1 truncate">${st.res?esc(st.res.firstName+' '+st.res.lastName)+' • '+st.res.partySize+'p • '+fmtTime(st.res.time):'— open —'}</div>
  </div>`;
 });
 const nowList=reservations.filter(r=>r.date===date&&isActive(r)).sort((a,b)=>toMin(a.time)-toMin(b.time));
 document.getElementById('floorNow').innerHTML=nowList.length?nowList.map(r=>`
  <div class="border border-stone-200 rounded-xl p-2.5 flex justify-between gap-2">
   <div><b>${esc(r.firstName)} ${esc(r.lastName)}</b> <span class="text-stone-500">• ${r.partySize}p • ${fmtTime(r.time)}</span><br>
   <span class="text-xs text-stone-500">${r.tables.join(', ')} • <span class="status-pill st-${r.status}">${r.status}</span></span></div>
   ${r.status!=='Checked-In'?`<button class="iconbtn self-start" onclick="setStatus('${r.id}','Checked-In')">Check in</button>`:''}
  </div>`).join(''):'<p class="text-stone-500">No bookings this day.</p>';
 renderKPIs();
}
function showTable(tid){
 const date=document.getElementById('flDate').value,time=document.getElementById('flTime').value;
 const t=tables.find(x=>x.id===tid);const st=tableStatusAt(tid,date,time);
 const r=st.res;
 document.getElementById('tableDetail').innerHTML=`
  <p class="font-bold font-display text-lg">${t.name} — ${t.capacity} seats (${esc(t.type)}, ${esc(t.zone)})</p>
  <p class="mt-1">Status at ${fmtTime(time)}: <b>${st.k}</b></p>
  ${r?`<div class="mt-2 bg-cream border border-stone-200 rounded-xl p-3">Booking <b class="font-mono">${r.code}</b><br>${esc(r.firstName)} ${esc(r.lastName)} • ${r.partySize} guests • ${fmtTime(r.time)}<br>
   <span class="status-pill st-${r.status}">${r.status}</span>
   <div class="mt-2 flex flex-wrap gap-1.5">
    <button class="iconbtn" onclick="setStatus('${r.id}','Checked-In')">Check in</button>
    <button class="iconbtn" onclick="setStatus('${r.id}','Completed')">Complete</button>
    <button class="iconbtn" onclick="setStatus('${r.id}','Cancelled')">Cancel</button>
    <button class="iconbtn" onclick="openReassign('${r.id}')">Change table</button>
   </div></div>`:'<p class="mt-2">Free for this 2-hour window.</p>'}`;
}
function renderKPIs(){
 const t=todayStr();
 const todays=reservations.filter(r=>r.date===t&&r.status!=='Cancelled');
 const guests=todays.reduce((s,r)=>s+r.partySize,0);
 const counts={};todays.forEach(r=>counts[r.time]=(counts[r.time]||0)+1);
 const peak=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 const totalAll=reservations.filter(r=>r.date===t).length;
 const noShow=totalAll?Math.round(100*reservations.filter(r=>r.date===t&&r.status==='Cancelled').length/totalAll):0;
 const cards=[
  ['Total reservations today',todays.length,'📅'],
  ['Expected guests',guests,'👥'],
  ['Peak booking hour',peak?fmtTime(peak[0]):'—','⏰'],
  ['No-show / cancel rate',noShow+'%','📉'],
 ];
 document.getElementById('kpiRow').innerHTML=cards.map(([l,v,i])=>`
  <div class="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm"><div class="text-2xl">${i}</div>
  <div class="font-display text-3xl font-bold mt-1">${v}</div><div class="text-xs uppercase tracking-widest text-stone-500 font-semibold mt-1">${l}</div></div>`).join('');
}
function filteredLedger(){
 const q=document.getElementById('fSearch').value.toLowerCase();
 const d=document.getElementById('fDate').value, s=document.getElementById('fStatus').value, sort=document.getElementById('fSort').value;
 let list=[...reservations];
 if(q)list=list.filter(r=>(r.firstName+' '+r.lastName+' '+r.code+' '+r.phone+' '+r.email).toLowerCase().includes(q));
 if(d)list=list.filter(r=>r.date===d);
 if(s)list=list.filter(r=>r.status===s);
 if(window._quick==='today')list=list.filter(r=>r.date===todayStr());
 if(window._quick==='upcoming')list=list.filter(r=>r.date>=todayStr()&&isActive(r));
 if(window._quick==='past')list=list.filter(r=>r.date<todayStr()||['Completed','Cancelled'].includes(r.status));
 if(sort==='name')list.sort((a,b)=>(a.lastName+a.firstName).localeCompare(b.lastName+b.firstName));
 else if(sort==='party')list.sort((a,b)=>b.partySize-a.partySize);
 else list.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return list;
}
function renderLedger(){
 const rows=filteredLedger();
 document.getElementById('ledgerBody').innerHTML=rows.map(r=>`
  <tr class="border-b border-stone-100 hover:bg-cream/60" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${r.id}')" title="Drag onto a floor table to reassign">
   <td class="py-2 pr-2"><b>${esc(r.firstName)} ${esc(r.lastName)}</b><br><span class="font-mono text-xs text-stone-500">${r.code}</span></td>
   <td>${r.date}</td><td>${fmtTime(r.time)}</td><td>${r.partySize}p</td><td class="font-semibold">${r.tables.join('+')}</td>
   <td><span class="status-pill st-${r.status}">${r.status}</span></td>
   <td class="text-right whitespace-nowrap">
    ${r.status==='Pending'?`<button class="iconbtn" onclick="setStatus('${r.id}','Confirmed')">Confirm</button>`:''}
    ${isActive(r)&&r.status!=='Checked-In'?`<button class="iconbtn" onclick="setStatus('${r.id}','Checked-In')">Check in</button>`:''}
    ${isActive(r)?`<button class="iconbtn" onclick="setStatus('${r.id}','Completed')">Done</button>`:''}
    ${isActive(r)?`<button class="iconbtn" onclick="openReassign('${r.id}')">Table</button>`:''}
    ${!['Cancelled','Completed'].includes(r.status)?`<button class="iconbtn" onclick="setStatus('${r.id}','Cancelled')">Cancel</button>`:''}
   </td></tr>`).join('')||'<tr><td colspan="7" class="py-6 text-center text-stone-500">No bookings match.</td></tr>';
}
function quickFilter(k){window._quick=(k==='all'?null:k);if(k==='today')document.getElementById('fDate').value=todayStr();if(k==='all'){document.getElementById('fDate').value='';document.getElementById('fStatus').value='';document.getElementById('fSearch').value='';}renderLedger();}
function setStatus(id,st){
 const r=reservations.find(x=>x.id===id);if(!r)return;
 if(st!=='Cancelled'&&isActive(r)){
  const clash=reservations.some(o=>o.id!==id&&isActive(o)&&o.tables.some(t=>r.tables.includes(t))&&overlaps(o.date,o.time,r.date,r.time));
  if(clash&&r.status==='Pending'){alert('Table conflict in 2-hour window.');return;}
 }
 r.status=st;save(LS_RES,reservations);renderFloor();renderLedger();renderHome();
}
function dropRes(ev,tid){
 ev.preventDefault();
 const id=ev.dataTransfer.getData('text/plain');if(!id)return;
 const r=reservations.find(x=>x.id===id);if(!r)return;
 const date=document.getElementById('flDate').value;
 const clash=reservations.some(o=>o.id!==id&&isActive(o)&&o.tables.includes(tid)&&overlaps(o.date,o.time,r.date,r.time));
 if(clash){alert(tid+' is already booked in that 2-hour window.');return;}
 r.tables=[tid];save(LS_RES,reservations);renderFloor();renderLedger();
}
/* walk-in */
function openWalkin(){
 document.getElementById('wDate').value=todayStr();
 const n=new Date();document.getElementById('wTime').value=String(n.getHours()).padStart(2,'0')+':'+(n.getMinutes()<30?'30':'00');
 refreshWalkinTables();
 document.getElementById('walkinModal').classList.remove('hidden');
}
function closeWalkin(){document.getElementById('walkinModal').classList.add('hidden');}
function refreshWalkinTables(){
 const d=document.getElementById('wDate').value||todayStr(),t=document.getElementById('wTime').value||'19:00';
 const free=freeTables(d,t,'');
 document.getElementById('wTable').innerHTML=free.map(x=>`<option value="${x.id}">${x.name} — ${x.capacity} seats (${x.zone})</option>`).join('')||'<option value="">No tables free</option>';
}
function saveWalkin(){
 const f=document.getElementById('wFirst').value.trim(),l=document.getElementById('wLast').value.trim(),
  p=document.getElementById('wPhone').value.trim(),party=+document.getElementById('wParty').value,
  d=document.getElementById('wDate').value,t=document.getElementById('wTime').value.slice(0,5),tb=document.getElementById('wTable').value;
 const err=document.getElementById('wError');err.classList.add('hidden');
 if(!f||!l){err.textContent='First and last name required.';err.classList.remove('hidden');return;}
 if(!validPhone(p)){err.textContent='Valid phone required.';err.classList.remove('hidden');return;}
 if(!tb){err.textContent='No free table for that slot.';err.classList.remove('hidden');return;}
 const clash=reservations.some(o=>isActive(o)&&o.tables.includes(tb)&&overlaps(o.date,o.time,d,t));
 if(clash){err.textContent='Table just taken in 2-hour window.';err.classList.remove('hidden');return;}
 reservations.push({id:uid(),code:makeCode(),firstName:f,lastName:l,email:'walkin@emberandoak.example',phone:p,notes:'Walk-in',partySize:party,date:d,time:t,tables:[tb],status:'Checked-In',createdAt:Date.now()});
 save(LS_RES,reservations);closeWalkin();renderFloor();renderLedger();renderKPIs();
}
/* reassign */
function openReassign(id){
 reassignId=id;const r=reservations.find(x=>x.id===id);
 document.getElementById('reassignInfo').textContent=`${r.firstName} ${r.lastName} • ${r.partySize}p • ${r.date} ${fmtTime(r.time)} (now: ${r.tables.join(', ')})`;
 const free=freeTables(r.date,r.time,'',id);
 const cur=r.tables.map(t=>tables.find(x=>x.id===t)).filter(Boolean);
 const opts=[...cur,...free.filter(f=>!r.tables.includes(f.id))];
 document.getElementById('reassignSelect').innerHTML=opts.map(t=>`<option ${r.tables.includes(t.id)?'selected':''} value="${t.id}">${t.name} — ${t.capacity} seats (${t.zone})</option>`).join('');
 document.getElementById('reassignModal').classList.remove('hidden');
}
function closeReassign(){document.getElementById('reassignModal').classList.add('hidden');}
function saveReassign(){
 const r=reservations.find(x=>x.id===reassignId);const tid=document.getElementById('reassignSelect').value;
 const clash=reservations.some(o=>o.id!==reassignId&&isActive(o)&&o.tables.includes(tid)&&overlaps(o.date,o.time,r.date,r.time));
 if(clash){alert('That table is booked in the 2-hour window.');return;}
 r.tables=[tid];save(LS_RES,reservations);closeReassign();renderFloor();renderLedger();
}
function seedDemo(){if(!confirm('Reset to demo data?'))return;localStorage.removeItem(LS_RES);reservations=seedReservations();save(LS_RES,reservations);renderHome();renderFloor();renderLedger();}

/* ---------- boot ---------- */
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('mobileMenu').classList.toggle('hidden'));
window._step=1;window._quick=null;
renderHome();
document.getElementById('flDate')&&(document.getElementById('flDate').value=todayStr());
document.getElementById('wDate')&&(document.getElementById('wDate').onchange=refreshWalkinTables);
document.getElementById('wTime')&&(document.getElementById('wTime').onchange=refreshWalkinTables);
go('home');
