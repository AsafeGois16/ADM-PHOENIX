/* Phoenix Diagnosticos V9 | Extensao de leitura do ADM oficial.
   Nao altera os modulos legados, a base universal nem o CRM. */
(function(){
  'use strict';
  const root=document.getElementById('phxDiagV9Box');
  if(!root)return;
  const $=id=>document.getElementById(id);
  const state={rows:[],total:0,page:0,pageSize:30,loading:false,loaded:false};
  const client=()=>typeof sb!=='undefined'?sb:null;
  const clean=(x)=>x===null||x===undefined||x===''?'—':String(x);
  const el=(tag,klass,value)=>{
    const node=document.createElement(tag);
    if(klass)node.className=klass;
    if(value!==undefined)node.textContent=clean(value);
    return node;
  };
  const fmtDate=(value)=>{
    if(!value)return'—';
    const d=new Date(value);
    return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
  };
  const prod={saude:'Plano de Saúde',odonto:'Plano Odontológico',vida:'Seguro de Vida',empresarial:'Seguro Empresarial',equipamentos:'Seguro de Equipamentos',frota:'Seguro para Frotas',rc:'Responsabilidade Civil',garantias:'Garantias'};
  const questionTitles={porte:'Número de colaboradores',saude:'Plano de saúde',odonto:'Plano odontológico',vida:'Seguro de vida',estrutura:'Estrutura física',empresarial:'Seguro empresarial atual',equipamentos:'Máquinas e equipamentos',equipProtecao:'Proteção dos equipamentos',frota:'Utilização de frota',frotaProtecao:'Seguro da frota',rcExposicao:'Exposição a terceiros',rcProtecao:'Responsabilidade civil atual',garantias:'Contratos com garantias',garantiaProtecao:'Proteção de garantias',segurosAtuais:'Proteções atuais',revisao:'Última revisão da carteira'};
  const status={pending_configuration:'E-mail sem configuração',queued:'Aguardando envio',sending:'Enviando e-mail',sent:'Enviado ao provedor',failed:'Falha no e-mail',skipped:'Sem e-mail'};
  const notice=(message,error=false)=>{
    const box=$('phxDiagV9Message');
    box.textContent=message;
    box.classList.toggle('error',!!error);
  };
  function setDetail(record){
    const target=$('phxDiagV9Details');
    target.replaceChildren();
    target.hidden=!record;
    if(!record)return;
    const head=el('header','phxv9-detail-head');
    const info=el('div');
    info.append(el('small','phxv9-muted','FICHA DO PHOENIX DIAGNÓSTICOS V9'),
      el('h4','',record.company?.empresa||'Empresa não informada'),
      el('p','phxv9-muted','Diagnóstico: '+record.submission_id));
    head.append(info,el('span','phxv9-pill',record.crm_status||'Novo'));
    target.append(head);
    const pairs=[
      ['Participante',record.contact?.nome],
      ['Cargo',record.contact?.cargo],
      ['E-mail',record.contact?.email],
      ['Telefone',record.contact?.telefone],
      ['CNPJ',record.company?.cnpj],
      ['Segmento',record.company?.segmento],
      ['Cidade',record.company?.cidade],
      ['Colaboradores',record.company?.colaboradores],
      ['Faturamento declarado',record.company?.faturamento],
      ['Índice indicativo',Number.isFinite(Number(record.analysis?.protectionIndex))&&record.analysis?.protectionIndex!==null?record.analysis.protectionIndex+'/100':'Não calculado'],
      ['Score comercial',record.commercial?.score!==null&&record.commercial?.score!==undefined?record.commercial.score+'/100':'Não informado'],
      ['Prioridade',record.analysis?.priority],
      ['Situação do e-mail',status[record.delivery_status]||record.delivery_status],
      ['Tentativas de envio',record.delivery_attempts],
      ['Último envio',record.delivery_sent_at?fmtDate(record.delivery_sent_at):'Não confirmado']
    ];
    const grid=el('div','phxv9-pairs');
    for(const [label,value] of pairs){
      const item=el('div','phxv9-pair');
      item.append(el('small','',label),el('strong','',value));
      grid.append(item);
    }
    target.append(grid);
    const recs=Array.isArray(record.analysis?.recommended)?record.analysis.recommended:[];
    const recsBox=el('div','phxv9-recs');
    recsBox.append(el('h5','','Recomendações registradas'));
    if(!recs.length)recsBox.append(el('p','phxv9-muted','Nenhuma prioridade indicada nesta triagem.'));
    for(const item of recs.slice(0,8)){
      const card=el('article','phxv9-reco');
      card.append(el('strong','',prod[item.key]||item.key||'Revisão de carteira'),el('p','',item.reason||'Acompanhamento técnico recomendado.'));
      recsBox.append(card);
    }
    target.append(recsBox);
    const answerBox=el('div','phxv9-recs');
    answerBox.append(el('h5','','Respostas registradas'));
    const responseGrid=el('div','phxv9-pairs');
    for(const [key,value] of Object.entries(record.answers||{})){
      if(!Object.prototype.hasOwnProperty.call(questionTitles,key))continue;
      const pair=el('div','phxv9-pair');
      const readable=value==='sim'?'Sim':value==='nao'?'Não':value==='nao-sei'?'Não sei':clean(value);
      pair.append(el('small','',questionTitles[key]),el('strong','',readable));
      responseGrid.append(pair);
    }
    if(!responseGrid.children.length)answerBox.append(el('p','phxv9-muted','Nenhuma resposta individual registrada.'));
    else answerBox.append(responseGrid);
    target.append(answerBox);
    const next=el('div','phxv9-next');
    next.append(el('strong','','Próxima ação comercial sugerida'),el('p','',record.commercial?.nextAction||'Solicitar análise consultiva das apólices.'));
    target.append(next);
    if(record.delivery_status==='failed'&&record.delivery_last_error){
      target.append(el('p','phxv9-muted','Falha técnica de envio: '+record.delivery_last_error));
    }
    target.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function render(){
    const tbody=$('phxDiagV9Rows');
    tbody.replaceChildren();
    const q=$('phxDiagV9Search').value.trim().toLocaleLowerCase('pt-BR');
    const delivery=$('phxDiagV9Delivery').value;
    const filtered=state.rows.filter(row=>{
      const hay=[row.contact?.nome,row.contact?.email,row.company?.empresa,row.company?.cnpj,row.submission_id].join(' ').toLocaleLowerCase('pt-BR');
      return (!q||hay.includes(q))&&(!delivery||row.delivery_status===delivery);
    });
    for(const row of filtered){
      const tr=el('tr');
      const identity=el('td');
      identity.append(el('strong','',row.company?.empresa||'Empresa não informada'),el('small','phxv9-muted',row.contact?.nome||row.contact?.email||'Participante'));
      const contact=el('td');
      contact.append(el('span','',row.contact?.email||row.contact?.telefone||'—'));
      const rec=el('td');
      const arr=Array.isArray(row.analysis?.recommended)?row.analysis.recommended:[];
      rec.append(el('span','',arr.length?arr.length+(arr.length===1?' recomendação':' recomendações'):'Sem indicação prioritária'));
      const mail=el('td');
      mail.append(el('span','phxv9-pill',status[row.delivery_status]||row.delivery_status||'—'));
      const action=el('td');
      const btn=el('button','phxv9-action','Ver ficha');
      btn.type='button';
      btn.addEventListener('click',()=>setDetail(row));
      action.append(btn);
      tr.append(identity,contact,rec,el('td','',fmtDate(row.created_at)),mail,action);
      tbody.append(tr);
    }
    if(!filtered.length){
      const tr=el('tr'),td=el('td','phxv9-empty',state.loaded?'Nenhum diagnóstico encontrado nesta página.':'Abra esta seção e clique em Atualizar para consultar o banco.');
      td.colSpan=6;tr.append(td);tbody.append(tr);
    }
    $('phxDiagV9Count').textContent=state.loaded?state.total+' diagnóstico(s) acessíveis • página '+(state.page+1):'Nenhum dado carregado';
    $('phxDiagV9Prev').disabled=state.loading||state.page===0;
    $('phxDiagV9Next').disabled=state.loading||(state.page+1)*state.pageSize>=state.total;
  }
  async function load(page=0){
    const db=client();
    if(state.loading)return;
    if(!db){notice('O Supabase do ADM não está disponível.',true);return;}
    state.loading=true;
    $('phxDiagV9Refresh').disabled=true;
    setDetail(null);
    notice('Consultando registros estruturados com as permissões da sua conta...');
    try{
      const auth=await db.auth.getUser();
      if(auth.error||!auth.data?.user)throw Error('Faça login no ADM oficial para visualizar os diagnósticos.');
      const from=page*state.pageSize,to=from+state.pageSize-1;
      const {data,error,count}=await db.from('phoenix_diagnostic_submissions')
        .select('submission_id,created_at,contact,company,answers,analysis,commercial,crm_status,delivery_status,delivery_attempts,delivery_last_error,delivery_sent_at',{count:'exact'})
        .order('created_at',{ascending:false}).range(from,to);
      if(error)throw error;
      state.rows=Array.isArray(data)?data:[];
      state.total=Number.isFinite(count)?count:state.rows.length;
      state.page=page;state.loaded=true;
      notice(state.total?state.total+' registro(s) disponíveis. Fichas V9 em leitura, sem alterar o CRM.':'Ainda não existem registros V9 disponíveis para esta conta.');
    }catch(err){
      state.rows=[];state.total=0;state.loaded=false;
      notice('Não foi possível consultar os diagnósticos: '+String(err?.message||err),true);
    }finally{state.loading=false;$('phxDiagV9Refresh').disabled=false;render();}
  }
  root.addEventListener('toggle',()=>{if(root.open&&!state.loaded)load(0);});
  $('phxDiagV9Refresh').addEventListener('click',()=>load(0));
  $('phxDiagV9Prev').addEventListener('click',()=>load(Math.max(0,state.page-1)));
  $('phxDiagV9Next').addEventListener('click',()=>load(state.page+1));
  $('phxDiagV9Search').addEventListener('input',render);
  $('phxDiagV9Delivery').addEventListener('change',render);
  if(client()?.auth?.onAuthStateChange){
    client().auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_OUT'){
        state.rows=[];state.total=0;state.page=0;state.loaded=false;
        root.open=false;
        setDetail(null);
        notice('Abra a seção após entrar no ADM.');
        render();
      }
    });
  }
  render();
})();