const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const js=fs.readFileSync("jarvis_v3.js","utf8");
const css=fs.readFileSync("jarvis_v3.css","utf8");
new vm.Script(js);
assert.match(js,/requirementsMarkup\(report\)/);
assert.match(js,/jrHumanStatus/);
assert.match(js,/jrHumanRationale/);
assert.match(js,/phoenix_talent_human_reviews/);
assert.match(js,/rationale.length<40/);
assert.match(js,/reviewer_id:user.data.user.id/);
assert.match(js,/pdfReport\(c,job,a,activeReport,currentReview\)/);
assert.match(js,/jrRequirementHeading/);
assert.doesNotMatch(js,/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-proj-/);
assert.match(css,/jrRequirements/);
assert.match(css,/jrHumanReview/);
const dom={getElementById(){return null},querySelector(){return null},head:{appendChild(){}},createElement(){return {}}};
const window={};
vm.runInNewContext(js,{window,document:dom,setTimeout,clearTimeout,console});
const a={
 version:"3.3",agent:"JARVIS",
 sections:{
 resumo_executivo:"Descrição baseada em evidências, sem decisão automática.",
 leitura_disc:"Distribuição equilibrada e não validada.",
 contexto_vaga:"Backoffice / Operações"
 },
 resume_included:true,
 method:{balanced:true,spread_pp:2.5},
 requirements:{items:[
 {id:"prazos",title:"Cumprimento de prazos e priorização de solicitações",priority:"essencial",estado:"dificuldade_observada",origem:"observacao_entrevistador",fundamento:"Em simulação registrada, houve falhas na priorização.",proxima_verificacao:"Repetir o exercício em condições padronizadas."},
 {id:"excel",title:"Aplicação prática de planilhas",priority:"importante",estado:"somente_declarado",origem:"curriculo",fundamento:"O candidato relatou conhecimento intermediário.",proxima_verificacao:"Exercício com fórmulas."}
 ]}
};
assert.equal(window.JarvisV3.parseReport(JSON.stringify(a)).version,"3.3");
console.log("JARVIS 3.3: parser, critérios, auditoria humana e estilos validados.");
