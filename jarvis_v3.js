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
 observacoes_entrevistador:["Observações registradas pelo entrevistador","clipboard-check"],
 contexto_vaga:["Contexto operacional da vaga","briefcase-business"],
 evidencias_observadas:["Relatos e evidências disponíveis","check-circle-2"],
 pontos_a_confirmar:["Pontos a confirmar","circle-help"],
 perguntas_entrevista:["Perguntas do JARVIS","messages-square"],
 exercicio_pratico:["Proposta de avaliação prática","clipboard-check"],
 proximos_passos:["Próximos passos do RH","arrow-right-circle"],
 nota_metodologica:["Critérios e limites","shield-check"]
};
const loaded=new Map();
function setInterviewStatus(state,message){
 const el=$("ptInterviewState");if(!el)return;
 el.className="jrSaveState is-"+state;
 const ico=el.querySelector(".jrStateIcon");
 if(ico)ico.textContent={checking:"◌",missing:"○",saved:"✓",draft:"●",saving:"◌",error:"!"}[state]||"○";
 const text=$("ptInterviewStateText");if(text)text.textContent=message;
}
function setCVStatus(state,message){
 const el=$("jrCVStatus");if(!el)return;
 el.className="jrSaveState is-"+state;
 el.textContent=message;
}
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
 if(typeof input==="object"&&["3.0","3.1","3.2","3.3","3.5"].includes(input.version))return input;
 try{const report=JSON.parse(input);if(["3.0","3.1","3.2","3.3","3.5"].includes(report?.version)&&report.sections)return report;}catch{}
 return {legacy:String(input)};
}
function sectionMarkup(k,val){
 if(val==null||val===""||(Array.isArray(val)&&!val.length))return "";
 const list=Array.isArray(val);
 return "<section class='jrSection'><div class='jrSectionHead'><span class='jrSectionMark'></span><h4>"+htmlSafe(labels[k]?.[0]||k)+"</h4></div>"+
 (list?"<ul>"+val.map(x=>"<li>"+htmlSafe(x)+"</li>").join("")+"</ul>":"<p>"+htmlSafe(val)+"</p>")+"</section>";
}

const humanVeredictLabels={
 em_analise:"Em análise pelo RH",
 aderente:"Aderente aos requisitos avaliados",
 aderente_com_ressalvas:"Aderente com ressalvas documentadas",
 nao_aderente:"Não aderente aos requisitos avaliados"
};
const requirementStateLabels={
 dificuldade_observada:"Dificuldade registrada em exercício",
 dificuldade_relatada:"Dificuldade relatada",
 execucao_favoravel_observada:"Execução favorável registrada",
 somente_declarado:"Somente informações declaradas",
 sem_registro:"Ainda não avaliado",
 informacoes_divergentes:"Informações a esclarecer"
};
function requirementsMarkup(report){
 const items=Array.isArray(report?.requirements?.items)?report.requirements.items:[];
 if(!items.length)return "";
 const problems=items.filter(x=>x.priority==="essencial"&&["dificuldade_observada","dificuldade_relatada"].includes(x.estado));
 const notShown=items.filter(x=>x.priority==="essencial"&&["somente_declarado","sem_registro","informacoes_divergentes"].includes(x.estado));
 const headline=problems.length
  ?"Há registros de dificuldades relacionados a "+problems.length+" requisito(s) essencial(is): "+problems.map(x=>x.title).join("; ")+"."
  :notShown.length?"Há "+notShown.length+" requisito(s) essencial(is) ainda sem demonstração prática conclusiva."
  :"Há registros profissionais para os requisitos listados; a comprovação e a conclusão sobre a vaga exigem conferência do RH.";
 return "<section class='jrRequirements' aria-labelledby='jrRequirementHeading'><div class='jrRequireTop'>"+
 "<span class='jrKicker'>CRITÉRIOS PROFISSIONAIS DA VAGA</span><h4 id='jrRequirementHeading'>Parecer das evidências por requisito</h4>"+
 "<p class='jrRequirementLead'>"+htmlSafe(headline)+"</p>"+
 "<p class='jrRequirementDisclaimer'>O JARVIS organiza evidências e dificuldades por atividade da vaga. A decisão sobre aderência e continuidade é registrada exclusivamente pelo recrutador.</p></div>"+
 "<div class='jrRequirementList'>"+items.map(x=>
 "<article class='jrRequirementItem'><div class='jrRequirementRow'><h5>"+htmlSafe(x.title)+"</h5><span class='jrStateToken jrState-"+htmlSafe(x.estado)+"'>"+htmlSafe(requirementStateLabels[x.estado]||"Informações pendentes")+"</span></div>"+
 "<p><b>Fundamento:</b> "+htmlSafe(x.fundamento||"Sem registro de evidência.")+"</p>"+
 "<p><b>Origem:</b> "+htmlSafe(x.origem||"não informada")+"</p>"+
 "<p><b>O que confirmar:</b> "+htmlSafe(x.proxima_verificacao||"Definir exercício ou entrevista de verificação.")+"</p></article>").join("")+
 "</div></section>";
}

