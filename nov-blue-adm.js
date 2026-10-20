/* Phoenix Intelligence — visão administrativa de leads Novembro Azul B2C
 * Fonte: public.phoenix_nov_blue_leads, RLS para colaboradores ativos.
 * Valores detalhados de renda/despesas não são coletados nesta tabela.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"});
const products=[["auto","Seguro Auto"],["residencial","Residencial"],["fianca","Fiança"],["vida","Vida"],["previdencia","Previdência"],["saude","Plano de Saúde"]];
const labels={owned:"Possui",not_owned:"Não possui",unknown:"Não informou"};
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
 '<p class="nb-privacy">Resumo autorizado pelo participante. Não contém rendimentos, mensalidades nem despesas detalhadas. A pontuação foi calculada a partir de estimativas do participante; não deve ser usada para decisões automáticas de seguro ou crédito.</p>'+
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
 const {data,error}=await sb.from("phoenix_nov_blue_leads").select("id,created_at,name,email,phone,financial_score,score_band,insurances,consent_contact,consent_summary").order("created_at",{ascending:false}).limit(500);
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