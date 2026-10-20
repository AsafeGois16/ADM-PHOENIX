# Phoenix Talent no ADM — alteração para revisão

## O que a aba inclui
- Acesso apenas para usuários com registro ativo em `public.phoenix_talent_staff` (gestor, recrutador ou leitor).
- Cadastro de vagas, emissão de convites individuais, lista de candidaturas e fichas.
- Ranking ipsativo de preferências DISC, evidências para entrevista, parecer exploratório e PDF.
- Nenhuma aprovação/reprovação automática, nem comparações de candidatos por pontuação.

## Dependências
1. Migrações já aplicadas ao Supabase da Phoenix no projeto ativo `LEADS_PHOENIX INSURANCE`: tabelas `phoenix_talent_*` com RLS e retenção de 180 dias para candidaturas.
2. Edge Function `phoenix-talent-api` ativa, com envios públicos somente mediante token aleatório e operações do RH mediante JWT de usuário autorizado.
3. Repositório privado do formulário `AsafeGois16/phoenix-tallent` já publicado: **https://phoenix-tallent.vercel.app/**. Metadados Vercel confirmam implantação READY com GitHub main; a leitura direta/administração pelo conector segue limitada por 403 da equipe, portanto o fluxo de candidatura ainda requer teste de ponta a ponta.
4. Para ativar IA, configurar segredo `OPENAI_API_KEY` no Supabase Edge Functions → Secrets; sem a chave, o botão retorna orientação de configuração. Não inserir chaves em GitHub.
5. Um gestor já foi autorizado por seu papel ativo em `phoenix_profiles`. A concessão de demais acessos é explícita pela tabela `phoenix_talent_staff`.

## Verificações antes do merge
- Confirmar que a aba 'Recrutamento · Talent' abre sem exibir dados do CRM comercial.
- Voltar para Evento, Inteligência Comercial, Base e Novembro Azul sem sobreposição de telas.
- Gerar vaga fictícia, convite nominal usando automaticamente `https://phoenix-tallent.vercel.app/` e enviar avaliação de teste; confirmar que o ADM recebeu o resultado no Supabase.
- Conferir gráfico DISC, registrar entrevista e exportar PDF.
- Testar o agente somente após inserir `OPENAI_API_KEY` e revisar qualidade de texto.
- Realizar revisão de privacidade/aviso ao candidato, adequação da base legal e política de conservação.
- Verificar autorização de RH e tratamento de pedidos de exclusão, inclusive necessidade de prorrogação de retenção quando legalmente cabível.

## Reversão
A alteração do ADM adiciona apenas `talent_module.js`, `talent_module.css` e duas referências a eles em `index.html`. Removendo as duas referências da página, o ADM volta ao layout anterior, sem afetar dados existentes. Nenhuma tabela de leads foi modificada.