function audioEvidenceMarkup(report){
 const citations=Array.isArray(report?.sections?.gravacao_evidencias)?report.sections.gravacao_evidencias:[];
 if(!report?.audio_included&&!citations.length)return "";
 const audio=report.audio||{},pct=Number(audio.coverage_percent);
 const notice=Number.isFinite(pct)&&pct<100?"<p class='jrAudioWarning'>A análise utilizou somente "+pct+"% do contexto textual disponível; confira a transcrição integral antes de concluir.</p>":"";
 return "<section class='jrAudioCitations'><div class='jrSectionHead'><h4>Trechos da gravação utilizados na análise</h4></div>"+
 "<p>As citações abaixo foram recuperadas da transcrição arquivada, com marcações de tempo. O reconhecimento automático de fala pode conter erros.</p>"+notice+
 (citations.length?"<div class='jrQuoteList'>"+citations.map(x=>"<article><span>["+htmlSafe(x.tempo||"--:--")+"] · "+htmlSafe(({candidato:"Candidato",entrevistador:"Entrevistador",outra_pessoa:"Outra pessoa",nao_identificado:"Voz não identificada"})[x.speaker_role]||"Voz não identificada")+"</span>"+
 "<blockquote>"+htmlSafe(x.trecho||"")+"</blockquote><p>"+htmlSafe(x.relevancia_profissional||"")+"</p></article>").join("")+"</div>":
 "<p>Nenhum trecho específico foi citado no parecer. Consulte a transcrição para conferir o contexto.</p>")+"</section>";
}
function reportMarkup(report){
 if(!report)return "<div class='jrEmpty'>Nenhuma análise gerada nesta ficha. Anexe o currículo, registre a entrevista e solicite uma leitura do JARVIS.</div>";
 if(report.legacy)return "<div class='jrLegacy'><b>Parecer da versão anterior</b><p>Gere uma nova análise JARVIS 3.5 para visualizar o relatório com fontes discriminadas e revisão humana.</p><pre>"+htmlSafe(report.legacy)+"</pre></div>";
 const obj=report.sections||{},meta=report.method||{};
 const spread=Number(meta.spread_pp);
 const balanced=meta.balanced===true&&Number.isFinite(spread);
 const ties=Array.isArray(meta.runner_up_factors)&&meta.runner_up_factors.length>1;
 const basis="<div class='jrSourceMatrix'><div><b>CURRÍCULO</b><span>"+(report.resume_included?"Declarações profissionais, não auditadas":"Não incluído")+"</span></div>"+
 "<div><b>ENTREVISTA</b><span>Relatos sujeitos a confirmação</span></div>"+
 "<div><b>OBSERVAÇÕES DO ENTREVISTADOR</b><span>"+(report?.sources?.interviewer_observations?.length?"Exercício registrado, sujeito a conferência":"Não registradas; sem comprovação independente")+"</span></div></div>";
 return "<div class='jrReportTop'><span>RELATÓRIO EXECUTIVO · JARVIS "+htmlSafe(report.version||"")+"</span><span>"+(report.resume_included?"Currículo incorporado":"Sem currículo")+"</span></div>"+
  requirementsMarkup(report)+
  audioEvidenceMarkup(report)+
  (balanced?"<p class='jrBalance'>Distribuição DISC relativamente equilibrada: diferença máxima de "+spread.toFixed(1)+" pontos percentuais. Não há predominância expressiva."+(meta.first_choice_tied?" As primeiras escolhas estão empatadas entre D, I, S e C.":"")+(ties?" Há empate entre os fatores da segunda maior pontuação.":"")+"</p>":"")+
  basis+
  Object.keys(labels).map(k=>sectionMarkup(k,obj[k])).join("");
}

