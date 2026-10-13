PHOENIX EXPERIENCE | ADM Phoenix Intelligence
=========================================
Versão preparada: ADM V9.3 + módulo Phoenix Experience HBR.

ARQUIVOS
- index.html: arquivo completo da versão do ADM V9.3 com nova aba Phoenix Experience.
  CSS e JavaScript do novo módulo já estão incorporados nesse HTML.
- experience_panel.html: bloco HTML separado para atualização manual em repositórios mais recentes.
- experience_module.css: CSS independente, prefixado em pxe-.
- experience_module.js: JS independente (usa a sessão Supabase Auth do ADM).
- vercel.json: parâmetros básicos de rotas limpas, opcionais.
- previews: imagens do layout.

COMO PUBLICAR VIA GITHUB + VERCEL
1. CONFIRA se o HTML atual em seu GitHub corresponde à base ADM V9.3. Faça um commit/backup da versão publicada antes de alterar.
2. Se for o mesmo ADM V9.3, substitua SOMENTE o index.html do ADM pelo arquivo deste pacote.
   Não use este pacote na landing page pública do Giro da Sorte HBR. O ADM e a landing são projetos diferentes.
3. Se o ADM do GitHub for mais recente, NÃO substitua o index.html inteiro: integre o painel, CSS e JS isolados nos pontos indicados abaixo; ou envie o HTML novo para uma branch separada para revisão.
4. Faça o deploy Preview, entre com um usuário Phoenix autorizado, acesse a aba Phoenix Experience e teste leitura e filtros; depois publique em produção.
5. Não inclua chaves secretas de service_role ou senhas no repositório.

COMO INTEGRAR MANUALMENTE NUM HTML MAIS NOVO
A) Inclua o conteúdo de experience_module.css dentro do <style> ou em CSS separado.
B) Inclua experience_panel.html dentro do dashboard, imediatamente ANTES da section id="eventView".
C) No menu de abas, adicione um botão id="v7TabExperience" que chame setPainelV7('experience').
D) Atualize a função setPainelV7 para controlar experienceView.hidden e o estado do botão.
E) Ao abrir o painel, chame window.PXExperience.open(), e ao sair, .close().
F) Cole experience_module.js ao final do <body>, depois dos scripts atuais; o código usa o 'sb' do admin.

O QUE JÁ FUNCIONA NA VERSÃO DO PACOTE
- Acesso por login do ADM Phoenix e RLS já existente.
- Leitura da tabela hbr_giro_inscricoes no Supabase.
- Atualização automática a cada 15s enquanto a aba estiver aberta (não depende de F5).
- Indicadores de cadastros, elegibilidade, resultados da roleta e autorizações de contato.
- Filtros, consulta por nome/telefone/e-mail/código, exportação CSV geral e elegíveis.
- Ações para validar/rejeitar participantes, com sincronização de status já disponível no Supabase.
- Registro operacional de brindes entregues e descontos encaminhados por observacoes da inscrição.

LIMITAÇÕES / ANTES DE USAR NO SORTEIO
- A atualização do banco com novas tabelas independentes para múltiplas campanhas, entregas auditáveis, fechamento do evento e congelamento imutável da lista NÃO foi aplicada: houve bloqueio da ferramenta para essa operação.
- Portanto, este piloto usa os registros HBR existentes e observacoes para a entrega de brindes. Novas campanhas ainda exigem configuração do backend; a interface sinaliza isso.
- A exportação CSV de elegíveis NÃO é um sorteio nem congela participantes no servidor; caso o regulamento exija uma lista imutável, interrompa as inscrições antes da exportação e adote procedimento de auditoria adequado.
- A animação da landing é somente uma confirmação visual.
- A elegibilidade técnica não comprova que o e-mail ou número pertence ao participante.
- Sorteio publicitário e a própria roleta com vantagens aleatórias podem necessitar autorização legal prévia no Brasil. Consulte o responsável jurídico/regulatório da Phoenix antes de executar a promoção.
- Somente leads que marcaram a opção de marketing devem receber comunicação comercial baseada nessa autorização; os outros podem constar no cadastro exclusivamente para execução da ação.

INTEGRAÇÃO EXISTENTE PRESERVADA
- Supabase: cxyxrhmpjehrqhwihxul (mesmo projeto da Phoenix).
- Nenhuma alteração no Banco realizada ao gerar este pacote.
- A landing pública da HBR continua no projeto separado; não precisa ser republicada para essa atualização do ADM.
