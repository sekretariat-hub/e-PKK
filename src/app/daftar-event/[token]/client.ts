// Skrip halaman pendaftaran event (dijalankan di browser). Ditulis tanpa backtick supaya aman disisipkan ke template.
export const CLIENT_JS = String.raw`(function(){
var T=window.__T__,$=function(i){return document.getElementById(i)},D=null,U=[],sel=null,baru=null,q="";
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim().toLowerCase()}
function api(b){b.token=T;return fetch("/api/daftar-event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.message||"Gagal.");return j})})}
function msg(id,t,ok){$(id).innerHTML=t?'<div class="msg'+(ok?' ok':'')+'">'+esc(t)+'</div>':""}
function cocok(){var ks=norm(q).split(" ").filter(Boolean);if(!ks.length)return U;return U.filter(function(u){return ks.every(function(k){return u.k.indexOf(k)>=0})})}
function drawList(){var m=cocok(),has=norm(q).length>=2,MAX=150,out="";
m.slice(0,MAX).forEach(function(u){out+=u.ada?'<div class="it off"><b>'+esc(u.nama)+'</b>'+(u.pd?'<small>'+esc(u.pd)+'</small>':'')+'<small>Sudah terdaftar di event ini</small></div>':'<div class="it" role="button" tabindex="0" data-id="'+u.id+'"><b>'+esc(u.nama)+'</b>'+(u.pd?'<small>'+esc(u.pd)+'</small>':'')+'</div>'});
if(m.length>MAX)out+='<p class="hint">…dan '+(m.length-MAX)+' nama lain. Ketik lebih lengkap untuk mempersempit.</p>';
if(!m.length)out='<p class="hint">Tidak ada nama yang cocok.</p>';
$("lst").innerHTML=out;
var cn=$("cn");
if(m.length){cn.hidden=true;$("nf").hidden=true;$("blk").hidden=!has;}
else{$("blk").hidden=true;cn.hidden=!has;if(!has)$("nf").hidden=true}
}
function openModal(){$("mod").hidden=false;$("sq").value="";q="";$("nf").hidden=true;drawList();setTimeout(function(){$("sq").focus()},50);document.body.style.overflow="hidden"}
function closeModal(){$("mod").hidden=true;document.body.style.overflow=""}
function showSel(){var s=sel?sel.nama+(sel.pd?" · "+sel.pd:""):baru?baru.nama+" (data baru)":"";$("pil").innerHTML=s?'<div class="chip"><span>'+esc(s)+'</span><button type="button" id="gnt">Ganti</button></div>':"";$("add").hidden=!!s;$("gnt")&&$("gnt").addEventListener("click",openModal);ok()}
function ok(){var f=$("f");$("go").disabled=!(sel||baru)}
function init(){
$("t1").textContent=D.nama;$("t2").textContent=D.tgl;
if(D.tutup){$("t3").textContent="Form Pendaftaran ini akan ditutup pada "+D.tutup;$("t3").hidden=false}
if(D.kontak){$("kt").textContent="Jika ada pertanyaan bisa hubungi "+D.kontak;$("kt").hidden=false}
if(!D.buka){$("f").hidden=true;msg("top",D.alasan);return}
$("f").hidden=false;
$("jab").innerHTML=D.jabatan.map(function(j,i){return '<label class="ck"><input type="checkbox" name="jab" value="'+esc(j)+'"><span>'+esc(j)+'</span></label>'}).join("");
$("npd").innerHTML='<option value="">Pilih PD / Komunitas…</option>'+D.pd.map(function(p){return '<option value="'+p.id+'">'+esc(p.nama)+'</option>'}).join("");
api({aksi:"umat"}).then(function(j){U=j.umat.map(function(u){u.k=norm(u.nama+" "+u.pgl);return u});$("add").disabled=false;$("add").textContent="+ Add"},function(e){msg("top",e.message)});
}
$("add").addEventListener("click",openModal);
$("xx").addEventListener("click",closeModal);
$("sq").addEventListener("input",function(){q=this.value;drawList()});
$("lst").addEventListener("click",function(e){var it=e.target.closest&&e.target.closest("[data-id]");if(!it)return;var id=it.getAttribute("data-id");var u=U.filter(function(x){return x.id===id})[0];if(!u)return;sel={id:u.id,nama:u.nama,pd:u.pd};baru=null;closeModal();showSel()});
$("cn").addEventListener("click",function(){$("nf").hidden=false;$("nn").value=$("sq").value;$("cn").hidden=true});
$("ncancel").addEventListener("click",function(){$("nf").hidden=true;drawList()});
$("nok").addEventListener("click",function(){var n=$("nn").value.replace(/\s+/g," ").trim(),w=$("nw").value.trim(),p=$("npd").value;
if(n.length<3)return msg("nm","Nama lengkap wajib diisi.");
var key=norm(n);if(U.some(function(u){return norm(u.nama)===key}))return msg("nm","Nama ini sudah ada di daftar. Tutup form ini dan pilih nama Anda.");
if(w.replace(/\D/g,"").length<8)return msg("nm","Nomor WhatsApp wajib diisi. Contoh: 0812xxxxxxx.");
if(!p)return msg("nm","Pilih PD / Komunitas.");
msg("nm","");baru={nama:n,wa:w,pd:p};sel=null;closeModal();showSel()});
$("f").addEventListener("submit",function(e){e.preventDefault();
var jab=Array.prototype.filter.call(document.getElementsByName("jab"),function(x){return x.checked}).map(function(x){return x.value});
var b={aksi:"kirim",aktif:$("akt").checked,jabatan:jab,seksiLain:$("sl2").value,website:$("web").value};
if(sel)b.umat=sel.id;else b.baru=baru;
$("go").disabled=true;msg("bm","Mengirim…",true);
api(b).then(function(j){$("f").hidden=true;$("top").innerHTML='<div class="msg ok big">Terima kasih, '+esc(j.nama||"")+'. Pendaftaran Anda sudah kami terima.</div>';window.scrollTo(0,0)},function(x){$("go").disabled=false;msg("bm",x.message)})});
api({aksi:"info"}).then(function(j){D=j;init()},function(e){$("t1").textContent="Pendaftaran event";msg("top",e.message)});
})();`;
