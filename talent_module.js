(function(){
'use strict';
const API='https://cxyxrhmpjehrqhwihxul.supabase.co/functions/v1/phoenix-talent-api';
const APP_URL='https://phoenix-tallent.vercel.app/';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=document.querySelector('.v7-tabs'),container=document.querySelector('.dashboard>.container');
if(!tabs||!container)return;
tabs.insertAdjacentHTML('beforeend',"<button class='v7-tab' id='ptTab' type='button' onclick=\"setPainelV7('talent')\">✦ Recrutamento · Talent</button>");
const view=document.createElement('section');view.id='ptView';view.hidden=true;container.appendChild(view);
view.innerHTML="<header class='ptHero'><small>PHOENIX INSURANCE · PEOPLE INTELLIGENCE</small><h2>PHOENIX TALENT · Recrutamento</h2><p>Vagas, questionário de preferências DISC, entrevistas e parecer exploratório. O sistema não aprova nem reprova candidatos.</p></header>"+
"<div id='ptMetrics' class='ptKpis'></div>"+
"<div class='ptCard'><h3>Convites individuais</h3>"+
"<p class='ptLead'>Selecione a vaga e informe o e-mail. As opções são as mesmas do formulário do candidato; não é necessário cadastrar a vaga manualmente.</p>"+
"<div class='ptInviteGrid'><label>Vaga / área<select id='ptJobSelect' required><option value=''>Selecione a vaga</option></select></label>"+
"<label>E-mail do candidato<input id='ptInviteEmail' type='email' autocomplete='email' placeholder='candidato@exemplo.com' required></label>"+
"<button class='ptBtn' id='ptCreateInvite'>Gerar convite individual</button></div>"+
"<p class='ptOfficialLink'>Formulário oficial: <a href='https://phoenix-tallent.vercel.app/' target='_blank' rel='noopener noreferrer'>phoenix-tallent.vercel.app</a></p>"+
"<p id='ptInviteNotice' class='ptNotice'>Convites expiram em 14 dias e aceitam uma única resposta. Confirme a publicação do site antes do envio.</p><button class='ptBtn soft' id='ptCopyInvite' type='button' hidden>Copiar link do candidato</button></div>"+
"<div class='ptCard'><div class='ptGrid'><h3>Candidaturas recebidas</h3><button class='ptBtn soft' id='ptRefresh'>↻ Atualizar</button></div>"+
"<div class='ptTableWrap'><table class='ptTable'><thead><tr><th>Candidato</th><th>E-mail</th><th>Vaga</th><th>Recebido</th><th>Etapa</th><th>Ações</th></tr></thead><tbody id='ptRows'></tbody></table></div></div>"+
"<div class='ptCard' id='ptDetail' hidden></div><p id='ptMsg' role='status' aria-live='polite'></p>";
const db=()=>typeof sb==='undefined'?null:sb;
const statusLabels={assessment_received:'Avaliação recebida',interview:'Entrevista',review:'Em análise',hired:'Contratado(a)',closed:'Encerrado'};
const CANDIDATE_ROLES=['Backoffice / Operações','Atendimento e relacionamento','Comercial / Consultor(a)','Financeiro / Administrativo','Liderança / Gestão','Outra vaga'];
let active=false,jobs=[],candidates=[],assessments=[],reports=[],role='',current=null,generated='',lastInviteUrl='';
function msg(x){$('ptMsg').textContent=x;}
async function auth(){if(!db())throw Error('Supabase indisponível');const r=await db().auth.getUser();if(r.error||!r.data.user)throw Error('Faça login no ADM.');return r.data.user;}
async function refresh(){
if(!active)return;msg('Carregando área de recrutamento…');
try{
const user=await auth();
const p=await db().from('phoenix_talent_staff').select('role,active').eq('user_id',user.id).maybeSingle();
if(p.error||!p.data?.active)throw Error('Acesso reservado ao RH e gestores autorizados.');
role=p.data.role;
const rs=await Promise.all([
 db().from('phoenix_talent_jobs').select('id,title,department,status').order('created_at',{ascending:false}).limit(100),
 db().from('phoenix_talent_candidates').select('id,job_id,full_name,email,created_at,status').order('created_at',{ascending:false}).limit(300),
 db().from('phoenix_talent_assessments').select('id,candidate_id,result,submitted_at').order('submitted_at',{ascending:false}).limit(300),
 db().from('phoenix_talent_ai_reports').select('id,assessment_id,report_text,created_at').order('created_at',{ascending:false}).limit(300)
]);for(const x of rs)if(x.error)throw x.error;
[jobs,candidates,assessments,reports]=rs.map(x=>x.data||[]);
$('ptMetrics').innerHTML=[['Vagas',jobs.length],['Candidaturas',candidates.length],['Avaliações',assessments.length],['Pareceres IA',reports.length]].map(a=>'<article><strong>'+a[1]+'</strong>'+a[0]+'</article>').join('');
const selectedRole=$('ptJobSelect').value;
const availableJobs=CANDIDATE_ROLES.map(role=>jobs.find(j=>j.title===role&&j.status==='open')).filter(Boolean);
$('ptJobSelect').innerHTML="<option value=''>Selecione a vaga</option>"+availableJobs.map(x=>"<option value='"+esc(x.id)+"'>"+esc(x.title)+"</option>").join('');
if(availableJobs.some(j=>j.id===selectedRole))$('ptJobSelect').value=selectedRole;
$('ptRows').innerHTML=candidates.length?candidates.map(x=>{
const job=jobs.find(j=>j.id===x.job_id);return "<tr><td>"+esc(x.full_name)+"</td><td>"+esc(x.email||'—')+"</td><td>"+esc(job?.title||'—')+"</td><td>"+new Date(x.created_at).toLocaleDateString('pt-BR')+"</td><td>"+esc(statusLabels[x.status]||x.status)+"</td><td><button type='button' data-candidate='"+esc(x.id)+"'>Abrir ficha</button></td></tr>";
}).join(''):"<tr><td colspan='6'>Nenhuma candidatura registrada.</td></tr>";
$('ptCreateInvite').disabled=role==='viewer';msg('Vagas sincronizadas com o formulário do candidato.');
if(current)open(current);
}catch(e){jobs=[];candidates=[];assessments=[];reports=[];current=null;generated='';lastInviteUrl='';$('ptDetail').hidden=true;$('ptMetrics').replaceChildren();$('ptCopyInvite').hidden=true;msg('Recrutamento: '+String(e.message||e));$('ptRows').innerHTML="<tr><td colspan='6'>Área indisponível para este usuário.</td></tr>";}
}
async function backend(action,args){
const s=await db().auth.getSession();if(!s.data.session)throw Error('Sessão expirada');
const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.data.session.access_token},body:JSON.stringify({action,...args})});
const obj=await res.json().catch(()=>({}));if(!res.ok||!obj.ok)throw Error(obj.error||'Erro na API Phoenix Talent');return obj;
}
function open(id){
const c=candidates.find(x=>x.id===id);if(!c)return;current=id;
const a=assessments.find(x=>x.candidate_id===id),job=jobs.find(x=>x.id===c.job_id);
const previous=a&&reports.find(x=>x.assessment_id===a.id);generated=previous?.report_text||'';
$('ptDetail').hidden=false;
const dim=a?.result?.dimensions||{},bars=['D','I','S','C'].map(k=>{
const share=Number(dim[k]?.relative_share_percent||0);
return "<div class='ptBar'><b>"+k+"</b><div><span style='width:"+Math.max(0,Math.min(100,share))+"%'></span></div><small>"+share.toFixed(1)+"% dos pontos</small></div>";
}).join('');
const stageForm="<div class='ptGrid'><label>Etapa do processo<select id='ptStage'>"+Object.entries(statusLabels).map(([key,label])=>"<option value='"+key+"'"+(c.status===key?" selected":"")+">"+label+"</option>").join('')+"</select></label><button class='ptBtn soft' id='ptUpdateStage'>Salvar etapa</button></div>";
$('ptDetail').innerHTML="<h3>Ficha do candidato: "+esc(c.full_name)+"</h3><p>Vaga: "+esc(job?.title||'Não informada')+"</p>"+stageForm+
(a?"<div class='ptColumns'><div><h4>Dimensões · preferências relativas</h4>"+bars+
"<p class='ptNotice'>Predominâncias: "+esc(a.result.primary)+" e "+esc(a.result.secondary)+". O ranking é ipsativo, não compara candidatos nem comprova aptidão.</p>"+
"<button id='ptPdf' class='ptBtn soft'>Baixar relatório PDF</button></div><div><h4>Entrevista estruturada</h4>"+
"<label>Entrevista estruturada (situação, ação e resultado)<textarea id='ptEvidence' rows='6' maxlength='25000' placeholder='Registre o que o candidato relatou e o que o entrevistador observou, identificando claramente cada origem.'></textarea></label><div id='ptInterviewState' class='jrSaveState is-checking' role='status' aria-live='polite'><span class='jrStateIcon' aria-hidden='true'>◌</span><span id='ptInterviewStateText'>Verificando entrevista salva no Supabase…</span></div>"+
"<div class='ptActions'><button id='ptSaveInterview' class='ptBtn soft'>Salvar evidência</button><button id='ptAnalyze' class='ptBtn'>Analisar com IA</button></div>"+
"<pre id='ptAIResult' class='ptResult'>"+esc(generated||'O agente ainda não analisou esta avaliação. Ele fornece perguntas e hipóteses para revisão humana, não decisões de contratação.')+"</pre></div></div>"
:"<p class='ptNotice'>Ainda não há avaliação comportamental para esta candidatura.</p>");
$('ptUpdateStage').disabled=$('ptStage').disabled=role==='viewer';
$('ptUpdateStage').addEventListener('click',async()=>{
try{const value=$('ptStage').value;if(!statusLabels[value])throw Error('Etapa inválida');
const r=await db().from('phoenix_talent_candidates').update({status:value}).eq('id',c.id);if(r.error)throw r.error;
msg('Etapa atualizada manualmente pelo RH.');c.status=value;await refresh();
}catch(e){msg(String(e.message||e));}
});
if(!a){window.JarvisV3?.mount({candidate:c,assessment:a,job,previous,backend,db,msg,role});return;}
$('ptAnalyze').disabled=$('ptSaveInterview').disabled=role==='viewer';
$('ptAnalyze').addEventListener('click',async()=>{
const b=$('ptAnalyze');b.disabled=true;msg('Produzindo parecer exploratório…');
try{const r=await backend('analyze',{assessment_id:a.id,role:job?.title||'',interview_evidence:$('ptEvidence').value.slice(0,1800)});
generated=r.report;$('ptAIResult').textContent=generated;msg('Parecer gerado e salvo com acesso restrito.');}
catch(e){msg(String(e.message||e));}finally{b.disabled=false;}
});
$('ptSaveInterview').addEventListener('click',async()=>{
try{
 const user=await auth(),area=$('ptEvidence'),notes=area.value.trim();
 if(notes.length<10)throw Error('Registre ao menos 10 caracteres com contexto profissional.');
 const button=$('ptSaveInterview');button.disabled=true;
 area.dataset.saveInProgress='true';
 window.JarvisV3?.setInterviewStatus?.('saving','Salvando entrevista no Supabase…');
 const r=await db().from('phoenix_talent_interviews')
  .insert({candidate_id:c.id,interviewer:user.id,notes,evidence:{method:'entrevista_estruturada'}})
  .select('id,conducted_at,notes').single();
 if(r.error||!r.data?.id)throw r.error||Error('O Supabase não confirmou o registro.');
 if(area.value.trim()===notes){
  area.dataset.savedText=notes;
  window.JarvisV3?.setInterviewStatus?.('saved','✓ Entrevista salva · '+new Date(r.data.conducted_at).toLocaleString('pt-BR'));
 }else{window.JarvisV3?.setInterviewStatus?.('draft','Entrevista salva, mas há novas alterações não salvas.');}
 msg('Entrevista confirmada no banco da Phoenix.');
 }catch(e){window.JarvisV3?.setInterviewStatus?.('error','Falha ao salvar a entrevista. Tente novamente.');msg(String(e.message||e));}
 finally{const b=$('ptSaveInterview');if(b)b.disabled=role==='viewer';const a=$('ptEvidence');if(a)delete a.dataset.saveInProgress;}
});
$('ptPdf').addEventListener('click',()=>{
if(!window.jspdf?.jsPDF){msg('Biblioteca de PDF não disponível.');return;}
const doc=new window.jspdf.jsPDF();let y=22;
const add=t=>{for(const line of doc.splitTextToSize(String(t),175)){if(y>275){doc.addPage();y=20;}doc.text(line,16,y);y+=6;}y+=4;};
doc.setFontSize(15);add('PHOENIX TALENT | PARECER EXPLORATORIO');doc.setFontSize(10);
add('Candidato: '+c.full_name);add('Vaga: '+(job?.title||'—'));
add('Preferencias declaradas: '+JSON.stringify(dim));add('Instrumento autoral sem validacao psicometrica; revisao humana obrigatoria.');
add('Parecer IA: '+(generated||'Nao realizado.'));doc.save('Phoenix_Talent_'+c.id.slice(0,8)+'.pdf');
});
window.JarvisV3?.mount({candidate:c,assessment:a,job,previous,backend,db,msg,role});
}
$('ptRows').addEventListener('click',e=>{const id=e.target.closest('[data-candidate]')?.dataset.candidate;if(id)open(id);});
$('ptRefresh').addEventListener('click',refresh);
$('ptCopyInvite').addEventListener('click',async()=>{if(!lastInviteUrl)return;try{await navigator.clipboard.writeText(lastInviteUrl);msg('Link individual copiado. Envie somente ao candidato correspondente.');}catch(e){msg('Não foi possível copiar automaticamente. Selecione e copie o endereço exibido acima.');}});
$('ptCreateInvite').addEventListener('click',async()=>{
try{
const url=new URL(APP_URL);
const jobId=$('ptJobSelect').value;
if(!jobId||!jobs.some(j=>j.id===jobId&&j.status==='open'&&CANDIDATE_ROLES.includes(j.title)))throw Error('Selecione uma vaga válida da lista.');
if(!$('ptInviteEmail').value.trim())throw Error('Informe o e-mail da pessoa convidada.');
const r=await backend('create_invite',{job_id:jobId,email:$('ptInviteEmail').value.trim()});
url.searchParams.set('t',r.token);
lastInviteUrl=url.href;$('ptInviteNotice').textContent='Convite individual (uso único, validade de 14 dias): '+url.href+'. Envie somente para o e-mail indicado; não publique este link.';$('ptCopyInvite').hidden=false;
msg('Convite criado. A URL somente será mostrada agora; confirme se está publicada.');
}catch(e){msg(String(e.message||e));}
});
const original=window.setPainelV7;
if(typeof original==='function')window.setPainelV7=function(v){
if(v==='talent'){original('base');$('universalBaseView').hidden=true;view.hidden=false;$('v7TabBase')?.classList.remove('active');document.body.classList.add('phx-talent-mode');$('ptTab').classList.add('active');active=true;refresh();}
else{active=false;view.hidden=true;document.body.classList.remove('phx-talent-mode');$('ptTab').classList.remove('active');original(v);}
};
window.PhoenixTalentRH={open:()=>window.setPainelV7('talent'),refresh};
})();