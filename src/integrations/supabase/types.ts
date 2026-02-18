export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          acao: string
          created_at: string | null
          descricao: string | null
          detalhes: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      alertas_descartados: {
        Row: {
          descartado_em: string | null
          expira_em: string
          id: string
          personal_id: string
          referencia_id: string
          tipo_alerta: string
        }
        Insert: {
          descartado_em?: string | null
          expira_em: string
          id?: string
          personal_id: string
          referencia_id: string
          tipo_alerta: string
        }
        Update: {
          descartado_em?: string | null
          expira_em?: string
          id?: string
          personal_id?: string
          referencia_id?: string
          tipo_alerta?: string
        }
        Relationships: []
      }
      anamnese_inicial: {
        Row: {
          acompanhamento_nutricional: string | null
          alergia: string | null
          altura: number | null
          bebe: string | null
          cirurgias: string | null
          compromisso_treinos: number | null
          consumo_agua: string | null
          created_at: string | null
          crianca_obesa: boolean | null
          data_nascimento: string | null
          diabetes: string | null
          dores_lesoes: string | null
          exercicio_atual: string | null
          exercicios_gosta: string | null
          exercicios_odeia: string | null
          experiencia_online: string | null
          frequencia_exercicio: string | null
          fuma: string | null
          horas_sono: string | null
          id: string
          local_treino: string | null
          materiais_disponiveis: string | null
          medicamentos: string | null
          nutri_nome: string | null
          objetivos: string
          observacoes_extras: string | null
          personal_id: string
          peso_atual: number | null
          peso_desejado: number | null
          preenchida_em: string | null
          preferencia_exercicio: string | null
          pressao_arterial: string | null
          problema_coracao: string | null
          problema_respiratorio: string | null
          profile_id: string
          profissao: string | null
          qualidade_sono: string | null
          refeicoes_dia: number | null
          restricao_medica: string | null
          rotina: string | null
          rotina_alimentar: string | null
          suplementos: string | null
          tempo_disponivel: string | null
          updated_at: string | null
        }
        Insert: {
          acompanhamento_nutricional?: string | null
          alergia?: string | null
          altura?: number | null
          bebe?: string | null
          cirurgias?: string | null
          compromisso_treinos?: number | null
          consumo_agua?: string | null
          created_at?: string | null
          crianca_obesa?: boolean | null
          data_nascimento?: string | null
          diabetes?: string | null
          dores_lesoes?: string | null
          exercicio_atual?: string | null
          exercicios_gosta?: string | null
          exercicios_odeia?: string | null
          experiencia_online?: string | null
          frequencia_exercicio?: string | null
          fuma?: string | null
          horas_sono?: string | null
          id?: string
          local_treino?: string | null
          materiais_disponiveis?: string | null
          medicamentos?: string | null
          nutri_nome?: string | null
          objetivos: string
          observacoes_extras?: string | null
          personal_id: string
          peso_atual?: number | null
          peso_desejado?: number | null
          preenchida_em?: string | null
          preferencia_exercicio?: string | null
          pressao_arterial?: string | null
          problema_coracao?: string | null
          problema_respiratorio?: string | null
          profile_id: string
          profissao?: string | null
          qualidade_sono?: string | null
          refeicoes_dia?: number | null
          restricao_medica?: string | null
          rotina?: string | null
          rotina_alimentar?: string | null
          suplementos?: string | null
          tempo_disponivel?: string | null
          updated_at?: string | null
        }
        Update: {
          acompanhamento_nutricional?: string | null
          alergia?: string | null
          altura?: number | null
          bebe?: string | null
          cirurgias?: string | null
          compromisso_treinos?: number | null
          consumo_agua?: string | null
          created_at?: string | null
          crianca_obesa?: boolean | null
          data_nascimento?: string | null
          diabetes?: string | null
          dores_lesoes?: string | null
          exercicio_atual?: string | null
          exercicios_gosta?: string | null
          exercicios_odeia?: string | null
          experiencia_online?: string | null
          frequencia_exercicio?: string | null
          fuma?: string | null
          horas_sono?: string | null
          id?: string
          local_treino?: string | null
          materiais_disponiveis?: string | null
          medicamentos?: string | null
          nutri_nome?: string | null
          objetivos?: string
          observacoes_extras?: string | null
          personal_id?: string
          peso_atual?: number | null
          peso_desejado?: number | null
          preenchida_em?: string | null
          preferencia_exercicio?: string | null
          pressao_arterial?: string | null
          problema_coracao?: string | null
          problema_respiratorio?: string | null
          profile_id?: string
          profissao?: string | null
          qualidade_sono?: string | null
          refeicoes_dia?: number | null
          restricao_medica?: string | null
          rotina?: string | null
          rotina_alimentar?: string | null
          suplementos?: string | null
          tempo_disponivel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnese_inicial_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnese_inicial_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "anamnese_inicial_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnese_inicial_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string | null
          data_cancelamento: string | null
          data_fim: string | null
          data_inicio: string
          forma_pagamento: string | null
          id: string
          motivo_cancelamento: string | null
          personal_id: string
          plano_id: string
          status: string
          trial: boolean | null
          trial_fim: string | null
          updated_at: string | null
          valor_mensal: number
        }
        Insert: {
          created_at?: string | null
          data_cancelamento?: string | null
          data_fim?: string | null
          data_inicio?: string
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          personal_id: string
          plano_id: string
          status: string
          trial?: boolean | null
          trial_fim?: string | null
          updated_at?: string | null
          valor_mensal: number
        }
        Update: {
          created_at?: string | null
          data_cancelamento?: string | null
          data_fim?: string | null
          data_inicio?: string
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          personal_id?: string
          plano_id?: string
          status?: string
          trial?: boolean | null
          trial_fim?: string | null
          updated_at?: string | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_fisicas: {
        Row: {
          abdomen: number | null
          altura: number | null
          antebraco_direito: number | null
          antebraco_esquerdo: number | null
          braco_direito: number | null
          braco_esquerdo: number | null
          cintura: number | null
          coxa_direita: number | null
          coxa_esquerda: number | null
          created_at: string | null
          data_avaliacao: string
          id: string
          imc: number | null
          massa_magra: number | null
          objetivo: string | null
          observacoes: string | null
          ombro: number | null
          panturrilha_direita: number | null
          panturrilha_esquerda: number | null
          percentual_gordura: number | null
          personal_id: string
          pescoco: number | null
          peso: number | null
          profile_id: string
          quadril: number | null
          torax: number | null
          updated_at: string | null
        }
        Insert: {
          abdomen?: number | null
          altura?: number | null
          antebraco_direito?: number | null
          antebraco_esquerdo?: number | null
          braco_direito?: number | null
          braco_esquerdo?: number | null
          cintura?: number | null
          coxa_direita?: number | null
          coxa_esquerda?: number | null
          created_at?: string | null
          data_avaliacao?: string
          id?: string
          imc?: number | null
          massa_magra?: number | null
          objetivo?: string | null
          observacoes?: string | null
          ombro?: number | null
          panturrilha_direita?: number | null
          panturrilha_esquerda?: number | null
          percentual_gordura?: number | null
          personal_id: string
          pescoco?: number | null
          peso?: number | null
          profile_id: string
          quadril?: number | null
          torax?: number | null
          updated_at?: string | null
        }
        Update: {
          abdomen?: number | null
          altura?: number | null
          antebraco_direito?: number | null
          antebraco_esquerdo?: number | null
          braco_direito?: number | null
          braco_esquerdo?: number | null
          cintura?: number | null
          coxa_direita?: number | null
          coxa_esquerda?: number | null
          created_at?: string | null
          data_avaliacao?: string
          id?: string
          imc?: number | null
          massa_magra?: number | null
          objetivo?: string | null
          observacoes?: string | null
          ombro?: number | null
          panturrilha_direita?: number | null
          panturrilha_esquerda?: number | null
          percentual_gordura?: number | null
          personal_id?: string
          pescoco?: number | null
          peso?: number | null
          profile_id?: string
          quadril?: number | null
          torax?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fisicas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "avaliacoes_fisicas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fisicas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      bloco_templates: {
        Row: {
          config_alongamento: Json | null
          config_aquecimento: Json | null
          config_cardio: Json | null
          config_outro: Json | null
          created_at: string | null
          descricao: string | null
          duracao_estimada_minutos: number | null
          id: string
          nome: string
          personal_id: string
          posicao: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          nome: string
          personal_id: string
          posicao?: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          nome?: string
          personal_id?: string
          posicao?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloco_templates_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloco_templates_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      blocos_treino: {
        Row: {
          concluido: boolean | null
          concluido_em: string | null
          config_alongamento: Json | null
          config_aquecimento: Json | null
          config_cardio: Json | null
          config_outro: Json | null
          created_at: string | null
          deleted_at: string | null
          descricao: string | null
          duracao_estimada_minutos: number | null
          id: string
          nome: string
          obrigatorio: boolean | null
          ordem: number
          posicao: string
          tipo: string
          treino_semanal_id: string
          updated_at: string | null
        }
        Insert: {
          concluido?: boolean | null
          concluido_em?: string | null
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          nome: string
          obrigatorio?: boolean | null
          ordem?: number
          posicao?: string
          tipo: string
          treino_semanal_id: string
          updated_at?: string | null
        }
        Update: {
          concluido?: boolean | null
          concluido_em?: string | null
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          ordem?: number
          posicao?: string
          tipo?: string
          treino_semanal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocos_treino_treino_semanal_id_fkey"
            columns: ["treino_semanal_id"]
            isOneToOne: false
            referencedRelation: "treinos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins_semanais: {
        Row: {
          ano: number
          comentario_saude: string | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          dores_corpo: string | null
          duvidas: string | null
          estado_emocional: string | null
          id: string
          justificativa_alimentacao: string | null
          justificativa_empenho: string | null
          justificativa_sono: string | null
          mudanca_rotina: string | null
          nivel_dificuldade: number | null
          nota_alimentacao: number | null
          nota_empenho: number | null
          nota_sono: number | null
          numero_semana: number
          personal_id: string
          peso_atual: number | null
          preenchido_em: string | null
          profile_id: string
          qualidade_vida: number | null
          saude_geral: number | null
          semana_planejamento: string | null
        }
        Insert: {
          ano: number
          comentario_saude?: string | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          dores_corpo?: string | null
          duvidas?: string | null
          estado_emocional?: string | null
          id?: string
          justificativa_alimentacao?: string | null
          justificativa_empenho?: string | null
          justificativa_sono?: string | null
          mudanca_rotina?: string | null
          nivel_dificuldade?: number | null
          nota_alimentacao?: number | null
          nota_empenho?: number | null
          nota_sono?: number | null
          numero_semana: number
          personal_id: string
          peso_atual?: number | null
          preenchido_em?: string | null
          profile_id: string
          qualidade_vida?: number | null
          saude_geral?: number | null
          semana_planejamento?: string | null
        }
        Update: {
          ano?: number
          comentario_saude?: string | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          dores_corpo?: string | null
          duvidas?: string | null
          estado_emocional?: string | null
          id?: string
          justificativa_alimentacao?: string | null
          justificativa_empenho?: string | null
          justificativa_sono?: string | null
          mudanca_rotina?: string | null
          nivel_dificuldade?: number | null
          nota_alimentacao?: number | null
          nota_empenho?: number | null
          nota_sono?: number | null
          numero_semana?: number
          personal_id?: string
          peso_atual?: number | null
          preenchido_em?: string | null
          profile_id?: string
          qualidade_vida?: number | null
          saude_geral?: number | null
          semana_planejamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_semanais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_semanais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "checkins_semanais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_semanais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      configuracao_checkins: {
        Row: {
          bloquear_treinos: boolean | null
          checkin_obrigatorio: boolean | null
          created_at: string | null
          dia_semana_limite: number | null
          dias_antecedencia_lembrete: number | null
          enviar_lembrete: boolean | null
          id: string
          personal_id: string
          updated_at: string | null
        }
        Insert: {
          bloquear_treinos?: boolean | null
          checkin_obrigatorio?: boolean | null
          created_at?: string | null
          dia_semana_limite?: number | null
          dias_antecedencia_lembrete?: number | null
          enviar_lembrete?: boolean | null
          id?: string
          personal_id: string
          updated_at?: string | null
        }
        Update: {
          bloquear_treinos?: boolean | null
          checkin_obrigatorio?: boolean | null
          created_at?: string | null
          dia_semana_limite?: number | null
          dias_antecedencia_lembrete?: number | null
          enviar_lembrete?: boolean | null
          id?: string
          personal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_checkins_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracao_checkins_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      exercicios: {
        Row: {
          carga: string | null
          concluido: boolean | null
          created_at: string
          deleted_at: string | null
          descanso: number | null
          descanso_entre_grupos: number | null
          exercise_library_id: string | null
          grupo_id: string | null
          id: string
          link_video: string | null
          nome: string
          observacoes: string | null
          ordem: number
          ordem_no_grupo: number | null
          peso_executado: string | null
          repeticoes: string | null
          series: number | null
          tipo_agrupamento: string | null
          treino_semanal_id: string
          updated_at: string
        }
        Insert: {
          carga?: string | null
          concluido?: boolean | null
          created_at?: string
          deleted_at?: string | null
          descanso?: number | null
          descanso_entre_grupos?: number | null
          exercise_library_id?: string | null
          grupo_id?: string | null
          id?: string
          link_video?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number
          ordem_no_grupo?: number | null
          peso_executado?: string | null
          repeticoes?: string | null
          series?: number | null
          tipo_agrupamento?: string | null
          treino_semanal_id: string
          updated_at?: string
        }
        Update: {
          carga?: string | null
          concluido?: boolean | null
          created_at?: string
          deleted_at?: string | null
          descanso?: number | null
          descanso_entre_grupos?: number | null
          exercise_library_id?: string | null
          grupo_id?: string | null
          id?: string
          link_video?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          ordem_no_grupo?: number | null
          peso_executado?: string | null
          repeticoes?: string | null
          series?: number | null
          tipo_agrupamento?: string | null
          treino_semanal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercises_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_treino_semanal_id_fkey"
            columns: ["treino_semanal_id"]
            isOneToOne: false
            referencedRelation: "treinos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string | null
          equipamento: string | null
          grupo_muscular: string
          id: string
          imagem_thumbnail: string | null
          is_global: boolean | null
          link_youtube: string | null
          nivel_dificuldade: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          equipamento?: string | null
          grupo_muscular: string
          id?: string
          imagem_thumbnail?: string | null
          is_global?: boolean | null
          link_youtube?: string | null
          nivel_dificuldade?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          equipamento?: string | null
          grupo_muscular?: string
          id?: string
          imagem_thumbnail?: string | null
          is_global?: boolean | null
          link_youtube?: string | null
          nivel_dificuldade?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      fotos_evolucao: {
        Row: {
          avaliacao_id: string
          created_at: string | null
          descricao: string | null
          foto_nome: string
          foto_url: string
          id: string
          personal_id: string
          profile_id: string
          tipo_foto: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string | null
          descricao?: string | null
          foto_nome: string
          foto_url: string
          id?: string
          personal_id: string
          profile_id: string
          tipo_foto: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string | null
          descricao?: string | null
          foto_nome?: string
          foto_url?: string
          id?: string
          personal_id?: string
          profile_id?: string
          tipo_foto?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_evolucao_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_evolucao_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_evolucao_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fotos_evolucao_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_evolucao_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      materiais: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          created_at: string | null
          descricao: string | null
          id: string
          personal_id: string
          profile_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          personal_id: string
          profile_id: string
          tipo: string
          titulo: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          personal_id?: string
          profile_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "materiais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      modelo_pastas: {
        Row: {
          caminho: string | null
          cor: string | null
          created_at: string | null
          id: string
          nivel: number | null
          nome: string
          ordem: number | null
          parent_id: string | null
          personal_id: string
          updated_at: string | null
        }
        Insert: {
          caminho?: string | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome: string
          ordem?: number | null
          parent_id?: string | null
          personal_id: string
          updated_at?: string | null
        }
        Update: {
          caminho?: string | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          ordem?: number | null
          parent_id?: string | null
          personal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelo_pastas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "modelo_pastas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_pastas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_pastas_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          dados: Json | null
          destinatario_id: string | null
          id: string
          lida: boolean | null
          mensagem: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          dados?: Json | null
          destinatario_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          dados?: Json | null
          destinatario_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          assinatura_id: string
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          personal_id: string
          referencia_externa: string | null
          status: string
          valor: number
        }
        Insert: {
          assinatura_id: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          personal_id: string
          referencia_externa?: string | null
          status: string
          valor: number
        }
        Update: {
          assinatura_id?: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          personal_id?: string
          referencia_externa?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      payment_history: {
        Row: {
          created_at: string | null
          data_pagamento: string
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          personal_id: string
          student_id: string
          subscription_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_pagamento: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          personal_id: string
          student_id: string
          subscription_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          data_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          personal_id?: string
          student_id?: string
          subscription_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payment_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_settings: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          logo_url: string | null
          personal_id: string
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          logo_url?: string | null
          personal_id: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          logo_url?: string | null
          personal_id?: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_settings_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_settings_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      planilhas_treino: {
        Row: {
          created_at: string | null
          data_inicio: string
          data_prevista_fim: string | null
          duracao_semanas: number
          id: string
          lembrete_enviado_3dias: boolean | null
          lembrete_enviado_7dias: boolean | null
          lembrete_enviado_expirou: boolean | null
          nome: string
          observacoes: string | null
          personal_id: string
          profile_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_inicio?: string
          data_prevista_fim?: string | null
          duracao_semanas?: number
          id?: string
          lembrete_enviado_3dias?: boolean | null
          lembrete_enviado_7dias?: boolean | null
          lembrete_enviado_expirou?: boolean | null
          nome?: string
          observacoes?: string | null
          personal_id: string
          profile_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_inicio?: string
          data_prevista_fim?: string | null
          duracao_semanas?: number
          id?: string
          lembrete_enviado_3dias?: boolean | null
          lembrete_enviado_7dias?: boolean | null
          lembrete_enviado_expirou?: boolean | null
          nome?: string
          observacoes?: string | null
          personal_id?: string
          profile_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planilhas_treino_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilhas_treino_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "planilhas_treino_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilhas_treino_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          features: Json | null
          id: string
          max_alunos: number | null
          nome: string
          preco_mensal: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          features?: Json | null
          id?: string
          max_alunos?: number | null
          nome: string
          preco_mensal: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          features?: Json | null
          id?: string
          max_alunos?: number | null
          nome?: string
          preco_mensal?: number
        }
        Relationships: []
      }
      produtos_personal: {
        Row: {
          arquivo_url: string | null
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number | null
          personal_id: string
          preco: number
          preco_promocional: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number | null
          personal_id: string
          preco?: number
          preco_promocional?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number | null
          personal_id?: string
          preco?: number
          preco_promocional?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          nome: string
          personal_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean
          nome: string
          personal_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          nome?: string
          personal_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      student_access_logs: {
        Row: {
          changed_by: string
          created_at: string | null
          from_active: boolean | null
          id: string
          student_id: string
          to_active: boolean | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          from_active?: boolean | null
          id?: string
          student_id: string
          to_active?: boolean | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          from_active?: boolean | null
          id?: string
          student_id?: string
          to_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_access_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          data_expiracao: string
          data_pagamento: string | null
          id: string
          observacoes: string | null
          personal_id: string
          plano: string
          status_pagamento: string
          student_id: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_expiracao: string
          data_pagamento?: string | null
          id?: string
          observacoes?: string | null
          personal_id: string
          plano: string
          status_pagamento?: string
          student_id: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_expiracao?: string
          data_pagamento?: string | null
          id?: string
          observacoes?: string | null
          personal_id?: string
          plano?: string
          status_pagamento?: string
          student_id?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      treino_descansos: {
        Row: {
          created_at: string | null
          duracao_segundos: number | null
          fim: string | null
          id: string
          inicio: string
          sessao_id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          sessao_id: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          sessao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "treino_descansos_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "treino_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      treino_modelo_blocos: {
        Row: {
          config_alongamento: Json | null
          config_aquecimento: Json | null
          config_cardio: Json | null
          config_outro: Json | null
          created_at: string | null
          descricao: string | null
          duracao_estimada_minutos: number | null
          id: string
          intensidade: string | null
          modelo_id: string
          nome: string
          observacoes: string | null
          ordem: number
          posicao: string
          tipo: string
        }
        Insert: {
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          intensidade?: string | null
          modelo_id: string
          nome: string
          observacoes?: string | null
          ordem?: number
          posicao?: string
          tipo: string
        }
        Update: {
          config_alongamento?: Json | null
          config_aquecimento?: Json | null
          config_cardio?: Json | null
          config_outro?: Json | null
          created_at?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          id?: string
          intensidade?: string | null
          modelo_id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          posicao?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "treino_modelo_blocos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "treino_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      treino_modelo_exercicios: {
        Row: {
          carga: string | null
          created_at: string | null
          descanso: number
          descanso_entre_grupos: number | null
          exercicio_id: string | null
          grupo_id: string | null
          id: string
          link_video: string | null
          modelo_id: string
          nome: string
          observacoes: string | null
          ordem: number
          ordem_no_grupo: number | null
          repeticoes: string
          series: number
          tipo_agrupamento: string | null
        }
        Insert: {
          carga?: string | null
          created_at?: string | null
          descanso?: number
          descanso_entre_grupos?: number | null
          exercicio_id?: string | null
          grupo_id?: string | null
          id?: string
          link_video?: string | null
          modelo_id: string
          nome: string
          observacoes?: string | null
          ordem?: number
          ordem_no_grupo?: number | null
          repeticoes?: string
          series?: number
          tipo_agrupamento?: string | null
        }
        Update: {
          carga?: string | null
          created_at?: string | null
          descanso?: number
          descanso_entre_grupos?: number | null
          exercicio_id?: string | null
          grupo_id?: string | null
          id?: string
          link_video?: string | null
          modelo_id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          ordem_no_grupo?: number | null
          repeticoes?: string
          series?: number
          tipo_agrupamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treino_modelo_exercicios_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_modelo_exercicios_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_agrupados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_modelo_exercicios_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "treino_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      treino_modelos: {
        Row: {
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          pasta_id: string | null
          personal_id: string
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          pasta_id?: string | null
          personal_id: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          pasta_id?: string | null
          personal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treino_modelos_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "modelo_pastas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_modelos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_modelos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      treino_semana_ativa: {
        Row: {
          created_at: string | null
          id: string
          personal_id: string
          profile_id: string
          semana_inicio: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          personal_id: string
          profile_id: string
          semana_inicio: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          personal_id?: string
          profile_id?: string
          semana_inicio?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treino_semana_ativa_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_semana_ativa_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "treino_semana_ativa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_semana_ativa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      treino_sessoes: {
        Row: {
          created_at: string | null
          duracao_segundos: number | null
          fim: string | null
          id: string
          inicio: string | null
          observacoes: string | null
          pausado_em: string | null
          personal_id: string | null
          profile_id: string | null
          status: string | null
          tempo_descanso_total: number | null
          tempo_pausado_total: number | null
          treino_semanal_id: string | null
        }
        Insert: {
          created_at?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string | null
          observacoes?: string | null
          pausado_em?: string | null
          personal_id?: string | null
          profile_id?: string | null
          status?: string | null
          tempo_descanso_total?: number | null
          tempo_pausado_total?: number | null
          treino_semanal_id?: string | null
        }
        Update: {
          created_at?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string | null
          observacoes?: string | null
          pausado_em?: string | null
          personal_id?: string | null
          profile_id?: string | null
          status?: string | null
          tempo_descanso_total?: number | null
          tempo_pausado_total?: number | null
          treino_semanal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treino_sessoes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_sessoes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "treino_sessoes_treino_semanal_id_fkey"
            columns: ["treino_semanal_id"]
            isOneToOne: false
            referencedRelation: "treinos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos_semanais: {
        Row: {
          concluido: boolean
          created_at: string
          descricao: string | null
          dia_semana: number
          id: string
          modelo_id: string | null
          nome_modelo: string | null
          nome_treino: string | null
          observacoes: string | null
          ordem_no_dia: number | null
          personal_id: string
          profile_id: string
          semana: string
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          descricao?: string | null
          dia_semana: number
          id?: string
          modelo_id?: string | null
          nome_modelo?: string | null
          nome_treino?: string | null
          observacoes?: string | null
          ordem_no_dia?: number | null
          personal_id: string
          profile_id: string
          semana: string
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          descricao?: string | null
          dia_semana?: number
          id?: string
          modelo_id?: string | null
          nome_modelo?: string | null
          nome_treino?: string | null
          observacoes?: string | null
          ordem_no_dia?: number | null
          personal_id?: string
          profile_id?: string
          semana?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinos_semanais_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "treino_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_semanais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_semanais_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "treinos_semanais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_semanais_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      estatisticas_blocos: {
        Row: {
          blocos_concluidos: number | null
          blocos_por_tipo: Json | null
          duracao_total_minutos: number | null
          total_blocos: number | null
          treino_semanal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocos_treino_treino_semanal_id_fkey"
            columns: ["treino_semanal_id"]
            isOneToOne: false
            referencedRelation: "treinos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios_agrupados: {
        Row: {
          carga: string | null
          concluido: boolean | null
          created_at: string | null
          deleted_at: string | null
          descanso: number | null
          descanso_entre_grupos: number | null
          esta_agrupado: boolean | null
          grupo_id: string | null
          id: string | null
          link_video: string | null
          nome: string | null
          observacoes: string | null
          ordem: number | null
          ordem_no_grupo: number | null
          repeticoes: string | null
          series: number | null
          tipo_agrupamento: string | null
          total_no_grupo: number | null
          treino_semanal_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_treino_semanal_id_fkey"
            columns: ["treino_semanal_id"]
            isOneToOne: false
            referencedRelation: "treinos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      v_metricas_dashboard: {
        Row: {
          assinaturas_ativas: number | null
          assinaturas_trial: number | null
          cancelamentos_mes_atual: number | null
          mrr_total: number | null
          novos_personals_mes: number | null
          receita_mes_atual: number | null
          total_alunos: number | null
          total_personals: number | null
        }
        Relationships: []
      }
      v_status_checkins: {
        Row: {
          anamnese_preenchida: boolean | null
          checkin_semanal_feito: boolean | null
          email: string | null
          nome: string | null
          personal_id: string | null
          profile_id: string | null
          total_checkins: number | null
          ultimo_checkin: string | null
        }
        Insert: {
          anamnese_preenchida?: never
          checkin_semanal_feito?: never
          email?: string | null
          nome?: string | null
          personal_id?: string | null
          profile_id?: string | null
          total_checkins?: never
          ultimo_checkin?: never
        }
        Update: {
          anamnese_preenchida?: never
          checkin_semanal_feito?: never
          email?: string | null
          nome?: string | null
          personal_id?: string | null
          profile_id?: string | null
          total_checkins?: never
          ultimo_checkin?: never
        }
        Relationships: [
          {
            foreignKeyName: "profiles_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "v_status_checkins"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Functions: {
      calcular_churn_mensal: {
        Args: { mes_referencia?: string }
        Returns: {
          assinaturas_inicio: number
          cancelamentos: number
          mes: string
          taxa_churn: number
        }[]
      }
      calcular_duracao_treino: {
        Args: { p_treino_semanal_id: string }
        Returns: number
      }
      check_user_has_role: {
        Args: {
          _user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      criar_bloco_de_template: {
        Args: {
          p_posicao?: string
          p_template_id: string
          p_treino_semanal_id: string
        }
        Returns: string
      }
      criar_grupo_exercicios: {
        Args: {
          p_descanso_entre_grupos?: number
          p_exercicios: Json
          p_tipo_agrupamento: string
          p_treino_id: string
        }
        Returns: string
      }
      deletar_grupo_exercicios: {
        Args: { p_grupo_id: string }
        Returns: undefined
      }
      get_user_personal_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_personal: { Args: { _user_id: string }; Returns: boolean }
      marcar_bloco_concluido: {
        Args: { p_bloco_id: string; p_concluido: boolean }
        Returns: undefined
      }
      obter_blocos_organizados: {
        Args: { p_treino_semanal_id: string }
        Returns: {
          blocos: Json
          posicao: string
        }[]
      }
      obter_exercicios_com_grupos: {
        Args: { p_treino_id: string }
        Returns: {
          descanso_entre_grupos: number
          exercicios: Json
          grupo_id: string
          ordem: number
          tipo_agrupamento: string
        }[]
      }
      reordenar_blocos: {
        Args: {
          p_ordem_ids: string[]
          p_posicao: string
          p_treino_semanal_id: string
        }
        Returns: undefined
      }
      update_subscription_status: { Args: never; Returns: undefined }
      verificar_anamnese_preenchida: {
        Args: { p_personal_id: string; p_profile_id: string }
        Returns: boolean
      }
      verificar_checkin_semanal: {
        Args: { p_personal_id: string; p_profile_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "personal" | "aluno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "personal", "aluno"],
    },
  },
} as const
