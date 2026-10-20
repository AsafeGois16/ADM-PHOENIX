/* Phoenix Intelligence — ficha financeira B2C completa, consentida e protegida por RLS. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"});
const products=[["auto","Seguro Auto"],["residencial","Residencial"],["fianca","Fiança"],["vida","Vida"],["previdencia","Previdência"],["saude","Plano de Saúde"]];
const labels={owned:"Possui",not_owned:"Não possui",unknown:"Não informou"};
const BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const money=value=>Number.isFinite(Number(value))?BRL.format(Number(value)): "—";
const expenseNames={
 saude:"Saúde",farmacia:"Farmácia",mecanico:"Mecânico",combustivel:"Combustível mensal",
 mercado:"Mercado",residencial:"Moradia / residencial",reparos:"Pequenos reparos",luz:"Luz",agua:"Água",
 roupas:"Roupas",restaurantes:"Restaurantes",bar:"Bar",esportes:"Esportes",tecnologia:"Tecnologia",
 transporte:"Transporte e aplicativos",internet:"Internet e telefone",educacao:"Educação",dividas:"Dívidas e parcelas"
};
function fullFinance(d){
 if(!d||typeof d!=="object"||!Number.isFinite(Number(d.net)))return '<div class="nb-finance-empty">Detalhes financeiros não disponíveis para este cadastro.</div>';
 const breakdown=Object.entries(d.expenses||{}).map(([k,value])=>({label:expenseNames[k]||k,amount:Number(value)||0}))
   .concat((Array.isArray(d.custom)?d.custom:[]).map(x=>({label:String(x.label||"Despesa adicional"),amount:Number(x.amount)||0})))
   .sort((a,b)=>b.amount-a.amount);
 const expenseRows=breakdown.map((item,i)=>'<div class="nb-expense-line"><span><b>'+(i+1)+'.</b> '+E(item.label)+'</span><strong>'+money(item.amount)+'</strong></div>').join("");
 const premiumRows=products.map(([key,name])=>{
   const p=d.policies?.[key]||{},status=p.owned?"Possui":(p?.owned===false?"Não possui":"Não informado");
   return '<div class="nb-insured-line"><div><strong>'+E(name)+'</strong><small>'+E(status)+(p.owned&&p.provider?" · "+E(p.provider):"")+'</small></div><b>'+(p.owned?money(p.premium):"—")+'</b></div>';
 }).join("");
 const context=d.context||{},vs={yes:"Sim",no:"Não",unspecified:"Não informado"},hs={owner:"Imóvel próprio",renter:"Imóvel alugado",family:"Moradia familiar",unspecified:"Não informado"};
 return '<section class="nb-full-finance"><div class="nb-full-heading"><span>DIAGNÓSTICO FINANCEIRO AUTODECLARADO</span><h4>Resumo financeiro completo</h4><p>Dados compartilhados voluntariamente para atendimento. Não representam análise de crédito.</p></div>'+
 '<div class="nb-finance-kpis">'+[
 ["Salário bruto",d.gross],["Salário líquido",d.net],["Total de despesas",d.total],["Saldo estimado",d.balance],["Despesas sem proteções",d.basic_total],["Mensalidades de seguros",d.premium_total]
 ].map(([label,value])=>'<div><small>'+label+'</small><strong>'+money(value)+'</strong></div>').join("")+'</div>'+
 '<div class="nb-finance-columns"><div><h4>Despesas mensais por categoria</h4><div class="nb-expenses-list">'+expenseRows+'</div></div>'+
 '<div><h4>Seguros, planos e mensalidades</h4><div class="nb-insurance-list">'+premiumRows+'</div>'+
 '<h4 class="nb-context-title">Informações adicionais</h4><div class="nb-context-grid"><span>Possui veículo: <b>'+E(vs[context.vehicle]||"Não informado")+'</b></span><span>Moradia: <b>'+E(hs[context.home]||"Não informado")+'</b></span><span>Dependentes financeiros: <b>'+E(vs[context.dependents]||"Não informado")+'</b></span></div></div></div></section>';
}
let rows=[],visible=[],opened=false,viewReady=false;
function statusBadge(status){
 const normalized=["owned","not_owned"].includes(status)?status:"unknown";
 return '<span class="nb-status '+normalized+'">'+labels[normalized]+'</span>';
}
function date(s){try{return F.format(new Date(s));}catch{return"—";}}
function sanitizeFilters(){
 const q=($("novBlueSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
 const type=$("novBlueScoreFilter")?.value||"all";
 return rows.filter(row=>{
  const hay=[row.name,row.email,row.phone].map(x=>String(x||"").toLocaleLowerCase("pt-BR")).join(" ");
  if(q&&!hay.includes(q))return false;
  const score=row.financial_score;
  if(type==="high")return score!==null&&score>=80;
  if(type==="mid")return score!==null&&score>=60&&score<80;
  if(type==="low")return score!==null&&score<60;
  if(type==="missing")return score===null;
  return true;
 });
}
function render(){
 const el=$("novBlueTableBody"),title=$("novBlueCount");if(!el)return;
 visible=sanitizeFilters();
 if(title)title.textContent=visible.length+" participante(s) exibido(s)";
 $("novBlueTotal").textContent=rows.length;
 const rated=rows.filter(r=>r.financial_score!==null);
 $("novBlueAvg").textContent=rated.length?Math.round(rated.reduce((n,r)=>n+r.financial_score,0)/rated.length)+"%":"—";
 $("novBlueContact").textContent=rows.filter(r=>r.consent_contact&&r.consent_summary).length;
 el.innerHTML=visible.length?visible.map(r=>{
  const score=r.financial_score===null?'Não calculado':r.financial_score+'%';
  const insurance=products.map(([k,caption])=>'<div class="nb-insurance-pair"><span>'+caption+'</span>'+statusBadge(r.insurances?.[k])+'</div>').join("");
  return '<tr><td><strong>'+E(r.name)+'</strong><small>'+E(r.email)+'</small></td>'+
   '<td><b class="nb-score">'+E(score)+'</b><small>Estimativa autodeclarada</small></td>'+
   '<td><div class="nb-policies">'+insurance+'</div></td>'+
   '<td><small>'+E(date(r.created_at))+'</small></td>'+
   '<td><button class="nb-view" data-nov-blue-id="'+E(r.id)+'">Ver ficha</button></td></tr>';
 }).join(""):'<tr><td colspan="5" class="nb-empty">Nenhum participante encontrado com esses filtros. Somente envios autorizados são exibidos.</td></tr>';
}
function openDetail(id){
 const lead=rows.find(x=>x.id===id),target=$("novBlueDetail");if(!lead||!target)return;
 const phone=String(lead.phone||"").replace(/\D/g,"");
 const statuses=products.map(([k,t])=>'<div><strong>'+t+'</strong>'+statusBadge(lead.insurances?.[k])+'</div>').join("");
 target.hidden=false;
 target.innerHTML='<div class="nb-detail-top"><div><small>PHOENIX AZUL 360° · B2C</small><h3>'+E(lead.name)+'</h3><span>Cadastro consentido em '+E(date(lead.created_at))+'</span></div><button id="novBlueCloseDetail" type="button">Fechar</button></div>'+
 '<div class="nb-detail-info"><div><small>Saúde financeira (educativa)</small><strong>'+(lead.financial_score===null?'Não calculada':E(lead.financial_score)+'%')+'</strong></div><div><small>Contato</small><strong>'+E(lead.email)+'</strong><span>'+E(lead.phone||"Telefone não informado")+'</span></div></div>'+
 '<h4>Mapa de proteções declaradas</h4><div class="nb-detail-insurances">'+statuses+'</div>'+
 '<div class="nb-consent-meta">Compartilhamento autorizado em '+E(date(lead.consent_at||lead.created_at))+' · Aviso: '+E(lead.notice_version||'não informado')+'</div>'+fullFinance(lead.financial_details)+'<p class="nb-privacy">Dados completos fornecidos voluntariamente pelo participante, com retenção de até 12 meses. O índice é educativo e não deve ser utilizado para decisões automáticas de crédito ou aceitação de seguros.</p>'+
 '<div class="nb-contact-actions"><a href="mailto:'+encodeURIComponent(lead.email)+'">Enviar e-mail</a>'+
 (phone.length>=10&&phone.length<=13?'<a href="https://wa.me/'+(phone.startsWith("55")?phone:"55"+phone)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a>':"")+'</div>';
 $("novBlueCloseDetail").addEventListener("click",()=>{target.hidden=true;target.textContent="";});
 target.scrollIntoView({behavior:"smooth",block:"start"});
}
async function refresh(){
 const message=$("novBlueFeedback");if(!message)return;
 message.textContent="Carregando resumos autorizados...";
 rows=[];render();const detail=$("novBlueDetail");if(detail){detail.hidden=true;detail.textContent="";}
 const session=await sb.auth.getUser();
 if(session.error||!session.data?.user){message.textContent="Faça login no ADM para consultar este painel.";rows=[];render();return;}
 const profile=await sb.from("phoenix_profiles").select("id,active,role").eq("id",session.data.user.id).maybeSingle();
 if(profile.error||!profile.data?.active||!["gestor","comercial","backoffice"].includes(profile.data.role)){
  message.textContent="Seu perfil não possui acesso aos dados comerciais desta campanha.";rows=[];render();return;
 }
 const {data,error}=await sb.from("phoenix_nov_blue_leads").select("id,created_at,name,email,phone,financial_score,score_band,insurances,financial_details,consent_contact,consent_summary,consent_at,notice_version").order("created_at",{ascending:false}).limit(500);
 if(error){rows=[];render();message.textContent="Consulta indisponível: "+error.message;return;}
 rows=data||[];render();message.textContent=rows.length?"Mostrando os "+rows.length+" cadastros consentidos mais recentes (limite de 500).":"Nenhum envio autorizado recebido nesta campanha até o momento.";
}
function open(){
 if(!document.getElementById("dashboard")||document.getElementById("dashboard").style.display!=="block"){alert("Faça login no ADM primeiro.");return;}
 const original=window.setPainelV7;
 if(typeof original==="function")original("base");
 $("universalBaseView").hidden=true;
 $("novBlueAdm").hidden=false;
 $("novBlueTab").classList.add("active");
 opened=true;refresh();
}
function bind(){
 if(viewReady)return;
 viewReady=true;
 $("novBlueRefresh")?.addEventListener("click",refresh);
 $("novBlueSearch")?.addEventListener("input",render);
 $("novBlueScoreFilter")?.addEventListener("change",render);
 $("novBlueTableBody")?.addEventListener("click",ev=>{
  const btn=ev.target.closest("button[data-nov-blue-id]");if(btn)openDetail(btn.dataset.novBlueId);
 });
 const old=window.setPainelV7;
 if(typeof old==="function")window.setPainelV7=function(view){
  if(view!=="novblue"){$("novBlueAdm").hidden=true;$("novBlueTab").classList.remove("active");const detail=$("novBlueDetail");if(detail)detail.hidden=true;}
  return old.apply(this,arguments);
 };
}
window.phoenixNovBlue={open,refresh};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();