/* Phoenix Experience / HBR  — funciona com Supabase Auth existente (const sb) */
(function(){
  'use strict';
  const E='HBR-2026-GIRO-DA-SORTE';
  const LABELS={copo_phoenix:'Copo Phoenix',caneta_phoenix:'Caneta Phoenix',agenda_phoenix:'Agenda Phoenix',suhai_auto_8:'8% · SUHAI Auto',residencial_10:'10% · Residencial',auto_10:'10% · Seguro Auto',nao_desista:'Não desista!'};
  const INTERESTS={saude:'Saúde',vida:'Vida',auto:'Automóvel',residencial:'Residencial',odonto:'Odontológico',todos:'Todos'};
  const PHYSICAL=new Set(['copo_phoenix','caneta_phoenix','agenda_phoenix']);
  const $=(id)=>document.getElementById(id);
  const safe=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const n=(val)=>Number(val||0).toLocaleString('pt-BR');
  const when=(val)=>val?new Date(val).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const state={rows:[],filtered:[],loading:false,active:false,interval:null,loaded:false};
  function currentClient(){return typeof sb!=='undefined'?sb:null;}
  function noteStatus(note){const match=String(note||'').match(/\[PXEXP:(entregue|pendente|encaminhado|cancelado)\|[^\]]*\]/i);return match?match[1].toLowerCase():'pendente';}
  function setMsg(text,error){const e=$('pxeMessage');if(e){e.textContent=text||'';e.classList.toggle('error',!!error);}}
  function canDeliver(r){return r.status==='validado'&&r.resultado!=='nao_desista';}
  function eligible(r){return r.status==='validado'&&r.elegivel_sorteio===true;}
  function btnStatus(r){const v=noteStatus(r.observacoes);return v==='entregue'||v==='encaminhado';}
  function stats(){
    const rows=state.rows, valid=rows.filter(r=>r.status==='validado'), elig=rows.filter(eligible);
    $('pxeTotal').textContent=n(rows.length); $('pxeEligible').textContent=n(elig.length);
    $('pxePrizes').textContent=n(rows.filter(r=>PHYSICAL.has(r.resultado)).length);
    $('pxeDelivered').textContent=n(rows.filter(btnStatus).length);
    $('pxeValid').textContent=n(valid.length);$('pxePending').textContent=n(rows.filter(r=>r.status==='pendente').length);
    $('pxeRejected').textContent=n(rows.filter(r=>r.status==='rejeitado').length);
    $('pxeOffers').textContent=n(rows.filter(r=>r.marketing_consent===true).length);
    const vals=Object.entries(LABELS).map(([key,label])=>({key,label,count:rows.filter(r=>r.resultado===key).length}));
    const peak=Math.max(1,...vals.map(v=>v.count));
    $('pxeChart').innerHTML=vals.map(v=>'<div class="pxe-bar-item"><span class="pxe-bar-label" title="'+safe(v.label)+'">'+safe(v.label)+'</span><div class="pxe-bar-track"><div class="pxe-bar-fill" style="width:'+((v.count/peak)*100).toFixed(2)+'%"></div></div><span class="pxe-bar-count">'+n(v.count)+'</span></div>').join('');
  }
  function filters(){
    const search=$('pxeSearch').value.trim().toLocaleLowerCase('pt-BR');
    const result=$('pxeResultFilter').value, status=$('pxeStatusFilter').value;
    state.filtered=state.rows.filter(r=>{
      if(result&&r.resultado!==result)return false;
      if(status&&r.status!==status)return false;
      if(!search)return true;
      return [r.nome,r.email,r.telefone,r.codigo,INTERESTS[r.interesse],LABELS[r.resultado]].join(' ').toLocaleLowerCase('pt-BR').includes(search);
    });
    renderRows();
  }
  function renderRows(){
    const records=state.filtered;
    if(!records.length){$('pxeRows').innerHTML='<tr><td colspan="8" class="pxe-empty">Nenhum participante para os filtros selecionados.</td></tr>';return;}
    $('pxeRows').innerHTML=records.slice(0,400).map(r=>{
      const yes=eligible(r),delivery=noteStatus(r.observacoes),delivered=btnStatus(r);
      const prizeLabel=PHYSICAL.has(r.resultado)?'Entregue':'Encaminhado';
      const rowButtons=[
        r.status==='validado' ? '<button type="button" class="pxe-row-btn" data-action="rejeitar" data-id="'+safe(r.id)+'" title="Revogar elegibilidade">Rejeitar</button>':
        '<button type="button" class="pxe-row-btn" data-action="validar" data-id="'+safe(r.id)+'">Validar</button>',
        canDeliver(r)?('<button type="button" class="pxe-row-btn" data-action="'+(delivered?'desfazer':'entregar')+'" data-id="'+safe(r.id)+'">'+(delivered?'Desfazer '+prizeLabel.toLowerCase():'Registrar '+prizeLabel.toLowerCase())+'</button>'):''
      ].join('');
      return '<tr><td><div class="pxe-person">'+safe(r.nome)+'</div><span class="pxe-meta">'+safe(r.codigo)+'</span></td>'+
        '<td>'+safe(r.telefone)+'<br><span class="pxe-meta">'+safe(r.email)+'</span></td>'+
        '<td>'+safe(INTERESTS[r.interesse]||r.interesse)+'</td><td>'+safe(LABELS[r.resultado]||r.resultado)+'</td>'+
        '<td><span class="pxe-tag '+(yes?'ok':r.status==='pendente'?'wait':'no')+'">'+(yes?'Elegível':r.status==='pendente'?'Pendente':'Não elegível')+'</span></td>'+
        '<td><span class="pxe-tag '+(delivered?'ok':'wait')+'">'+(delivered?(delivery==='entregue'?'Entregue':'Encaminhado'):(r.resultado==='nao_desista'?'Sem prêmio imediato':'Não registrado'))+'</span></td>'+
        '<td>'+when(r.created_at)+'</td><td>'+rowButtons+'</td></tr>';
    }).join('');
    if(records.length>400)setMsg('Exibindo 400 de '+n(records.length)+' resultados filtrados. O CSV exporta todos.',false);
  }
  async function fetchAll(client){
    let offset=0;const size=500;const result=[];
    for(let page=0;page<40;page++){
      const {data,error}=await client.from('hbr_giro_inscricoes')
        .select('id,codigo,created_at,nome,telefone,email,interesse,resultado,status,elegivel_sorteio,observacoes,marketing_consent,validado_em')
        .eq('event_id',E).order('created_at',{ascending:false}).range(offset,offset+size-1);
      if(error)throw error;
      result.push(...(data||[]));
      if(!data||data.length<size)break;
      offset+=size;
      if(page===39)throw new Error('Mais de 20.000 registros encontrados. Ajuste a paginação antes de exportar.');
    }
    return result;
  }
  async function refresh(silent=false){
    if(!state.active||state.loading)return;
    const client=currentClient();if(!client){setMsg('Biblioteca Supabase indisponível.',true);return;}
    state.loading=true;
    try{
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw new Error('Faça login no ADM para consultar os participantes.');
      const rows=await fetchAll(client);
      state.rows=rows;state.loaded=true;stats();filters();
      if(!silent)setMsg('Sincronizado às '+new Date().toLocaleTimeString('pt-BR')+'. '+n(rows.length)+' participante(s) carregado(s).',false);
    }catch(e){setMsg('Não foi possível consultar a HBR: '+String(e.message||e),true);}
    finally{state.loading=false;}
  }
  function csvEscape(v){let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function downloadCsv(onlyEligible){
    if(!state.loaded){setMsg('Aguarde carregar os participantes antes de exportar.',true);return;}
    const records=onlyEligible?state.rows.filter(eligible):state.filtered;
    if(!records.length){setMsg('Não há participantes para exportar.',true);return;}
    const head=['Código','Nome','WhatsApp','E-mail','Interesse','Resultado da roleta','Status','Elegível','Premiação','Marketing consentido','Data e hora'];
    const lines=[head,...records.map(r=>[r.codigo,r.nome,r.telefone,r.email,INTERESTS[r.interesse]||r.interesse,LABELS[r.resultado]||r.resultado,r.status,eligible(r)?'Sim':'Não',noteStatus(r.observacoes),r.marketing_consent?'Sim':'Não',r.created_at])];
    const csv='\ufeff'+lines.map(row=>row.map(csvEscape).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
    a.download='Phoenix_Experience_HBR_'+(onlyEligible?'Elegiveis_':'')+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    if(onlyEligible)setMsg('Relação de '+n(records.length)+' elegível(is) exportada. A exportação não congela inscrições no servidor.',false);
  }
  async function updateRow(id,action,button){
    const r=state.rows.find(v=>v.id===id);if(!r)return;
    const client=currentClient();if(!client)return;
    let changes=null;
    if(action==='validar'||action==='rejeitar'){
      const target=action==='validar'?'validado':'rejeitado';
      if(!confirm('Confirma alterar o status de '+r.nome+' para '+target+'? A elegibilidade para o sorteio será atualizada.'))return;
      changes={status:target};
    }else if(action==='entregar'||action==='desfazer'){
      if(!canDeliver(r)){setMsg('Apenas cadastros validados com prêmio podem receber confirmação.',true);return;}
      const current=noteStatus(r.observacoes);const next=action==='desfazer'?'pendente':(PHYSICAL.has(r.resultado)?'entregue':'encaminhado');
      if(current===next)return;
      if(!confirm((action==='desfazer'?'Desfazer registro de entrega/encaminhamento de ':'Registrar entrega/encaminhamento para ')+r.nome+'?'))return;
      const {data:before,error:readErr}=await client.from('hbr_giro_inscricoes').select('observacoes,status').eq('id',r.id).single();
      if(readErr){setMsg('Erro ao consultar observações: '+readErr.message,true);return;}
      if(before.status!=='validado'){setMsg('Cadastro deixou de estar validado. Atualize a lista.',true);return;}
      const {data:{user}}=await client.auth.getUser();
      const notes=String(before.observacoes||'').replace(/\n?\[PXEXP:(?:entregue|pendente|encaminhado|cancelado)\|[^\]]*\]/gi,'').trim();
      const log='[PXEXP:'+next+'|'+new Date().toISOString()+'|'+String(user?.email||'equipe').replace(/[\[\]|]/g,'')+']';
      changes={observacoes:notes+(notes?'\n':'')+log};
    }
    if(!changes)return;
    button.disabled=true;
    try{
      const {error}=await client.from('hbr_giro_inscricoes').update(changes).eq('id',id).select('id').single();
      if(error)throw error;
      setMsg('Alteração registrada no Supabase para '+r.nome+'.',false);
      await refresh(true);
    }catch(e){setMsg('Não foi possível salvar: '+String(e.message||e),true);}
    finally{button.disabled=false;}
  }
  function open(){
    state.active=true;
    if(!state.interval)state.interval=setInterval(()=>{if(state.active&&!document.hidden)refresh(true);},15000);
    refresh(false);
  }
  function close(){state.active=false;}
  function init(){
    Object.entries(LABELS).forEach(([id,label])=>$('pxeResultFilter').add(new Option(label,id)));
    ['pxeSearch','pxeResultFilter','pxeStatusFilter'].forEach(id=>$(id).addEventListener(id==='pxeSearch'?'input':'change',filters));
    $('pxeRefresh').addEventListener('click',()=>refresh(false));
    $('pxeExport').addEventListener('click',()=>downloadCsv(false));
    $('pxeEligibleExport').addEventListener('click',()=>downloadCsv(true));
    $('pxeRows').addEventListener('click',e=>{
      const btn=e.target.closest('button[data-action][data-id]');
      if(!btn)return;
      updateRow(btn.dataset.id,btn.dataset.action,btn);
    });
  }
  window.PXExperience={open,close,refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
