-- Fix: Recreate all 4 views with security_invoker=on
-- This ensures they respect RLS policies of the calling user

-- 1. estatisticas_blocos
DROP VIEW IF EXISTS public.estatisticas_blocos;
CREATE VIEW public.estatisticas_blocos
WITH (security_invoker=on) AS
SELECT treino_semanal_id,
    sum(total) AS total_blocos,
    sum(concluidos) AS blocos_concluidos,
    sum(duracao_total) AS duracao_total_minutos,
    jsonb_object_agg(tipo, total) AS blocos_por_tipo
FROM (
    SELECT b.treino_semanal_id,
        b.tipo,
        count(*) AS total,
        count(*) FILTER (WHERE b.concluido = true) AS concluidos,
        sum(b.duracao_estimada_minutos) AS duracao_total
    FROM blocos_treino b
    WHERE b.deleted_at IS NULL
    GROUP BY b.treino_semanal_id, b.tipo
) t
GROUP BY treino_semanal_id;

-- 2. exercicios_agrupados
DROP VIEW IF EXISTS public.exercicios_agrupados;
CREATE VIEW public.exercicios_agrupados
WITH (security_invoker=on) AS
SELECT id,
    treino_semanal_id,
    nome,
    link_video,
    ordem,
    created_at,
    updated_at,
    series,
    repeticoes,
    descanso,
    carga,
    observacoes,
    concluido,
    deleted_at,
    grupo_id,
    tipo_agrupamento,
    ordem_no_grupo,
    descanso_entre_grupos,
    CASE WHEN grupo_id IS NOT NULL THEN true ELSE false END AS esta_agrupado,
    count(*) OVER (PARTITION BY grupo_id) AS total_no_grupo
FROM exercicios e
WHERE deleted_at IS NULL
ORDER BY ordem, ordem_no_grupo;

-- 3. v_metricas_dashboard
DROP VIEW IF EXISTS public.v_metricas_dashboard;
CREATE VIEW public.v_metricas_dashboard
WITH (security_invoker=on) AS
SELECT 
    (SELECT count(*) FROM profiles WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.id AND user_roles.role = 'personal'::user_role)) AS total_personals,
    (SELECT count(*) FROM profiles WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.id AND user_roles.role = 'aluno'::user_role)) AS total_alunos,
    (SELECT count(*) FROM assinaturas WHERE assinaturas.status::text = 'ativa') AS assinaturas_ativas,
    (SELECT count(*) FROM assinaturas WHERE assinaturas.status::text = 'trial') AS assinaturas_trial,
    (SELECT COALESCE(sum(assinaturas.valor_mensal), 0) FROM assinaturas WHERE assinaturas.status::text = 'ativa') AS mrr_total,
    (SELECT COALESCE(sum(pagamentos.valor), 0) FROM pagamentos WHERE pagamentos.status::text = 'pago' AND date_trunc('month', pagamentos.data_pagamento) = date_trunc('month', CURRENT_DATE::timestamp with time zone)) AS receita_mes_atual,
    (SELECT count(*) FROM assinaturas WHERE assinaturas.status::text = 'cancelada' AND date_trunc('month', assinaturas.data_cancelamento::timestamp with time zone) = date_trunc('month', CURRENT_DATE::timestamp with time zone)) AS cancelamentos_mes_atual,
    (SELECT count(*) FROM profiles WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.id AND user_roles.role = 'personal'::user_role) AND date_trunc('month', profiles.created_at) = date_trunc('month', CURRENT_DATE::timestamp with time zone)) AS novos_personals_mes;

-- 4. v_status_checkins
DROP VIEW IF EXISTS public.v_status_checkins;
CREATE VIEW public.v_status_checkins
WITH (security_invoker=on) AS
SELECT p.id AS profile_id,
    p.nome,
    p.email,
    p.personal_id,
    verificar_anamnese_preenchida(p.id, p.personal_id) AS anamnese_preenchida,
    verificar_checkin_semanal(p.id, p.personal_id) AS checkin_semanal_feito,
    (SELECT count(*) FROM checkins_semanais cs WHERE cs.profile_id = p.id) AS total_checkins,
    (SELECT cs.preenchido_em FROM checkins_semanais cs WHERE cs.profile_id = p.id ORDER BY cs.preenchido_em DESC LIMIT 1) AS ultimo_checkin
FROM profiles p
WHERE p.personal_id IS NOT NULL;