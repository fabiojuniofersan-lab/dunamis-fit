# Dunamis Fit Gestão

Aplicativo web de gestão da academia Dunamis Fit, com área administrativa e área do aluno.

## Estado atual
A aplicação utiliza **Supabase para autenticação e dados em produção**, com APIs server-side no Vercel para as integrações sensíveis. O login e a recuperação de senha permanecem no fluxo de autenticação existente e não dependem dos módulos financeiros.

## Recursos
- Autenticação de administrador e aluno via Supabase
- Dashboard administrativo
- Cadastro, edição, busca e exclusão de alunos
- Senha de aluno administrada pelo servidor
- Planos de 3, 4 e 5 dias por semana
- Controle de valor, vencimento e forma de pagamento
- Status mensal de pagamento baseado na competência atual
- Confirmação manual de pagamentos
- Histórico financeiro
- Cobrança online via Asaas para Pix/cartão
- Idempotência para evitar cobranças duplicadas
- Webhook Asaas para sincronização de pagamentos
- Cobrança automática preparada três dias antes do vencimento
- Lembrete de vencimento dentro do aplicativo
- Aviso de inadimplência no aplicativo e WhatsApp
- WhatsApp administrativo com templates aprovados
- Central de notificações do administrador
- Notificações deduplicadas
- Perfil do aluno com foto
- Avaliações físicas e histórico de evolução
- IMC calculado automaticamente
- TMB e GET estimados pela fórmula de Mifflin-St Jeor quando sexo e nível de atividade são informados
- Gráfico de evolução do peso
- Administrador pode selecionar qualquer aluno para acompanhar o desenvolvimento
- Interface responsiva para celular e computador

## Automação financeira
As regras principais são:
- **3 dias antes do vencimento:** cobrança fica preparada e o lembrete é exibido dentro do aplicativo; não há WhatsApp nessa etapa.
- **Após o vencimento sem pagamento:** o aluno recebe aviso no aplicativo e WhatsApp, respeitando deduplicação.
- **Pagamento confirmado:** o pagamento é sincronizado no histórico e o status mensal é atualizado.
- A competência mensal é tratada pelo vencimento da cobrança, evitando que um status antigo do aluno bloqueie a competência atual.

## Segurança
- Operações administrativas são protegidas por autenticação e validação de papel.
- Chaves de serviço, Asaas e WhatsApp ficam exclusivamente nas variáveis de ambiente do servidor.
- Webhook Asaas exige token de proteção.
- Tabelas expostas possuem RLS e políticas de acesso por usuário/papel.
- O aluno não pode alterar diretamente seu status financeiro ou dados administrativos.
- Pagamentos e notificações possuem mecanismos de idempotência/deduplicação.

## Arquitetura
O projeto é uma aplicação web estática/JavaScript com camadas independentes de correção e integração. Isso permite evoluir módulos financeiros, desenvolvimento, notificações e interface sem alterar desnecessariamente o núcleo de autenticação.

## Deploy
O projeto é hospedado no Vercel e integrado ao GitHub. As rotinas automáticas utilizam Vercel Cron e exigem `CRON_SECRET`.

## Observação
TMB e GET são estimativas para acompanhamento e não substituem avaliação profissional individualizada.
