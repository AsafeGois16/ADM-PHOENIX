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
 curriculo_declaracoes:["Currículo · informações declaradas","file-check-2"],
 entrevista_relato:["Entrevista · experiências relatadas","messages-square"],
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
 if(typeof input==="object"&&["3.0","3.1"].includes(input.version))return input;
 try{const report=JSON.parse(input);if(["3.0","3.1"].includes(report?.version)&&report.sections)return report;}catch{}
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
 if(report.legacy)return "<div class='jrLegacy'><b>Parecer da versão anterior</b><p>Gere uma nova análise JARVIS 3.1 para visualizar o relatório com fontes discriminadas e revisão humana.</p><pre>"+htmlSafe(report.legacy)+"</pre></div>";
 const obj=report.sections||{},meta=report.method||{};
 const spread=Number(meta.spread_pp);
 const balanced=meta.balanced===true&&Number.isFinite(spread);
 const ties=Array.isArray(meta.runner_up_factors)&&meta.runner_up_factors.length>1;
 const basis="<div class='jrSourceMatrix'><div><b>CURRÍCULO</b><span>"+(report.resume_included?"Declarações profissionais, não auditadas":"Não incluído")+"</span></div>"+
 "<div><b>ENTREVISTA</b><span>Relatos sujeitos a confirmação</span></div>"+
 "<div><b>VERIFICAÇÃO PRÁTICA</b><span>Nenhuma registrada nesta avaliação</span></div></div>";
 return "<div class='jrReportTop'><span>RELATÓRIO EXECUTIVO · JARVIS "+htmlSafe(report.version||"")+"</span><span>"+(report.resume_included?"Currículo incorporado":"Sem currículo")+"</span></div>"+
  (balanced?"<p class='jrBalance'>Distribuição DISC relativamente equilibrada: diferença máxima de "+spread.toFixed(1)+" pontos percentuais. Não há predominância expressiva."+(meta.first_choice_tied?" As primeiras escolhas estão empatadas entre D, I, S e C.":"")+(ties?" Há empate entre os fatores da segunda maior pontuação.":"")+"</p>":"")+
  basis+
  Object.keys(labels).map(k=>sectionMarkup(k,obj[k])).join("");
}