function pdfReport(candidate,job,assessment,report,review){
 if(!window.jspdf?.jsPDF)throw Error("Biblioteca de PDF indisponível.");
 if(!report)throw Error("Gere o parecer antes de exportar.");
 const doc=new window.jspdf.jsPDF({format:"a4",unit:"mm",compress:true});
 const W=210,LEFT=17,RIGHT=193,WIDTH=176,TOP=41,BOTTOM=279;
 const navy=[10,29,54],blue=[34,84,131],gold=[206,157,74],ink=[35,53,74],muted=[95,116,138],soft=[241,246,252];
 const sections=report.sections||{},method=report.method||{},dims=assessment?.result?.dimensions||{};
 const rows=Array.isArray(report.requirements?.items)?report.requirements.items:[];
 const criticalStates=new Set(["dificuldade_observada","dificuldade_relatada","informacoes_divergentes"]);
 const ranked=[...rows].sort((a,b)=>{
  const priority=x=>x.priority==="essencial"?0:1;
  const risk=x=>criticalStates.has(x.estado)?0:1;
  return priority(a)-priority(b)||risk(a)-risk(b);
 });
 const docText=t=>String(t??"").replace(/[\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim();
 const setColor=(color)=>doc.setTextColor(...color);
 const setFill=(color)=>doc.setFillColor(...color);
 let y=TOP,page=0;
 function newPage(){
  if(page>0)doc.addPage();
  page++;y=TOP;
  setFill(navy);doc.rect(0,0,W,34,"F");
  setFill(gold);doc.rect(0,34,W,1.1,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(7.8);setColor(gold);
  doc.text("PHOENIX   /   PEOPLE INTELLIGENCE",LEFT,12);
  doc.setFontSize(15);setColor([249,251,255]);
  doc.text("JARVIS  /  DOSSIÊ EXECUTIVO",LEFT,25);
  doc.setFont("helvetica","normal");doc.setFontSize(7.8);setColor(muted);
  doc.text("JARVIS "+docText(report.version||"3.0")+"  ·  Análise exploratória / RH",LEFT,287);
  doc.text("Página "+page,RIGHT,287,{align:"right"});
  doc.setDrawColor(225,232,239);doc.line(LEFT,283,RIGHT,283);
 }
 function keep(mm){if(y+mm>BOTTOM)newPage();}
 function para(value,opts={}){
  const txt=docText(value);if(!txt)return;
  const size=opts.size||8.7,lead=opts.lead||4.3,indent=opts.indent===undefined?2:opts.indent;
  const font=opts.bold?"bold":"normal",color=opts.color||ink,width=WIDTH-indent-2;
  doc.setFont("helvetica",font);doc.setFontSize(size);
  const pieces=doc.splitTextToSize(txt,width);
  if(!pieces.length)return;
  keep(Math.min(pieces.length,2)*lead+0.8);
  for(const piece of pieces){
   keep(lead+0.5);
   doc.setFont("helvetica",font);doc.setFontSize(size);setColor(color);
   doc.text(piece,LEFT+indent,y);y+=lead;
  }
  y+=opts.after===undefined?2.8:opts.after;
 }
 function heading(txt){
  keep(19);
  setFill(soft);doc.roundedRect(LEFT,y-4,WIDTH,10,1.7,1.7,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(9.6);setColor(blue);
  doc.text(docText(txt).toUpperCase(),LEFT+4,y+2.3);
  y+=12;
 }
 function item(value,opts={}){
  if(!docText(value))return;
  para("• "+docText(value),{size:opts.size||8.5,lead:opts.lead||4.15,indent:4,after:opts.after===undefined?1.4:opts.after});
 }
 function list(title,data){
  if(!Array.isArray(data)||!data.length)return;
  heading(title);
  data.forEach(value=>item(value));
  y+=2;
 }
 function textSection(title,value){
  if(!docText(value))return;
  heading(title);para(value);
 }
 function reviewerStatus(){
  heading("CONCLUSÃO DO RECRUTADOR / REGISTRO HUMANO");
  if(review?.verdict){
   const label=humanVeredictLabels[review.verdict]||"Conclusão registrada pelo RH";
   para(label,{bold:true,size:10,color:blue,after:1});
   para("Parecer documentado pelo recrutador. A fundamentação integral consta adiante neste dossiê.",{size:8.2,color:muted,after:2});
  }else{
   para("PARECER FINAL DO RH AINDA NÃO REGISTRADO",{bold:true,size:10,color:[125,83,30],after:1});
   para("A análise da IA reúne evidências profissionais, mas não aprova nem reprova candidatos. O responsável pela seleção deve registrar sua conclusão no ADM.",{size:8.2,color:muted});
  }
 }
 newPage();
 // Abertura executiva: conclusão humana em destaque, depois achados essenciais, DISC em segundo plano.
 doc.setFont("helvetica","bold");doc.setFontSize(13.5);setColor(navy);
 const names=doc.splitTextToSize(docText(candidate?.full_name||"Candidato"),WIDTH);
 for(const line of names){keep(6);doc.text(line,LEFT,y);y+=6;}
 para("Vaga: "+docText(job?.title||"Não informada"),{size:9.0,color:muted,indent:0,after:5});
 reviewerStatus();
 heading("SINAIS RELEVANTES POR REQUISITO DA VAGA");
 if(!ranked.length){
  para("Esta avaliação ainda não possui uma matriz de requisitos profissionais. Consulte o parecer detalhado; nenhuma conclusão sobre aderência pode ser inferida.",{size:8.7});
 }else{
  ranked.forEach(row=>{
   const label=requirementStateLabels[row.estado]||"Registro a esclarecer";
   item(docText(row.title)+" — "+label,{size:8.6,lead:4.2,after:1});
  });
 }
 // Texto analítico integral sem cortes artificiais. O fluxo quebra páginas apenas quando necessário.
 textSection("Síntese das evidências da vaga",sections.resumo_evidencias_da_vaga||sections.resumo_executivo);
 keep(60);
 heading("DISC  /  DISTRIBUIÇÃO RELATIVA");
 for(const factor of ["D","I","S","C"]){
  const raw=Number(dims[factor]?.relative_share_percent||0);
  const value=Number.isFinite(raw)?Math.min(100,Math.max(0,raw)):0;
  doc.setFont("helvetica","bold");doc.setFontSize(8.8);setColor(blue);
  doc.text(factor,LEFT+3,y+2);
  setFill([226,235,245]);doc.roundedRect(LEFT+14,y-1,129,4,1,1,"F");
  if(value>0){setFill(blue);doc.roundedRect(LEFT+14,y-1,129*value/100,4,1,1,"F");}
  setColor(ink);doc.text(value.toFixed(1)+"%",RIGHT-2,y+2,{align:"right"});
  y+=8.5;
 }
 const perc=["D","I","S","C"].map(f=>Number(dims[f]?.relative_share_percent||0));
 const difference=Number.isFinite(Number(method.spread_pp))?Number(method.spread_pp):Math.max(...perc)-Math.min(...perc);
 para(difference<=5?"Distribuição relativamente equilibrada; amplitude "+difference.toFixed(1)+" p.p. Sem predominância expressiva.":"Diferença entre fatores: "+difference.toFixed(1)+" p.p.; são preferências relativas, não competências profissionais.",{size:8.2,color:muted});
 // Matriz completa: mantenha todos os fundamentos, origens e recomendações sem truncar.
 if(ranked.length){
  heading("MATRIZ COMPLETA / REQUISITOS PROFISSIONAIS");
  for(const row of ranked){
   keep(16);
   para(docText(row.title)+"  ·  "+(requirementStateLabels[row.estado]||"Em investigação"),{bold:true,size:9.0,color:blue,after:1});
   para("Registro: "+docText(row.fundamento||"Sem evidência registrada."),{size:8.65,lead:4.3,after:1});
   para("Fonte: "+docText(row.origem||"não informada")+". Próxima verificação: "+docText(row.proxima_verificacao||"A definir pelo RH."),{size:8.45,lead:4.2,after:4});
  }
 }
 textSection("Resumo executivo completo",sections.resumo_executivo);
 textSection("Leitura comportamental / limites DISC",sections.leitura_disc);
 textSection("Histórico profissional declarado no currículo",sections.analise_curriculo);
 textSection("Contexto operacional da vaga",sections.contexto_vaga);
 list("CURRÍCULO / DECLARAÇÕES NÃO VERIFICADAS",sections.curriculo_declaracoes||report.sources?.resume_claims);
 list("ENTREVISTA / RELATOS DO CANDIDATO",sections.entrevista_relato||report.sources?.interview_claims);
 list("EXERCÍCIOS / OBSERVAÇÕES DO ENTREVISTADOR (NÃO AUDITADAS)",sections.observacoes_entrevistador||report.sources?.interviewer_observations);
 if(!Array.isArray(sections.curriculo_declaracoes)&&!Array.isArray(sections.entrevista_relato)){
  list("OUTROS INDÍCIOS / FONTE A INVESTIGAR",sections.evidencias_observadas);
 }
 textSection("VERIFICAÇÃO INDEPENDENTE",Array.isArray(report.sources?.verified_evidence)&&report.sources.verified_evidence.length?
   report.sources.verified_evidence.join(" | "):
   "Não consta verificação independente nesta ficha; registros de exercícios descritos pelo entrevistador não equivalem a auditoria dos resultados.");
 textSection("METODOLOGIA E LIMITES",sections.nota_metodologica||
  "O DISC autoral apresenta somente preferências relativas e não valida aptidão profissional. Este documento organiza evidências para análise humana.");
 if(Array.isArray(sections.gravacao_evidencias)&&sections.gravacao_evidencias.length){
  heading("ENTREVISTA GRAVADA / TRECHOS COM TEMPO");
  for(const ev of sections.gravacao_evidencias){
   if(!ev||typeof ev!=="object")continue;
   item("["+docText(ev.tempo||"")+"] "+docText(({candidato:"Candidato",entrevistador:"Entrevistador",outra_pessoa:"Outra pessoa",nao_identificado:"Voz não identificada"})[ev.speaker_role]||"Voz não identificada")+
        " — "+docText(ev.trecho||"")+" · "+docText(ev.relevancia_profissional||""),{size:8.5});
  }
 }
 if(report.audio_included&&Number(report.audio?.coverage_percent)<100){
  para("ATENÇÃO: A análise utilizou apenas "+Number(report.audio.coverage_percent)+"% do contexto textual da gravação. Confira o restante antes de concluir.",{size:8.4,bold:true,color:muted});
 }
 list("PONTOS DE ATENÇÃO / O QUE INVESTIGAR",sections.pontos_a_confirmar);
 list("PERGUNTAS PARA ENTREVISTA DE APROFUNDAMENTO",sections.perguntas_entrevista);
 textSection("EXERCÍCIO PRÁTICO RECOMENDADO",sections.exercicio_pratico);
 list("PRÓXIMAS AÇÕES DO RH",sections.proximos_passos);
 if(review?.verdict){
  heading("CONCLUSÃO HUMANA / FUNDAMENTAÇÃO INTEGRAL");
  para(humanVeredictLabels[review.verdict]||"Parecer do RH",{bold:true,size:9.4,color:blue,after:2});
  para(review.rationale);
  if(review.created_at)para("Registro: "+new Date(review.created_at).toLocaleString("pt-BR"),{size:8,color:muted});
 }
 doc.save("JARVIS_Dossie_"+String(candidate?.id||"relatorio").slice(0,8)+".pdf");
}

function attach(args){
 const {candidate:c,assessment:a,job,previous,backend,db,msg,role}=args;
 const detail=$("ptDetail");if(!detail)return;
 const existing=$("jrPanel");if(existing)existing.remove();
 const panel=document.createElement("section");panel.id="jrPanel";panel.className="jrPanel";
 panel.dataset.candidate=c.id;
 panel.innerHTML="<div class='jrHero'><div class='jrAvatar'><img src='jarvis_avatar.jpg' alt='Identidade visual do agente JARVIS' onerror='this.style.display=\"none\"'></div><div class='jrHeroCopy'><span class='jrKicker'>PHOENIX TALENT · INTELIGÊNCIA DE RECRUTAMENTO</span><h3>JARVIS <small>3.5</small></h3><p>Leitura crítica do DISC, currículo e entrevista · análise para revisão humana</p></div><div class='jrOnline'>AGENTE DE APOIO AO RH</div></div>"+
 "<div class='jrControlGrid'><div class='jrDoc'><h4>Currículo profissional</h4><p>PDF, DOCX ou TXT, até 5 MB. A leitura local extrai texto; somente esse texto é salvo no RH, não o arquivo original.</p><input id='jrCVFile' type='file' accept='.pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document' aria-label='Selecionar currículo do candidato'><p class='jrSaveState is-checking' id='jrCVStatus' role='status' aria-live='polite'>◌ Verificando currículo salvo no Supabase…</p><button class='ptBtn soft' id='jrCVSave' type='button'>Ler e anexar currículo</button></div>"+
 "<div class='jrRun'><h4>Parecer JARVIS</h4><p>Combine preferências declaradas, histórico profissional e evidências da entrevista. Sem notas de aprovação ou rejeição.</p><button class='ptBtn jrPrimary' id='jrGenerate' type='button'>✦ Gerar análise aprofundada</button><button class='ptBtn soft' id='jrPDF' type='button'>↓ Exportar PDF executivo</button><p id='jrStatus' role='status' aria-live='polite'></p><div id='jrThinking' class='jrThinking' role='status' aria-live='polite' hidden><div class='jrThinkingTop'><span class='jrOrb' aria-hidden='true'><span></span></span><div><strong>JARVIS em análise</strong><p id='jrThinkingText'>Preparando a leitura das informações disponíveis…</p></div></div><div class='jrThinkingTrack'><span class='jrThinkingPulse'></span></div><p class='jrThinkingHint'>Processamento pela IA. Aguarde a confirmação do parecer salvo; o tempo pode variar.</p></div></div></div>"+
 "<section class='jrAudioPanel' id='jrAudioPanel'><div class='jrAudioHead'><div><span class='jrKicker'>FONTE ADICIONAL · ENTREVISTA GRAVADA</span><h4>Áudio e transcrição da entrevista</h4><p>Anexe MP3, M4A, WAV, WEBM ou MP4 (até 24 MB). O áudio ficará privado no RH. O processamento usa o serviço de transcrição da OpenAI.</p></div><span class='jrAudioSymbol' aria-hidden='true'>♫</span></div>"+
 "<div class='jrAudioUpload'><input id='jrAudioFile' type='file' accept='.mp3,.m4a,.wav,.webm,.mp4,.mpeg,.mpga,audio/*' aria-label='Arquivo de áudio gravado da entrevista'>"+
 "<label class='jrConsent'><input id='jrAudioConsent' type='checkbox'> Confirmo que os participantes foram informados e que a gravação pode ser armazenada e transcrita para esta avaliação.</label>"+
 "<button id='jrAudioUpload' class='ptBtn jrPrimary' type='button'>Anexar e transcrever entrevista</button></div>"+
 "<p id='jrAudioState' class='jrSaveState is-checking' role='status' aria-live='polite'>◌ Consultando gravações desta ficha…</p>"+
 "<div id='jrAudioData' class='jrAudioData' hidden><div class='jrAudioMeta' id='jrAudioMeta'></div>"+
 "<button id='jrAudioListen' class='ptBtn soft' type='button'>▶ Ouvir gravação privada</button><audio id='jrAudioPlayer' controls preload='none' hidden></audio>"+
 "<div id='jrVoiceMap'></div><button id='jrVoiceSave' class='ptBtn soft' type='button' hidden>Confirmar quem está falando</button>"+
 "<details class='jrAudioTranscript'><summary>Ver transcrição da entrevista</summary><pre id='jrTranscriptText'></pre></details></div>"+
 "<p class='jrAudioDisclaimer'>A transcrição pode conter erros. Identifique manualmente as vozes antes de gerar o parecer. O JARVIS analisa o conteúdo profissional, não a voz, o sotaque ou a emoção.</p></section>"+
 "<div class='jrReport' id='jrReport'></div>"+
 "<section class='jrHumanReview' id='jrHumanReview'><span class='jrKicker'>REGISTRO HUMANO · RH PHOENIX</span><h4>Conclusão do recrutador sobre a vaga</h4>"+
 "<p class='jrHumanNote'>O parecer do JARVIS não determina aprovação ou rejeição. Somente o responsável pela seleção pode registrar a conclusão com justificativa profissional.</p>"+
 "<div id='jrHumanLatest' class='jrHumanLatest'>Consultando parecer anterior…</div>"+
 "<div class='jrHumanGrid'><label>Conclusão do RH<select id='jrHumanStatus'><option value='em_analise'>Em análise</option><option value='aderente'>Aderente aos requisitos avaliados</option><option value='aderente_com_ressalvas'>Aderente com ressalvas</option><option value='nao_aderente'>Não aderente aos requisitos avaliados</option></select></label>"+
 "<label>Fundamentação do recrutador<textarea id='jrHumanRationale' rows='4' maxlength='4000' placeholder='Documente evidências práticas, requisitos da vaga, pontos esclarecidos e razões para sua conclusão. Mínimo de 40 caracteres.'></textarea></label>"+
 "<button id='jrHumanSave' class='ptBtn jrPrimary' type='button'>Registrar parecer do RH</button></div>"+
 "<p id='jrHumanFeedback' role='status' aria-live='polite'></p></section>";
 detail.appendChild(panel);
 detail.classList.add("jrReady");
 let activeReport=parseReport(previous?.report_text||"");
 let currentReview=null;

 let activeAudio=null,pendingAudio=null,audioBusy=false;
 const audioFile=$("jrAudioFile"),audioConsent=$("jrAudioConsent"),audioUpload=$("jrAudioUpload"),
       audioState=$("jrAudioState"),audioData=$("jrAudioData"),audioMeta=$("jrAudioMeta"),
       audioMap=$("jrVoiceMap"),audioSave=$("jrVoiceSave"),audioTranscript=$("jrTranscriptText");
 const audioNotice=(state,text)=>{if(!audioState)return;audioState.className="jrSaveState is-"+state;audioState.textContent=text;};
 const audioRoleNames={candidato:"Candidato",entrevistador:"Entrevistador",outra_pessoa:"Outra pessoa",nao_identificado:"Não identificado"};
 const timeFmt=s=>{const n=Math.max(0,Math.floor(Number(s)||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
 function audioSpeakers(){
  return [...new Set((Array.isArray(activeAudio?.segments)?activeAudio.segments:[]).map(seg=>String(seg.speaker||"indefinido")))];
 }
 function showAudio(){
  if(!panel.isConnected)return;
  audioData.hidden=!activeAudio;
  if(!activeAudio){
   audioNotice("missing","○ Nenhuma entrevista gravada transcrita nesta ficha.");
   return;
  }
  audioMeta.textContent="✓ Transcrição confirmada no Supabase · "+activeAudio.original_filename+" · "+new Date(activeAudio.transcribed_at).toLocaleString("pt-BR");
  audioTranscript.textContent=(Array.isArray(activeAudio.segments)&&activeAudio.segments.length?
    activeAudio.segments.map(x=>"["+timeFmt(x.start)+"] "+String(activeAudio.speaker_roles?.[x.speaker]||x.speaker||"voz")+": "+String(x.text||"")).join("\n"):
    String(activeAudio.transcription||""));
  const speakers=audioSpeakers(),stored=activeAudio.speaker_roles||{};
  if(speakers.length){
   audioMap.innerHTML="<h5>Identificação das vozes · conferir manualmente</h5>"+
    "<p>Escolha quem fala em cada voz. O sistema não deduz a identidade de uma pessoa pelo áudio.</p>"+
    speakers.map(sp=>"<label>"+htmlSafe(sp)+"<select class='jrSpeakerSelect' data-speaker='"+htmlSafe(sp)+"'>"+
      "<option value=''>Selecione a pessoa</option>"+
      Object.entries(audioRoleNames).map(([code,label])=>"<option value='"+code+"'"+(stored[sp]===code?" selected":"")+">"+label+"</option>").join("")+
     "</select></label>").join("");
   audioSave.hidden=role==="viewer";
  }else{audioMap.innerHTML="<p>Áudio transcrito sem identificação de vozes. Confirme manualmente o conteúdo; o JARVIS não atribuirá frases a uma pessoa específica.</p>";audioSave.hidden=true;}
  const assigned=Object.values(stored).includes("candidato");
  audioNotice(assigned||!speakers.length?"saved":"draft",
    assigned?"✓ Entrevista gravada transcrita e vozes confirmadas. Pronta para uma nova análise.":
    speakers.length?"● Transcrição salva; identifique a voz do candidato antes de gerar a análise.":
    "✓ Entrevista transcrita, sem separação de vozes. Revise o texto antes de analisar.");
 }
 async function loadAudio(){
  try{
   const {data,error}=await db().from("phoenix_talent_audio_transcripts")
    .select("id,storage_path,original_filename,transcription,segments,speaker_roles,transcribed_at")
    .eq("candidate_id",c.id).order("transcribed_at",{ascending:false}).limit(1).maybeSingle();
   if(error)throw error;
   if(!panel.isConnected)return;
   activeAudio=data||null;showAudio();
  }catch(e){if(panel.isConnected)audioNotice("error","! Não foi possível confirmar o áudio no Supabase: "+String(e.message||e));}
 }
 audioFile.addEventListener("change",()=>{
  pendingAudio=null;
  if(audioFile.files?.[0])audioNotice("draft","● Arquivo escolhido: "+audioFile.files[0].name+" · ainda não anexado.");
  else showAudio();
 });
 audioUpload.disabled=role==="viewer";
 audioUpload.addEventListener("click",async()=>{
  const file=audioFile.files?.[0];if(!file&&!pendingAudio)return audioNotice("error","Escolha a gravação de uma entrevista.");
  if(!audioConsent.checked)return audioNotice("error","Confirme a autorização e ciência dos participantes da gravação.");
  const ext=(file?.name||pendingAudio?.filename||"").split(".").pop().toLowerCase();
  const types={mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav",webm:"audio/webm",mp4:"video/mp4",mpeg:"audio/mpeg",mpga:"audio/mpeg"};
  if(!types[ext])return audioNotice("error","Use MP3, M4A, WAV, WEBM, MPEG ou MP4.");
  if(file&&(file.size>25165824||file.size<1024))return audioNotice("error","O áudio deve ter entre 1 KB e 24 MB.");
  audioBusy=true;audioUpload.disabled=true;
  try{
   if(!pendingAudio){
    const uuid=crypto.randomUUID();
    const path=c.id+"/"+uuid+"."+ext;
    audioNotice("saving","◌ Enviando gravação à área privada do Supabase…");
    const r=await db().storage.from("phoenix-talent-audio")
     .upload(path,file,{upsert:false,contentType:types[ext]});
    if(r.error)throw r.error;
    pendingAudio={path,filename:file.name};
   }
   audioNotice("saving","◌ JARVIS transcrevendo a gravação e identificando as vozes…");
   const response=await backend("transcribe_audio",{candidate_id:c.id,storage_path:pendingAudio.path,
     original_filename:pendingAudio.filename,consent_confirmed:true});
   if(!response?.ok)throw Error("O servidor não confirmou a transcrição.");
   pendingAudio=null;audioFile.value="";await loadAudio();
   if(panel.isConnected)audioNotice("draft","✓ Gravação transcrita e salva. Confira quem é o candidato em cada voz antes de analisar.");
  }catch(e){
   if(panel.isConnected)audioNotice("error","! "+String(e.message||e)+(pendingAudio?" O arquivo foi enviado; clique novamente para retomar a transcrição.":""));
  }finally{audioBusy=false;if(panel.isConnected)audioUpload.disabled=role==="viewer";}
 });
 audioSave.addEventListener("click",async()=>{
  if(!activeAudio)return;
  const mapping={};
  for(const select of audioMap.querySelectorAll("select[data-speaker]")){
   if(!select.value)return audioNotice("error","Identifique todas as vozes, mesmo que alguma seja 'não identificada'.");
   mapping[select.dataset.speaker]=select.value;
  }
  if(Object.values(mapping).filter(x=>x==="candidato").length!==1)
   return audioNotice("error","Marque exatamente uma voz como candidato.");
  audioSave.disabled=true;audioNotice("saving","◌ Confirmando atribuição de vozes no Supabase…");
  try{
   const r=await backend("assign_audio_speakers",{candidate_id:c.id,recording_id:activeAudio.id,speaker_roles:mapping});
   if(!r?.ok)throw Error("O Supabase não confirmou as atribuições.");
   await loadAudio();
  }catch(e){audioNotice("error","! Não foi possível salvar as vozes: "+String(e.message||e));}
  finally{if(panel.isConnected)audioSave.disabled=role==="viewer";}
 });
 $("jrAudioListen").addEventListener("click",async()=>{
  if(!activeAudio)return;
  const button=$("jrAudioListen"),player=$("jrAudioPlayer");
  button.disabled=true;audioNotice("saving","◌ Gerando acesso privado e temporário à gravação…");
  try{
   const r=await db().storage.from("phoenix-talent-audio").createSignedUrl(activeAudio.storage_path,90);
   if(r.error||!r.data?.signedUrl)throw r.error||Error("Não foi possível reproduzir o arquivo.");
   player.src=r.data.signedUrl;player.hidden=false;player.load();
   audioNotice("saved","✓ Reprodução liberada por acesso privado temporário (90 segundos).");
  }catch(e){audioNotice("error","! Não foi possível abrir o áudio: "+String(e.message||e));}
  finally{button.disabled=false;}
 });

 const humanStatus=$("jrHumanStatus"),humanReason=$("jrHumanRationale"),humanSave=$("jrHumanSave"),humanLatest=$("jrHumanLatest"),humanFeedback=$("jrHumanFeedback");
 const humanWrite=msg=>{if(humanFeedback)humanFeedback.textContent=msg;};
 function showHumanReview(data){
  currentReview=data||null;
  if(!humanLatest)return;
  if(data){
   humanLatest.innerHTML="<strong>"+htmlSafe(humanVeredictLabels[data.verdict]||"Parecer RH")+"</strong><p>"+htmlSafe(data.rationale)+"</p><small>Registrado por responsável autorizado em "+new Date(data.created_at).toLocaleString("pt-BR")+". Histórico preservado no Supabase.</small>";
  }else humanLatest.textContent="Ainda não há conclusão humana registrada para esta avaliação.";
 }
 async function loadHumanReview(){
  if(!a)return showHumanReview(null);
  try{
   const r=await db().from("phoenix_talent_human_reviews").select("id,verdict,rationale,created_at")
    .eq("candidate_id",c.id).eq("assessment_id",a.id)
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(r.error)throw r.error;
   if(panel.isConnected)showHumanReview(r.data||null);
  }catch(e){if(panel.isConnected)humanWrite("Não foi possível consultar os pareceres humanos: "+String(e.message||e));}
 }
 if(humanSave){
  humanSave.disabled=role==="viewer"||!a;
  humanStatus.disabled=role==="viewer"||!a;
  humanReason.disabled=role==="viewer"||!a;
  humanSave.addEventListener("click",async()=>{
   if(!a)return humanWrite("É necessário uma avaliação registrada antes do parecer.");
   const rationale=humanReason.value.trim(),verdict=humanStatus.value;
   if(!Object.keys(humanVeredictLabels).includes(verdict))return humanWrite("Selecione uma conclusão válida.");
   if(rationale.length<40)return humanWrite("Descreva o fundamento profissional com pelo menos 40 caracteres.");
   const currentButton=humanSave;currentButton.disabled=true;humanWrite("Salvando parecer do recrutador…");
   try{
    const user=await db().auth.getUser();
    if(user.error||!user.data.user)throw Error("Sessão expirada; entre novamente.");
    const r=await db().from("phoenix_talent_human_reviews").insert({
     candidate_id:c.id,assessment_id:a.id,reviewer_id:user.data.user.id,
     verdict,rationale
    }).select("id,verdict,rationale,created_at").single();
    if(r.error||!r.data)throw r.error||Error("Registro não confirmado pelo banco.");
    showHumanReview(r.data);humanReason.value="";
    humanWrite("✓ Parecer HUMANO salvo no Supabase. Registro anterior preservado.");
   }catch(e){humanWrite("Falha ao registrar o parecer: "+String(e.message||e));}
   finally{if(panel.isConnected)currentButton.disabled=role==="viewer";}
  });
 }
 loadHumanReview();

 const reportEl=$("jrReport");
 reportEl.innerHTML=reportMarkup(activeReport);
 const writeStatus=text=>{if($("jrStatus"))$("jrStatus").textContent=text;msg(text);};

 const noEdit=role==="viewer";
 const notesArea=$("ptEvidence"), cvInput=$("jrCVFile");
 let pickedNewFile=false,hasSavedCV=false,ticker=null;
 $("jrCVSave").disabled=noEdit;$("jrGenerate").disabled=true;$("jrPDF").disabled=!a;
 async function loadResume(){
  try{
   const r=await db().from("phoenix_talent_resumes").select("filename,uploaded_at")
    .eq("candidate_id",c.id).maybeSingle();
   if(!panel.isConnected)return;
   if(r.error)throw r.error;
   hasSavedCV=!!r.data;
   if(!pickedNewFile)setCVStatus(r.data?"saved":"missing",r.data
    ?"✓ Leitura do currículo SALVA no Supabase · "+r.data.filename+" · "+new Date(r.data.uploaded_at).toLocaleString("pt-BR")
    :"○ Nenhum conteúdo de currículo salvo nesta ficha.");
  }catch(e){if(panel.isConnected&&!pickedNewFile)setCVStatus("error","! Não foi possível confirmar o currículo no Supabase.");}
 }
 async function loadInterview(){
  if(!notesArea)return;
  setInterviewStatus("checking","Consultando entrevista salva no Supabase…");
  try{
   const r=await db().from("phoenix_talent_interviews").select("id,notes,conducted_at")
    .eq("candidate_id",c.id).order("conducted_at",{ascending:false}).limit(1).maybeSingle();
   if(!panel.isConnected)return;
   if(r.error)throw r.error;
   const saved=String(r.data?.notes||"");
   const typed=notesArea.dataset.userEdited==="yes";
   notesArea.dataset.savedText=saved;
   if(!typed)notesArea.value=saved;
   if(typed&&notesArea.value.trim()!==saved.trim())
     setInterviewStatus("draft","● Alterações ainda não salvas — clique em Salvar evidência.");
   else if(r.data)
     setInterviewStatus("saved","✓ Entrevista SALVA no Supabase · "+new Date(r.data.conducted_at).toLocaleString("pt-BR"));
   else setInterviewStatus("missing","○ Ainda não existe entrevista registrada neste candidato.");
  }catch(e){if(panel.isConnected)setInterviewStatus("error","! Não foi possível consultar a entrevista no Supabase.");}
 }
 if(notesArea){
  notesArea.addEventListener("input",()=>{
   notesArea.dataset.userEdited="yes";
   const saved=String(notesArea.dataset.savedText||"").trim();
   if(notesArea.value.trim()===saved)
    setInterviewStatus(saved?"saved":"missing",saved?"✓ Entrevista salva no Supabase.":"○ Entrevista ainda não registrada.");
   else setInterviewStatus("draft","● Alterações da entrevista ainda não foram salvas.");
  });
 }
 cvInput.addEventListener("change",()=>{
  pickedNewFile=!!cvInput.files?.length;
  if(pickedNewFile)setCVStatus("draft","● Arquivo selecionado: "+cvInput.files[0].name+" · AINDA NÃO SALVO. Clique em Ler e anexar currículo.");
  else loadResume();
 });
 const hydration=Promise.all([loadResume(),loadInterview(),loadAudio()]).finally(()=>{
  if(panel.isConnected)$("jrGenerate").disabled=noEdit||!a;
 });
 $("jrCVSave").addEventListener("click",async()=>{
  const file=cvInput.files?.[0];
  if(!file){writeStatus("Selecione um arquivo de currículo para anexar.");return;}
  const btn=$("jrCVSave");btn.disabled=true;
  setCVStatus("saving","◌ Lendo texto do documento…");
  try{
   const {value,ext}=await getResumeText(file);
   setCVStatus("saving","◌ Enviando e confirmando o registro no Supabase…");
   await backend("save_resume",{candidate_id:c.id,filename:file.name.slice(0,160),file_type:ext,extracted_text:value});
   const check=await db().from("phoenix_talent_resumes").select("filename,uploaded_at")
    .eq("candidate_id",c.id).maybeSingle();
   if(check.error||!check.data||check.data.filename!==file.name.slice(0,160))
    throw Error("Servidor respondeu, mas não foi possível confirmar o arquivo na ficha.");
   hasSavedCV=true;pickedNewFile=false;cvInput.value="";
   if(!panel.isConnected)return;
   setCVStatus("saved","✓ Leitura do currículo SALVA no Supabase · "+check.data.filename+" · "+new Date(check.data.uploaded_at).toLocaleString("pt-BR"));
   writeStatus("Texto do currículo salvo no Supabase (o arquivo original não é armazenado). Gere um novo parecer para utilizá-lo.");
  }catch(e){
   if(panel.isConnected)setCVStatus("error","! Não foi possível confirmar o anexo. Tente novamente.");
   if(panel.isConnected)writeStatus(String(e.message||e));
  }finally{if(panel.isConnected)btn.disabled=noEdit;}
 });
 $("jrGenerate").addEventListener("click",async()=>{
  if(!a)return;
  await hydration;if(!panel.isConnected)return;
  const area=$("ptEvidence");
  if(area&&String(area.value||"").trim()!==String(area.dataset.savedText||"").trim()){
   writeStatus("Salve a entrevista antes de pedir a análise.");
   setInterviewStatus("draft","● Entrevista alterada. Clique em Salvar evidência.");
   area.focus();return;
  }
  if(pickedNewFile){
   writeStatus("O currículo foi selecionado, mas ainda não anexado. Clique em Ler e anexar currículo.");
   cvInput.focus();return;
  }
  if(audioBusy||pendingAudio){
   writeStatus("Conclua a transcrição do áudio antes de analisar.");return;
  }
  if(activeAudio&&audioSpeakers().length&&!Object.values(activeAudio.speaker_roles||{}).includes("candidato")){
   writeStatus("Identifique a voz do candidato na gravação e salve antes de gerar o parecer.");
   audioMap.scrollIntoView({behavior:"smooth",block:"nearest"});return;
  }
  const btn=$("jrGenerate");btn.disabled=true;btn.textContent="JARVIS analisando…";
  const busy=$("jrThinking"),label=$("jrThinkingText");
  const messages=[
   "Organizando informações disponíveis do currículo, entrevista e DISC…",
   "Relacionando as informações e identificando lacunas…",
   "Preparando perguntas e o parecer executivo…",
   "Aguardando processamento e confirmação do relatório no servidor…"
  ];
  let step=0;busy.hidden=false;label.textContent=messages[0];
  ticker=setInterval(()=>{step=(step+1)%messages.length;if(panel.isConnected)label.textContent=messages[step];},4700);
  writeStatus("JARVIS está analisando. Aguarde o retorno da IA.");
  try{
   // A API busca a última entrevista realmente salva, não um rascunho de navegador.
   const data=await backend("analyze_v3",{assessment_id:a.id,role:job?.title||""});
   if(!panel.isConnected)return;
   activeReport=data.report;reportEl.innerHTML=reportMarkup(activeReport);
   reportEl.scrollIntoView({behavior:"smooth",block:"nearest"});
   writeStatus("✓ Parecer JARVIS "+(data.report?.version||"")+" gerado e arquivado.");
  }catch(e){if(panel.isConnected)writeStatus("Falha na análise: "+String(e.message||e));}
  finally{
   if(ticker!==null)clearInterval(ticker);ticker=null;
   if(panel.isConnected){busy.hidden=true;btn.disabled=noEdit;btn.textContent="✦ Gerar análise aprofundada";}
  }
 });
 $("jrPDF").addEventListener("click",()=>{try{
  if(!activeReport)throw Error("Gere o relatório antes de exportar.");
  pdfReport(c,job,a,activeReport,currentReview);writeStatus("PDF executivo preparado.");
 }catch(e){writeStatus(String(e.message||e));}});
}
window.JarvisV3={mount:attach,parseReport,pdfReport,getResumeText,setInterviewStatus,setCVStatus};
})();
