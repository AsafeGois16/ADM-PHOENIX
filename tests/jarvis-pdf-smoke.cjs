const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('jarvis_v3.js','utf8');
let pages,docRef;
class JsPdfMock{
 constructor(){pages=[0];docRef=this;}
 setFillColor(){}setTextColor(){}setDrawColor(){}setFont(){}setFontSize(){}rect(){}roundedRect(){}line(){}addImage(){}
 addPage(){pages.push(0);}
 splitTextToSize(value,width){
  let max=Math.max(21,Math.floor(Number(width)/2.16)),words=String(value).split(/\s+/);let out=[],line='';
  for(const w of words){if(line.length+w.length+1>max){if(line)out.push(line);line='';}line+=line?' '+w:w;}
  if(line)out.push(line);return out.length?out:[''];
 }
 text(value,x,y){assert.ok(Number.isFinite(y)&&y>=0&&y<=292,'Texto fora da folha: '+y);pages[pages.length-1]++;}
 save(name){assert.match(name,/JARVIS_Dossie_/);}
}
const win={jspdf:{jsPDF:JsPdfMock}};
const dom={getElementById(){return null},querySelector(){return null},head:{appendChild(){}},createElement(){return {}}};
vm.runInNewContext(src,{window:win,document:dom,console,setTimeout,clearTimeout});
const agent=win.JarvisV3;assert.ok(agent&&agent.pdfReport);
const sample={
 version:'3.1',agent:'JARVIS',resume_included:true,
 method:{balanced:true,spread_pp:2.5,first_choice_tied:true,runner_up_factors:['C','D']},
 sections:{
 resumo_executivo:'O candidato relata experiência em movimentações cadastrais e conferência. A distribuição DISC é equilibrada, sem predominância expressiva. O teste prático ainda não foi realizado. '.repeat(3),
 leitura_disc:'As pontuações são próximas e não demonstram flexibilidade, competência ou sucesso. A interpretação permanece limitada a preferências relativas. '.repeat(3),
 analise_curriculo:'Currículo fictício com experiência declarada em backoffice, movimentações de beneficiários, atendimento a clientes e acompanhamento de protocolos, sem auditoria de resultados. '.repeat(4),
 contexto_vaga:'A função envolve prazos, qualidade de dados, controle de faturas e interface com operadoras, a conferir mediante exercício prático e entrevista estruturada. '.repeat(4),
 curriculo_declaracoes:Array(4).fill('CURRÍCULO / atividade declarada em controle de faturas e movimentação de beneficiários, sem comprovação independente.'),
 entrevista_relato:Array(4).fill('ENTREVISTA / relatou priorização de demandas com urgência e revisão frequente de controles, sem documentação verificável.'),
 evidencias_observadas:[],
 pontos_a_confirmar:Array(6).fill('Solicitar exemplo prático de conferência financeira e cumprimento de prazos sem retrabalho.'),
 perguntas_entrevista:Array(8).fill('Em uma fatura com cobrança divergente, qual procedimento você adotaria e como documentaria evidências?'),
 exercicio_pratico:'Simule cinco demandas de movimentação com prazos próximos e uma fatura divergente. Solicite critérios escritos, justificativas e plano de comunicação.',
 proximos_passos:Array(5).fill('Realizar exercício prático e entrevista por competências, com critérios estruturados e avaliação humana.'),
 nota_metodologica:'Instrumento DISC autoral sem validação psicométrica demonstrada, não comparável entre candidatos. Informações do currículo e da entrevista são alegações não comprovadas.'
 }};
assert.equal(agent.parseReport(JSON.stringify(sample)).version,'3.1');
assert.equal(agent.parseReport(JSON.stringify({...sample,version:'3.0'})).version,'3.0');
agent.pdfReport({full_name:'Candidato de Teste',id:'12345678-0000-0000-0000-000000000000'},{title:'Backoffice / Operações'},{result:{dimensions:{D:{relative_share_percent:25},I:{relative_share_percent:26.3},C:{relative_share_percent:25},S:{relative_share_percent:23.8}}}},sample);
assert.ok(pages.length>=3&&pages.length<=5,'Paginação incompatível: '+pages.length);
assert.ok(pages.at(-1)>10,'Última página praticamente vazia: '+JSON.stringify(pages));
console.log('JARVIS 3.1 PDF mock - páginas:',pages.length,'operações por página:',pages);