function pdfReport(candidate,job,assessment,report){
 if(!window.jspdf?.jsPDF)throw Error("Biblioteca de PDF indisponível.");
 const doc=new window.jspdf.jsPDF({format:"a4",unit:"mm",compress:true});
 const W=210,H=297,BOTTOM=278,LEFT=17,RIGHT=193,CONTENT=176;
 const navy=[11,28,53],blue=[32,86,139],gold=[201,147,63],ink=[38,58,82],muted=[107,125,148],soft=[242,247,252];
 let y=0,page=0,contentStarted=false;
 const rgb=(c)=>doc.setTextColor(...c);
 const fill=(c)=>doc.setFillColor(...c);
 const stroke=(c)=>doc.setDrawColor(...c);
 const first=()=>page===1;
 function header(){
  page++;y=46;contentStarted=false;
  fill(navy);doc.rect(0,0,W,36,"F");
  fill(gold);doc.rect(0,36,W,1.2,"F");
  rgb(gold);doc.setFont("helvetica","bold");doc.setFontSize(8.3);
  doc.text("P H O E N I X   /   P E O P L E   I N T E L L I G E N C E",LEFT,13);
  rgb([248,251,255]);doc.setFontSize(17);
  doc.text("JARVIS  /  DOSSIÊ EXECUTIVO",LEFT,27);
  rgb(muted);doc.setFontSize(8.2);
  stroke([222,231,238]);doc.line(LEFT,285,RIGHT,285);
  doc.text("Análise exploratória · DISC autoral não validado · revisão exclusiva do RH",LEFT,290);
  doc.text("P. "+page,RIGHT,290,{align:"right"});
 }
 function more(){doc.addPage();header();}
 function keep(h){if(y+h>BOTTOM)more();}
 function paragraph(value,options={}){
  const str=String(value??"").replace(/[\u0000-\u001f]+/g," ").trim();
  if(!str)return;
  const font=options.font||9.1, lead=options.lead||4.45,x=options.x||LEFT+2,width=options.width||CONTENT-4;
  const lines=doc.splitTextToSize(str,width);
  const count=Math.max(1,lines.length);keep(Math.min(BOTTOM-y,count*lead+2,lead*3));
  doc.setFont("helvetica",options.bold?"bold":"normal");doc.setFontSize(font);
  rgb(options.color||ink);
  for(const line of lines){keep(lead+1);doc.text(line,x,y);y+=lead;}
  y+=options.after===undefined?3:options.after;
 }
 function title(text){
  keep(18);fill(soft);doc.roundedRect(LEFT,y-4,CONTENT,10,2,2,"F");
  rgb(blue);doc.setFont("helvetica","bold");doc.setFontSize(10);
  doc.text(String(text),LEFT+4,y+2.4);y+=13;
 }
 function textSection(k,text,options={}){
  if(text==null||text==="")return;
  title(labels[k]?.[0]||k);
  paragraph(text,options);
 }
 function itemList(items,maxFont=8.7,leading=4.2){
  if(!Array.isArray(items)||!items.length){paragraph("Nenhuma evidência registrada nesta origem.",{font:8.7});return;}
  items.forEach((v,i)=>{
   const t=String(v||"").replace(/[\u0000-\u001f]+/g," ").trim();
   if(!t)return;const lines=doc.splitTextToSize((i+1)+". "+t,CONTENT-7);
   // Não deixar número isolado no fim da página.
   if(y+Math.min(lines.length,2)*leading+3>BOTTOM)more();
   rgb(ink);doc.setFont("helvetica","normal");doc.setFontSize(maxFont);
   lines.forEach(line=>{keep(leading+0.4);doc.text(line,LEFT+3,y);y+=leading;});
   y+=2.2;
  });
  y+=1.5;
 }
 function listSection(k,data){
  if(!Array.isArray(data)||!data.length)return;
  title(labels[k]?.[0]||k);itemList(data);
 }
 function compactColumns(titleText,entries){
  if(!entries.length)return;
  title(titleText);
  const gap=9,colW=(CONTENT-gap)/2;
  const groups=[entries.filter((_,i)=>i%2===0),entries.filter((_,i)=>i%2!==0)];
  const startY=y;let heights=[];
  for(let col=0;col<2;col++){
   let yy=startY;const x=LEFT+col*(colW+gap);
   for(const item of groups[col]){
    const lines=doc.splitTextToSize(String(item),colW-7);
    yy+=(lines.length*4.05+7);
   }
   heights[col]=yy-startY;
  }
  const needed=Math.max(...heights)+5;
  if(needed>0&&y+needed>BOTTOM){more();}
  const base=y;let yy=[];
  for(let col=0;col<2;col++){
   const x=LEFT+col*(colW+gap);let ry=base;
   for(const item of groups[col]){
    const lines=doc.splitTextToSize(String(item),colW-8);
    fill(soft);doc.roundedRect(x,ry-3.5,colW,lines.length*4.05+6,1.5,1.5,"F");
    rgb(ink);doc.setFont("helvetica","normal");doc.setFontSize(8.2);
    lines.forEach((line,j)=>doc.text(line,x+3.5,ry+j*4.05+0.4));
    ry+=lines.length*4.05+7.5;
   }
   yy.push(ry);
  }
  y=Math.max(...yy)+2;
 }
 const excerpt=(t,n)=>{const v=String(t??"").trim();if(v.length<=n)return v;return v.slice(0,n).replace(/\s+\S*$/,"")+"... (texto integral na ficha do RH)";};
 const selections=(arr,max,len=165)=>Array.isArray(arr)?arr.slice(0,max).map(x=>excerpt(x,len)):[];
 const sections=report?.sections||{};
 const dims=assessment?.result?.dimensions||{};
 const method=report?.method||{};
 header();
 // Page 1: perfil e síntese. O retrato só usa a identidade visual, não é fotografia do candidato.
 doc.setFont("helvetica","bold");doc.setFontSize(13);rgb(navy);
 const nameLines=doc.splitTextToSize(String(candidate.full_name||"Candidato"),126).slice(0,2);
 nameLines.forEach((txt,i)=>doc.text(txt,LEFT,y+i*5.6+1));
 y+=nameLines.length*5.6+2;
 paragraph("Vaga: "+(job?.title||"Não informada"),{font:9.2,width:125,after:6});
 const avatar=document.querySelector("#jrPanel .jrAvatar img");
 if(avatar?.complete&&avatar.naturalWidth>0){
  try{doc.addImage(avatar,"JPEG",151,40,42,23);}catch{}
 }
 title("MAPA DISC  /  PREFERÊNCIAS RELATIVAS");
 for(const letter of ["D","I","S","C"]){
  const d=dims[letter]||{}, n=Math.max(0,Math.min(100,Number(d.relative_share_percent||0)));
  doc.setFont("helvetica","bold");doc.setFontSize(9);rgb(blue);doc.text(letter,LEFT+2,y+3);
  fill([231,239,247]);doc.roundedRect(LEFT+13,y-1,126,5,2,2,"F");
  fill(blue);if(n>0)doc.roundedRect(LEFT+13,y-1,126*n/100,5,2,2,"F");
  rgb(ink);doc.text(n.toFixed(1)+"%",RIGHT-2,y+3,{align:"right"});
  y+=9.4;
 }
 const pts=["D","I","S","C"].map(d=>Number(dims[d]?.relative_share_percent||0));
 const spread=Number.isFinite(Number(method.spread_pp))?Number(method.spread_pp):(Math.max(...pts)-Math.min(...pts));
 if(spread<=5){
  y+=1;fill([253,249,240]);doc.roundedRect(LEFT,y-3,CONTENT,10,2,2,"F");
  rgb([114,84,34]);doc.setFontSize(9);doc.setFont("helvetica","bold");
  doc.text("Distribuição equilibrada · diferença máxima: "+spread.toFixed(1)+" p.p.",LEFT+4,y+3);
  y+=15;
 }else y+=9;
 textSection("resumo_executivo",excerpt(sections.resumo_executivo||report?.legacy,660));
 textSection("leitura_disc",excerpt(sections.leitura_disc,610));
 // Page 2: histórico e rastreabilidade.
 more();textSection("analise_curriculo",excerpt(sections.analise_curriculo||"Currículo não anexado.",640));
 textSection("contexto_vaga",excerpt(sections.contexto_vaga,420));
 const resumeClaims=sections.curriculo_declaracoes||report?.sources?.resume_claims||[];
 const interviewClaims=sections.entrevista_relato||report?.sources?.interview_claims||[];
 const legacy=Array.isArray(sections.evidencias_observadas)?sections.evidencias_observadas:[];
 const cvHas=Array.isArray(resumeClaims)&&resumeClaims.length;
 const ivHas=Array.isArray(interviewClaims)&&interviewClaims.length;
 // Relatórios históricos seguem visíveis, mas não reclassificamos seus itens sem proveniência.
 title("MATRIZ DE RASTREABILIDADE  /  DECLARAÇÕES NÃO VERIFICADAS");
 if(cvHas){title("CURRÍCULO  /  NÃO VERIFICADO");itemList(selections(resumeClaims,3,150),8.35,3.95);}
 if(ivHas){title("ENTREVISTA  /  NÃO VERIFICADA");itemList(selections(interviewClaims,3,150),8.35,3.95);}
 if(!cvHas&&!ivHas&&legacy.length){
  title("INDÍCIOS RELATADOS  /  ORIGEM NÃO DISCRIMINADA");
  itemList(selections(legacy,5,160),8.2,3.9);
 }
 keep(20);fill([247,249,252]);doc.roundedRect(LEFT,y,CONTENT,13,2,2,"F");
 doc.setFont("helvetica","bold");doc.setFontSize(9);rgb(blue);
 doc.text("VERIFICAÇÃO INDEPENDENTE",LEFT+4,y+5);
 doc.setFont("helvetica","normal");doc.setFontSize(8.5);rgb(muted);
 doc.text("Nenhum teste prático comprovado foi registrado nesta avaliação.",LEFT+4,y+10.5);y+=18;
 // Página 3: roteiro de decisão humana.
 more();
 const smallerList=(key,max,size=135)=>{const list=selections(sections[key],max,size);if(list.length){title(labels[key]?.[0]||key);itemList(list,8.45,3.95);}};
 smallerList("pontos_a_confirmar",3,140);
 smallerList("perguntas_entrevista",5,140);
 textSection("exercicio_pratico",excerpt(sections.exercicio_pratico,280));
 smallerList("proximos_passos",3,140);
 textSection("nota_metodologica",excerpt(sections.nota_metodologica,220),{font:8.2,lead:4.0});
 const ending=report?.version==="3.1"?"Resumo de destaques · análise integral no ADM · revisão humana.":"Histórico V3.0 · análise integral disponível no ADM.";
 keep(13);doc.setFont("helvetica","italic");doc.setFontSize(8.5);rgb(muted);doc.text(ending,LEFT+2,y+3);
 doc.save("JARVIS_Dossie_"+String(candidate.id||"relatorio").slice(0,8)+".pdf");
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
