/* JARVIS by Phoenix · People Intelligence 3.0
   Interface de apoio ao recrutador; nunca decide contratação. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const htmlSafe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={
 resumo_executivo:["Resumo executivo","clipboard-list"],
 leitura_disc:["Leitura comportamental DISC","chart-no-axes-combined"],
 analise_curriculo:["Leitura profissional do currículo","file-user"],
 contexto_vaga:["Contexto operacional da vaga","briefcase-business"],
 evidencias_observadas:["Relatos e evidências disponíveis","check-circle-2"],
 pontos_a_confirmar:["Pontos a confirmar","circle-help"],
 perguntas_entrevista:["Perguntas do JARVIS","messages-square"],
 exercicio_pratico:["Proposta de avaliação prática","clipboard-check"],
 proximos_passos:["Próximos passos do RH","arrow-right-circle"],
 nota_metodologica:["Critérios e limites","shield-check"]
};
const loaded=new Map();
async function scriptOnce(url,globalName){
 if(window[globalName])return window[globalName];
 if(!loaded.has(globalName))loaded.set(globalName,new Promise((resolve,reject)=>{
 const script=document.createElement("script");script.src=url;script.async=true;
 script.onload=()=>window[globalName]?resolve(window[globalName]):reject(Error("Leitor de arquivo indisponível"));
 script.onerror=()=>reject(Error("Falha ao carregar leitor de arquivo"));document.head.appendChild(script);
 }));
 return loaded.get(globalName);
}
async function getResumeText(file){
 if(!file||file.size>5*1024*1024)throw Error("Escolha um currículo de até 5 MB.");
 const ext=(file.name.split(".").pop()||"").toLowerCase();
 if(!["pdf","docx","txt"].includes(ext))throw Error("O formato deve ser PDF, DOCX ou TXT.");
 let value="";
 if(ext==="txt"){value=await file.text();}
 else if(ext==="docx"){
  const mammoth=await scriptOnce("https://cdn.jsdelivr.net/npm/mammoth@1.9.0/mammoth.browser.min.js","mammoth");
  const output=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  value=output.value||"";
 }else{
  const pdfjs=await scriptOnce("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","pdfjsLib");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  if(pdf.numPages>25)throw Error("PDF muito extenso. Use um currículo de até 25 páginas.");
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p),content=await page.getTextContent();
    value+="\n"+content.items.map(item=>item.str||"").join(" ");
    if(value.length>28000)break;
  }
 }
 value=value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g," ").replace(/[ \t]{3,}/g," ").trim();
 if(value.length<100)throw Error("Não foi possível extrair texto suficiente. Se o PDF for digitalizado, envie uma versão com texto selecionável.");
 if(value.length>28000)value=value.slice(0,28000);
 return {value,ext};
}
function parseReport(input){
 if(!input)return null;
 if(typeof input==="object"&&input.version==="3.0")return input;
 try{const report=JSON.parse(input);if(report?.version==="3.0"&&report.sections)return report;}catch{}
 return {legacy:String(input)};
}
function sectionMarkup(k,val){
 if(val==null||val===""||(Array.isArray(val)&&!val.length))return "";
 const list=Array.isArray(val);
 return "<section class='jrSection'><div class='jrSectionHead'><span class='jrSectionMark'></span><h4>"+htmlSafe(labels[k]?.[0]||k)+"</h4></div>"+
 (list?"<ul>"+val.map(x=>"<li>"+htmlSafe(x)+"</li>").join("")+"</ul>":"<p>"+htmlSafe(val)+"</p>")+"</section>";
}
function reportMarkup(report){
 if(!report)return "<div class='jrEmpty'>Nenhuma análise gerada nesta ficha. Anexe o currículo, registre a entrevista e solicite uma leitura do JARVIS.</div>";
 if(report.legacy)return "<div class='jrLegacy'><b>Parecer da versão anterior</b><p>Gere uma nova análise JARVIS 3.0 para visualizar o relatório em formato executivo.</p><pre>"+htmlSafe(report.legacy)+"</pre></div>";
 const obj=report.sections||{},meta=report.method||{};
 return "<div class='jrReportTop'><span>RELATÓRIO EXECUTIVO · JARVIS 3.0</span><span>"+(report.resume_included?"Currículo incorporado":"Sem currículo")+"</span></div>"+
  (meta.balanced?"<p class='jrBalance'>Distribuição DISC relativamente equilibrada; sem predominância expressiva.</p>":"")+
  Object.keys(labels).map(k=>sectionMarkup(k,obj[k])).join("");
}
function pdfReport(candidate,job,assessment,report){
 if(!window.jspdf?.jsPDF)throw Error("A biblioteca jsPDF do ADM não foi carregada.");
 const doc=new window.jspdf.jsPDF({format:"a4",unit:"mm"});const pageHeight=297,width=210;
 let y=18,page=1;
 function header(){
  doc.setFillColor(11,27,53);doc.rect(0,0,width,39,"F");
  doc.setFillColor(226,160,43);doc.rect(0,39,width,1.5,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(231,174,71);doc.text("PHOENIX  /  PEOPLE INTELLIGENCE",15,16);
  doc.setTextColor(255,255,255);doc.setFontSize(18);doc.text("JARVIS | Relatorio Executivo",15,28);
  doc.setTextColor(36,58,84);doc.setFontSize(9);y=49;
 }
 function footer(){
  doc.setDrawColor(215,224,236);doc.line(15,284,195,284);
  doc.setTextColor(111,126,148);doc.setFontSize(8);
  doc.text("Instrumento exploratorio. Analise sujeita a verificacao humana.",15,289);
  doc.text(String(page),194,289,{align:"right"});
 }
 function nextIf(height){if(y+height>278){footer();doc.addPage();page++;header();}}
 function line(txt,indent=0,fontSize=10){
  doc.setFontSize(fontSize);doc.setFont("helvetica","normal");doc.setTextColor(44,63,85);
  const wrapped=doc.splitTextToSize(String(txt).replace(/[\u0000-\u001F]/g," "),172-indent);
  for(const l of wrapped){nextIf(5.2);doc.text(l,17+indent,y);y+=5.2;}y+=2;
 }
 function section(k,data){
  if(data==null||data===""||(Array.isArray(data)&&!data.length))return;
  nextIf(18);doc.setFillColor(243,247,252);doc.roundedRect(15,y-3,180,9,1.5,1.5,"F");
  doc.setTextColor(23,70,117);doc.setFont("helvetica","bold");doc.setFontSize(11);
  doc.text(labels[k]?.[0]||k,18,y+3);y+=14;
  if(Array.isArray(data))data.forEach((item,i)=>{line((i+1)+". "+item,2,9.4);});
  else line(data,0,9.6);y+=3;
 }
 header();
 doc.setFontSize(11);doc.setFont("helvetica","bold");doc.setTextColor(29,54,83);
 doc.text(String(candidate.full_name||"Candidato").slice(0,80),15,y);y+=7;
 line("Vaga: "+(job?.title||"Nao informada"));y+=2;
 const dims=assessment?.result?.dimensions||{};
 doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(23,69,112);
 doc.text("DISTRIBUICAO RELATIVA DISC",16,y);y+=7;
 ["D","I","S","C"].forEach(letter=>{
  const n=Number(dims[letter]?.relative_share_percent||0);
  doc.setFontSize(9);doc.text(letter,17,y+3);doc.setFillColor(232,239,246);doc.roundedRect(27,y,128,5,1.4,1.4,"F");
  doc.setFillColor(38,109,169);doc.roundedRect(27,y,Math.min(128,n*1.28),5,1.4,1.4,"F");
  doc.text(n.toFixed(1)+"%",160,y+4);y+=9;
 });
 y+=7;
 if(report?.legacy){section("resumo_executivo",report.legacy);}
 else for(const k of Object.keys(labels))section(k,report?.sections?.[k]);
 footer();doc.save("JARVIS_Phoenix_"+String(candidate.id||"relatorio").slice(0,8)+".pdf");
}
function attach(args){
 const {candidate:c,assessment:a,job,previous,backend,db,msg,role}=args;
 const detail=$("ptDetail");if(!detail)return;
 const existing=$("jrPanel");if(existing)existing.remove();
 const panel=document.createElement("section");panel.id="jrPanel";panel.className="jrPanel";
 panel.dataset.candidate=c.id;
 panel.innerHTML="<div class='jrHero'><div class='jrAvatar'><img src='jarvis_avatar.jpg' alt='Identidade visual do agente JARVIS' onerror='this.style.display=\"none\"'></div><div class='jrHeroCopy'><span class='jrKicker'>PHOENIX TALENT · INTELIGÊNCIA DE RECRUTAMENTO</span><h3>JARVIS <small>3.0</small></h3><p>Leitura crítica do DISC, currículo e entrevista · análise para revisão humana</p></div><div class='jrOnline'>AGENTE DE APOIO AO RH</div></div>"+
 "<div class='jrControlGrid'><div class='jrDoc'><h4>Currículo profissional</h4><p>PDF, DOCX ou TXT, até 5 MB. A leitura local extrai texto e armazena apenas o conteúdo textual, restrito ao RH.</p><input id='jrCVFile' type='file' accept='.pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document' aria-label='Selecionar currículo do candidato'><p class='jrFileStatus' id='jrCVStatus'>Verificando currículo…</p><button class='ptBtn soft' id='jrCVSave' type='button'>Ler e anexar currículo</button></div>"+
 "<div class='jrRun'><h4>Parecer JARVIS</h4><p>Combine preferências declaradas, histórico profissional e evidências da entrevista. Sem notas de aprovação ou rejeição.</p><button class='ptBtn jrPrimary' id='jrGenerate' type='button'>✦ Gerar análise aprofundada</button><button class='ptBtn soft' id='jrPDF' type='button'>↓ Exportar PDF executivo</button><p id='jrStatus' role='status' aria-live='polite'></p></div></div>"+
 "<div class='jrReport' id='jrReport'></div>";
 detail.appendChild(panel);
 detail.classList.add("jrReady");
 let activeReport=parseReport(previous?.report_text||"");
 const reportEl=$("jrReport");
 reportEl.innerHTML=reportMarkup(activeReport);
 const writeStatus=text=>{if($("jrStatus"))$("jrStatus").textContent=text;msg(text);};
 const noEdit=role==="viewer";
 $("jrCVSave").disabled=noEdit;$("jrGenerate").disabled=noEdit||!a;$("jrPDF").disabled=!a;
 async function loadResume(){
  try{
   const r=await db().from("phoenix_talent_resumes").select("filename,uploaded_at").eq("candidate_id",c.id).maybeSingle();
   if(panel.isConnected===false)return;
   $("jrCVStatus").textContent=r.error?"Não foi possível consultar o currículo.":r.data?"Currículo registrado: "+r.data.filename+" · "+new Date(r.data.uploaded_at).toLocaleDateString("pt-BR"):"Nenhum currículo anexado até agora.";
  }catch{$("jrCVStatus").textContent="Currículo não consultado.";}
 }
 loadResume();
 $("jrCVSave").addEventListener("click",async()=>{
  const file=$("jrCVFile").files?.[0];if(!file){writeStatus("Selecione um currículo para analisar.");return;}
  const btn=$("jrCVSave");btn.disabled=true;$("jrCVStatus").textContent="Extraindo texto do currículo…";
  try{
   const {value,ext}=await getResumeText(file);
   $("jrCVStatus").textContent="Texto extraído ("+value.length+" caracteres). Salvando com acesso restrito…";
   await backend("save_resume",{candidate_id:c.id,filename:file.name.slice(0,160),file_type:ext,extracted_text:value});
   $("jrCVStatus").textContent="✓ Currículo interpretável anexado: "+file.name+" · "+value.length+" caracteres";
   writeStatus("Currículo registrado. Gere novamente o parecer para incorporar a experiência profissional.");
  }catch(e){$("jrCVStatus").textContent="Não foi possível ler este documento.";writeStatus(String(e.message||e));}
  finally{btn.disabled=noEdit;}
 });
 $("jrGenerate").addEventListener("click",async()=>{
  if(!a)return;const btn=$("jrGenerate");btn.disabled=true;
  btn.textContent="JARVIS analisando currículo, DISC e entrevista…";
  writeStatus("Análise em andamento. O relatório será arquivado na ficha.");
  try{
    const currentNotes=$("ptEvidence")?.value||"";
    const data=await backend("analyze_v3",{assessment_id:a.id,interview_evidence:currentNotes,role:job?.title||""});
    if(panel.isConnected===false)return;
    activeReport=data.report;reportEl.innerHTML=reportMarkup(activeReport);
    reportEl.scrollIntoView({behavior:"smooth",block:"nearest"});
    writeStatus("✓ Parecer JARVIS 3.0 gerado e arquivado.");
  }catch(e){writeStatus("Erro no JARVIS: "+String(e.message||e));}
  finally{btn.disabled=noEdit;btn.textContent="✦ Gerar análise aprofundada";}
 });
 $("jrPDF").addEventListener("click",()=>{try{
  if(!activeReport)throw Error("Gere o relatório antes de exportar.");
  pdfReport(c,job,a,activeReport);writeStatus("PDF executivo preparado.");
 }catch(e){writeStatus(String(e.message||e));}});
}
window.JarvisV3={mount:attach,parseReport,pdfReport,getResumeText};
})();
