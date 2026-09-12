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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apartments: {
        Row: {
          area_sqm: number | null
          block_id: string
          created_at: string
          floor: number | null
          id: string
          monthly_fee: number | null
          number: string
          updated_at: string
        }
        Insert: {
          area_sqm?: number | null
          block_id: string
          created_at?: string
          floor?: number | null
          id?: string
          monthly_fee?: number | null
          number: string
          updated_at?: string
        }
        Update: {
          area_sqm?: number | null
          block_id?: string
          created_at?: string
          floor?: number | null
          id?: string
          monthly_fee?: number | null
          number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banner_acknowledgments: {
        Row: {
          acknowledged_at: string
          banner_id: string
          created_at: string
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          banner_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          banner_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_acknowledgments_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "condominium_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          condominium_id: string
          created_at: string
          description: string | null
          floors: number
          id: string
          name: string
          short_code: string | null
          updated_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          description?: string | null
          floors?: number
          id?: string
          name: string
          short_code?: string | null
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          description?: string | null
          floors?: number
          id?: string
          name?: string
          short_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominium_banners: {
        Row: {
          bg_color: string
          condominium_id: string
          content: string
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          show_as_modal: boolean
          text_color: string
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          condominium_id: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          show_as_modal?: boolean
          text_color?: string
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          condominium_id?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          show_as_modal?: boolean
          text_color?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominium_banners_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominium_transfers: {
        Row: {
          condominium_id: string
          created_at: string
          from_owner_id: string
          id: string
          notes: string | null
          to_owner_id: string
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          from_owner_id: string
          id?: string
          notes?: string | null
          to_owner_id: string
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          from_owner_id?: string
          id?: string
          notes?: string | null
          to_owner_id?: string
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominium_transfers_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominium_whatsapp_templates: {
        Row: {
          condominium_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          template_slug: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          template_slug: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          template_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominium_whatsapp_templates_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          address: string | null
          address_number: string | null
          administradora_email: string | null
          city: string | null
          cnpj: string | null
          convention_url: string | null
          created_at: string
          default_fine_percentage: number | null
          defense_deadline_days: number
          gatehouse_phone: string | null
          id: string
          internal_rules_url: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          owner_id: string
          phone: string | null
          sindico_name: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          administradora_email?: string | null
          city?: string | null
          cnpj?: string | null
          convention_url?: string | null
          created_at?: string
          default_fine_percentage?: number | null
          defense_deadline_days?: number
          gatehouse_phone?: string | null
          id?: string
          internal_rules_url?: string | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          owner_id: string
          phone?: string | null
          sindico_name?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          administradora_email?: string | null
          city?: string | null
          cnpj?: string | null
          convention_url?: string | null
          created_at?: string
          default_fine_percentage?: number | null
          defense_deadline_days?: number
          gatehouse_phone?: string | null
          id?: string
          internal_rules_url?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          owner_id?: string
          phone?: string | null
          sindico_name?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          read_at: string | null
          read_by: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          read_at?: string | null
          read_by?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          read_at?: string | null
          read_by?: string | null
          subject?: string
        }
        Relationships: []
      }
      cron_job_controls: {
        Row: {
          created_at: string
          function_name: string
          paused: boolean
          paused_at: string | null
          paused_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          function_name: string
          paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          created_at: string
          decided_at: string
          decided_by: string
          decision: Database["public"]["Enums"]["occurrence_status"]
          id: string
          justification: string
          occurrence_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string
          decided_by: string
          decision: Database["public"]["Enums"]["occurrence_status"]
          id?: string
          justification: string
          occurrence_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string
          decided_by?: string
          decision?: Database["public"]["Enums"]["occurrence_status"]
          id?: string
          justification?: string
          occurrence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      defense_attachments: {
        Row: {
          created_at: string
          defense_id: string
          description: string | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          defense_id: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          defense_id?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defense_attachments_defense_id_fkey"
            columns: ["defense_id"]
            isOneToOne: false
            referencedRelation: "defenses"
            referencedColumns: ["id"]
          },
        ]
      }
      defenses: {
        Row: {
          content: string
          created_at: string
          deadline: string
          id: string
          occurrence_id: string
          resident_id: string
          submitted_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deadline: string
          id?: string
          occurrence_id: string
          resident_id: string
          submitted_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deadline?: string
          id?: string
          occurrence_id?: string
          resident_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defenses_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defenses_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          error_message: string | null
          function_name: string
          id: string
          result: Json | null
          started_at: string
          status: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      expired_defense_email_logs: {
        Row: {
          condominium_id: string
          error_message: string | null
          id: string
          message_id: string | null
          occurrence_id: string
          recipient_email: string | null
          sent_at: string
          success: boolean
          triggered_by: string
          triggered_by_user: string | null
        }
        Insert: {
          condominium_id: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          occurrence_id: string
          recipient_email?: string | null
          sent_at?: string
          success?: boolean
          triggered_by?: string
          triggered_by_user?: string | null
        }
        Update: {
          condominium_id?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          occurrence_id?: string
          recipient_email?: string | null
          sent_at?: string
          success?: boolean
          triggered_by?: string
          triggered_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expired_defense_email_logs_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expired_defense_email_logs_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          acknowledged_at: string | null
          amount: number
          created_at: string
          due_date: string
          id: string
          multiplier: number
          notified_at: string | null
          occurrence_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          resident_id: string
          status: Database["public"]["Enums"]["fine_status"]
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          amount: number
          created_at?: string
          due_date: string
          id?: string
          multiplier?: number
          notified_at?: string | null
          occurrence_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          resident_id: string
          status?: Database["public"]["Enums"]["fine_status"]
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          multiplier?: number
          notified_at?: string | null
          occurrence_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          resident_id?: string
          status?: Database["public"]["Enums"]["fine_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          condominium_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          condominium_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          condominium_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_link_access_logs: {
        Row: {
          access_at: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          is_new_user: boolean
          occurrence_id: string | null
          redirect_url: string | null
          resident_id: string | null
          success: boolean
          token_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          is_new_user?: boolean
          occurrence_id?: string | null
          redirect_url?: string | null
          resident_id?: string | null
          success?: boolean
          token_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          is_new_user?: boolean
          occurrence_id?: string | null
          redirect_url?: string | null
          resident_id?: string | null
          success?: boolean
          token_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magic_link_access_logs_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_link_access_logs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_categories: {
        Row: {
          condominium_id: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_categories_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_executions: {
        Row: {
          condominium_id: string
          cost: number | null
          created_at: string
          executed_at: string
          executed_by: string | null
          executed_by_name: string | null
          id: string
          location: Json | null
          observations: string | null
          photos: string[]
          status: Database["public"]["Enums"]["maintenance_execution_status"]
          task_id: string
        }
        Insert: {
          condominium_id: string
          cost?: number | null
          created_at?: string
          executed_at?: string
          executed_by?: string | null
          executed_by_name?: string | null
          id?: string
          location?: Json | null
          observations?: string | null
          photos?: string[]
          status?: Database["public"]["Enums"]["maintenance_execution_status"]
          task_id: string
        }
        Update: {
          condominium_id?: string
          cost?: number | null
          created_at?: string
          executed_at?: string
          executed_by?: string | null
          executed_by_name?: string | null
          id?: string
          location?: Json | null
          observations?: string | null
          photos?: string[]
          status?: Database["public"]["Enums"]["maintenance_execution_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_executions_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          category_id: string | null
          condominium_id: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          is_active: boolean
          last_completed_at: string | null
          maintenance_type: string
          next_due_date: string
          notification_days_before: number
          periodicity: Database["public"]["Enums"]["maintenance_periodicity"]
          periodicity_days: number | null
          priority: string
          responsible_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          condominium_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          last_completed_at?: string | null
          maintenance_type?: string
          next_due_date: string
          notification_days_before?: number
          periodicity: Database["public"]["Enums"]["maintenance_periodicity"]
          periodicity_days?: number | null
          priority?: string
          responsible_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          condominium_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          last_completed_at?: string | null
          maintenance_type?: string
          next_due_date?: string
          notification_days_before?: number
          periodicity?: Database["public"]["Enums"]["maintenance_periodicity"]
          periodicity_days?: number | null
          priority?: string
          responsible_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "maintenance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_config: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          is_sandbox: boolean
          notification_url: string | null
          public_key: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          notification_url?: string | null
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          notification_url?: string | null
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      mercadopago_webhook_logs: {
        Row: {
          created_at: string
          data_id: string | null
          error_message: string | null
          event_action: string | null
          event_type: string
          id: string
          ip_address: string | null
          payload: Json
          processing_duration_ms: number | null
          processing_result: Json | null
          processing_status: string
          received_at: string
          signature_valid: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          data_id?: string | null
          error_message?: string | null
          event_action?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          payload: Json
          processing_duration_ms?: number | null
          processing_result?: Json | null
          processing_status?: string
          received_at?: string
          signature_valid?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          data_id?: string | null
          error_message?: string | null
          event_action?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          payload?: Json
          processing_duration_ms?: number | null
          processing_result?: Json | null
          processing_status?: string
          received_at?: string
          signature_valid?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications_sent: {
        Row: {
          accepted_at: string | null
          acknowledged_at: string | null
          created_at: string
          delivered_at: string | null
          device_info: Json | null
          id: string
          ip_address: string | null
          location_info: Json | null
          message_content: string
          occurrence_id: string | null
          read_at: string | null
          resident_id: string
          secure_link: string
          secure_link_token: string
          sent_at: string
          sent_via: string
          user_agent: string | null
          zpro_message_id: string | null
          zpro_status: string | null
        }
        Insert: {
          accepted_at?: string | null
          acknowledged_at?: string | null
          created_at?: string
          delivered_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          location_info?: Json | null
          message_content: string
          occurrence_id?: string | null
          read_at?: string | null
          resident_id: string
          secure_link: string
          secure_link_token: string
          sent_at?: string
          sent_via?: string
          user_agent?: string | null
          zpro_message_id?: string | null
          zpro_status?: string | null
        }
        Update: {
          accepted_at?: string | null
          acknowledged_at?: string | null
          created_at?: string
          delivered_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          location_info?: Json | null
          message_content?: string
          occurrence_id?: string | null
          read_at?: string | null
          resident_id?: string
          secure_link?: string
          secure_link_token?: string
          sent_at?: string
          sent_via?: string
          user_agent?: string | null
          zpro_message_id?: string | null
          zpro_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sent_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrence_evidences: {
        Row: {
          created_at: string
          description: string | null
          file_type: string
          file_url: string
          id: string
          occurrence_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
          occurrence_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          occurrence_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrence_evidences_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrence_pdf_template: {
        Row: {
          closing_remarks: string
          defense_deadline_paragraph: string
          footer_text: string
          id: string
          intro_paragraph: string
          penalty_advertencia_paragraph: string
          penalty_multa_paragraph: string
          penalty_notificacao_paragraph: string
          signature_label: string
          syndic_role_paragraph: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closing_remarks?: string
          defense_deadline_paragraph?: string
          footer_text?: string
          id?: string
          intro_paragraph?: string
          penalty_advertencia_paragraph?: string
          penalty_multa_paragraph?: string
          penalty_notificacao_paragraph?: string
          signature_label?: string
          syndic_role_paragraph?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closing_remarks?: string
          defense_deadline_paragraph?: string
          footer_text?: string
          id?: string
          intro_paragraph?: string
          penalty_advertencia_paragraph?: string
          penalty_multa_paragraph?: string
          penalty_notificacao_paragraph?: string
          signature_label?: string
          syndic_role_paragraph?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      occurrence_protocol_counters: {
        Row: {
          last_number: number
          updated_at: string
          year: number
        }
        Insert: {
          last_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          last_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      occurrences: {
        Row: {
          apartment_id: string | null
          block_id: string | null
          civil_code_article: string | null
          condominium_id: string
          convention_article: string | null
          created_at: string
          description: string
          fine_percentage: number | null
          id: string
          internal_rules_article: string | null
          legal_basis: string | null
          location: string | null
          occurred_at: string
          protocol: string | null
          protocol_number: number | null
          protocol_year: number | null
          registered_by: string
          resident_id: string | null
          responsible_name: string | null
          responsible_party: string | null
          responsible_phone: string | null
          status: Database["public"]["Enums"]["occurrence_status"]
          title: string
          type: Database["public"]["Enums"]["occurrence_type"]
          updated_at: string
        }
        Insert: {
          apartment_id?: string | null
          block_id?: string | null
          civil_code_article?: string | null
          condominium_id: string
          convention_article?: string | null
          created_at?: string
          description: string
          fine_percentage?: number | null
          id?: string
          internal_rules_article?: string | null
          legal_basis?: string | null
          location?: string | null
          occurred_at: string
          protocol?: string | null
          protocol_number?: number | null
          protocol_year?: number | null
          registered_by: string
          resident_id?: string | null
          responsible_name?: string | null
          responsible_party?: string | null
          responsible_phone?: string | null
          status?: Database["public"]["Enums"]["occurrence_status"]
          title: string
          type: Database["public"]["Enums"]["occurrence_type"]
          updated_at?: string
        }
        Update: {
          apartment_id?: string | null
          block_id?: string | null
          civil_code_article?: string | null
          condominium_id?: string
          convention_article?: string | null
          created_at?: string
          description?: string
          fine_percentage?: number | null
          id?: string
          internal_rules_article?: string | null
          legal_basis?: string | null
          location?: string | null
          occurred_at?: string
          protocol?: string | null
          protocol_number?: number | null
          protocol_year?: number | null
          registered_by?: string
          resident_id?: string | null
          responsible_name?: string | null
          responsible_party?: string | null
          responsible_phone?: string | null
          status?: Database["public"]["Enums"]["occurrence_status"]
          title?: string
          type?: Database["public"]["Enums"]["occurrence_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      package_deletion_requests: {
        Row: {
          condominium_id: string
          created_at: string
          id: string
          package_apartment_number: string | null
          package_block_name: string | null
          package_condominium_name: string | null
          package_id: string | null
          package_pickup_code: string | null
          reason: string
          requested_by: string | null
          requested_by_name: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          id?: string
          package_apartment_number?: string | null
          package_block_name?: string | null
          package_condominium_name?: string | null
          package_id?: string | null
          package_pickup_code?: string | null
          reason: string
          requested_by?: string | null
          requested_by_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          id?: string
          package_apartment_number?: string | null
          package_block_name?: string | null
          package_condominium_name?: string | null
          package_id?: string | null
          package_pickup_code?: string | null
          reason?: string
          requested_by?: string | null
          requested_by_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_deletion_requests_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_deletion_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_types: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          apartment_id: string
          block_id: string
          condominium_id: string
          created_at: string
          deleted_at: string | null
          deletion_reason: string | null
          description: string | null
          id: string
          notification_count: number | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          package_type_id: string | null
          photo_url: string
          picked_up_at: string | null
          picked_up_by: string | null
          picked_up_by_name: string | null
          pickup_code: string
          received_at: string
          received_by: string
          received_by_name: string | null
          resident_id: string | null
          status: Database["public"]["Enums"]["package_status"]
          tracking_code: string | null
        }
        Insert: {
          apartment_id: string
          block_id: string
          condominium_id: string
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string
          notification_count?: number | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          package_type_id?: string | null
          photo_url: string
          picked_up_at?: string | null
          picked_up_by?: string | null
          picked_up_by_name?: string | null
          pickup_code: string
          received_at?: string
          received_by: string
          received_by_name?: string | null
          resident_id?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          tracking_code?: string | null
        }
        Update: {
          apartment_id?: string
          block_id?: string
          condominium_id?: string
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string
          notification_count?: number | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          package_type_id?: string | null
          photo_url?: string
          picked_up_at?: string | null
          picked_up_by?: string | null
          picked_up_by_name?: string | null
          pickup_code?: string
          received_at?: string
          received_by?: string
          received_by_name?: string | null
          resident_id?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_package_type_id_fkey"
            columns: ["package_type_id"]
            isOneToOne: false
            referencedRelation: "package_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_bookings: {
        Row: {
          booking_date: string
          checklist_token: string | null
          condominium_id: string
          created_at: string
          end_time: string
          gatehouse_notification_sent_at: string | null
          guest_count: number | null
          id: string
          notification_sent_at: string | null
          observations: string | null
          party_hall_setting_id: string
          resident_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          checklist_token?: string | null
          condominium_id: string
          created_at?: string
          end_time: string
          gatehouse_notification_sent_at?: string | null
          guest_count?: number | null
          id?: string
          notification_sent_at?: string | null
          observations?: string | null
          party_hall_setting_id: string
          resident_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          checklist_token?: string | null
          condominium_id?: string
          created_at?: string
          end_time?: string
          gatehouse_notification_sent_at?: string | null
          guest_count?: number | null
          id?: string
          notification_sent_at?: string | null
          observations?: string | null
          party_hall_setting_id?: string
          resident_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_bookings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_hall_bookings_party_hall_setting_id_fkey"
            columns: ["party_hall_setting_id"]
            isOneToOne: false
            referencedRelation: "party_hall_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_hall_bookings_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_checklist_items: {
        Row: {
          category: string | null
          checklist_id: string
          created_at: string
          id: string
          is_ok: boolean
          item_name: string
          observation: string | null
          photos: string[] | null
        }
        Insert: {
          category?: string | null
          checklist_id: string
          created_at?: string
          id?: string
          is_ok?: boolean
          item_name: string
          observation?: string | null
          photos?: string[] | null
        }
        Update: {
          category?: string | null
          checklist_id?: string
          created_at?: string
          id?: string
          is_ok?: boolean
          item_name?: string
          observation?: string | null
          photos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "party_hall_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_checklist_templates: {
        Row: {
          category: string | null
          condominium_id: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          item_name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          condominium_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          item_name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          condominium_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          item_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_checklist_templates_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_checklists: {
        Row: {
          booking_id: string
          checked_at: string
          checked_by: string
          created_at: string
          general_observations: string | null
          id: string
          signature_data: Json | null
          type: string
        }
        Insert: {
          booking_id: string
          checked_at?: string
          checked_by: string
          created_at?: string
          general_observations?: string | null
          id?: string
          signature_data?: Json | null
          type: string
        }
        Update: {
          booking_id?: string
          checked_at?: string
          checked_by?: string
          created_at?: string
          general_observations?: string | null
          id?: string
          signature_data?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "party_hall_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_digital_checklists: {
        Row: {
          booking_id: string
          condominium_id: string
          created_at: string
          general_observations: string | null
          id: string
          items: Json
          signature_image: string
          signed_at: string
          signer_email: string
          signer_geolocation: Json | null
          signer_ip: string | null
          signer_name: string
          token: string
        }
        Insert: {
          booking_id: string
          condominium_id: string
          created_at?: string
          general_observations?: string | null
          id?: string
          items?: Json
          signature_image: string
          signed_at?: string
          signer_email: string
          signer_geolocation?: Json | null
          signer_ip?: string | null
          signer_name: string
          token: string
        }
        Update: {
          booking_id?: string
          condominium_id?: string
          created_at?: string
          general_observations?: string | null
          id?: string
          items?: Json
          signature_image?: string
          signed_at?: string
          signer_email?: string
          signer_geolocation?: Json | null
          signer_ip?: string | null
          signer_name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_digital_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "party_hall_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_hall_digital_checklists_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_notifications: {
        Row: {
          booking_id: string
          condominium_id: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string
          message_id: string | null
          notification_type: string
          phone: string
          resident_id: string
          sent_at: string
          status: string
        }
        Insert: {
          booking_id: string
          condominium_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content: string
          message_id?: string | null
          notification_type: string
          phone: string
          resident_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          booking_id?: string
          condominium_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string
          message_id?: string | null
          notification_type?: string
          phone?: string
          resident_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "party_hall_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_hall_notifications_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_hall_notifications_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      party_hall_settings: {
        Row: {
          advance_days_required: number | null
          check_in_time: string | null
          check_out_time: string | null
          condominium_id: string
          created_at: string
          id: string
          is_active: boolean
          max_guests: number | null
          name: string
          rental_fee: number | null
          rules: string | null
          updated_at: string
        }
        Insert: {
          advance_days_required?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          condominium_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_guests?: number | null
          name?: string
          rental_fee?: number | null
          rules?: string | null
          updated_at?: string
        }
        Update: {
          advance_days_required?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          condominium_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_guests?: number | null
          name?: string
          rental_fee?: number | null
          rules?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_hall_settings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      password_recovery_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_order: number
          fines_limit: number
          id: string
          is_active: boolean
          mercadopago_plan_id: string | null
          name: string
          notifications_limit: number
          package_notifications_limit: number
          price: number
          slug: string
          updated_at: string
          warnings_limit: number
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          fines_limit?: number
          id?: string
          is_active?: boolean
          mercadopago_plan_id?: string | null
          name: string
          notifications_limit?: number
          package_notifications_limit?: number
          price?: number
          slug: string
          updated_at?: string
          warnings_limit?: number
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          fines_limit?: number
          id?: string
          is_active?: boolean
          mercadopago_plan_id?: string | null
          name?: string
          notifications_limit?: number
          package_notifications_limit?: number
          price?: number
          slug?: string
          updated_at?: string
          warnings_limit?: number
        }
        Relationships: []
      }
      porter_messages: {
        Row: {
          author_id: string
          author_name: string
          condominium_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          author_name: string
          condominium_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          condominium_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "porter_messages_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      porter_occurrence_categories: {
        Row: {
          condominium_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "porter_occurrence_categories_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      porter_occurrences: {
        Row: {
          category: string
          condominium_id: string
          created_at: string
          description: string
          id: string
          is_signed: boolean | null
          occurred_at: string
          photos: string[]
          priority: string
          protocol: string | null
          protocol_number: number | null
          protocol_year: number | null
          registered_by: string
          registered_by_name: string | null
          reporter_apartment_id: string | null
          reporter_block_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          signature_hash: string | null
          status: string
          target_apartment_id: string | null
          target_block_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          condominium_id: string
          created_at?: string
          description: string
          id?: string
          is_signed?: boolean | null
          occurred_at?: string
          photos?: string[]
          priority?: string
          protocol?: string | null
          protocol_number?: number | null
          protocol_year?: number | null
          registered_by: string
          registered_by_name?: string | null
          reporter_apartment_id?: string | null
          reporter_block_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          signature_hash?: string | null
          status?: string
          target_apartment_id?: string | null
          target_block_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condominium_id?: string
          created_at?: string
          description?: string
          id?: string
          is_signed?: boolean | null
          occurred_at?: string
          photos?: string[]
          priority?: string
          protocol?: string | null
          protocol_number?: number | null
          protocol_year?: number | null
          registered_by?: string
          registered_by_name?: string | null
          reporter_apartment_id?: string | null
          reporter_block_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          signature_hash?: string | null
          status?: string
          target_apartment_id?: string | null
          target_block_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "porter_occurrences_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "porter_occurrences_reporter_apartment_id_fkey"
            columns: ["reporter_apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "porter_occurrences_reporter_block_id_fkey"
            columns: ["reporter_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "porter_occurrences_target_apartment_id_fkey"
            columns: ["target_apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "porter_occurrences_target_block_id_fkey"
            columns: ["target_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          certificate_password: string | null
          certificate_url: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          has_certificate: boolean
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          certificate_password?: string | null
          certificate_url?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          has_certificate?: boolean
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          certificate_password?: string | null
          certificate_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          has_certificate?: boolean
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_owners: {
        Row: {
          address: string | null
          condominium_id: string
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          condominium_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          condominium_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owners_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          apartment_id: string
          bsuid: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_owner: boolean
          is_responsible: boolean
          move_in_date: string | null
          move_out_date: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          phone: string | null
          property_owner_id: string | null
          resident_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          apartment_id: string
          bsuid?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_owner?: boolean
          is_responsible?: boolean
          move_in_date?: string | null
          move_out_date?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          property_owner_id?: string | null
          resident_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          apartment_id?: string
          bsuid?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_owner?: boolean
          is_responsible?: boolean
          move_in_date?: string | null
          move_out_date?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          property_owner_id?: string | null
          resident_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_property_owner_id_fkey"
            columns: ["property_owner_id"]
            isOneToOne: false
            referencedRelation: "property_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_checklist_templates: {
        Row: {
          category: string
          condominium_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          item_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          condominium_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          item_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          condominium_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          item_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_checklist_templates_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handover_items: {
        Row: {
          category: string | null
          created_at: string
          handover_id: string
          id: string
          is_ok: boolean
          item_name: string
          observation: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          handover_id: string
          id?: string
          is_ok?: boolean
          item_name: string
          observation?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          handover_id?: string
          id?: string
          is_ok?: boolean
          item_name?: string
          observation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handover_items_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "shift_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          condominium_id: string
          created_at: string
          general_observations: string | null
          id: string
          incoming_porter_name: string
          outgoing_porter_id: string
          shift_ended_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          general_observations?: string | null
          id?: string
          incoming_porter_name: string
          outgoing_porter_id: string
          shift_ended_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          general_observations?: string | null
          id?: string
          incoming_porter_name?: string
          outgoing_porter_id?: string
          shift_ended_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_documents: {
        Row: {
          created_at: string
          file_hash: string
          file_name: string
          id: string
          signer_id: string | null
          signer_name: string
        }
        Insert: {
          created_at?: string
          file_hash: string
          file_name: string
          id?: string
          signer_id?: string | null
          signer_name: string
        }
        Update: {
          created_at?: string
          file_hash?: string
          file_name?: string
          id?: string
          signer_id?: string | null
          signer_name?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          secure: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_active?: boolean
          password: string
          port?: number
          secure?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          condominium_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          fines_limit: number
          fines_used: number
          id: string
          is_lifetime: boolean
          is_trial: boolean
          mercado_pago_subscription_id: string | null
          mercadopago_preapproval_id: string | null
          notifications_limit: number
          notifications_used: number
          package_notifications_extra: number
          package_notifications_limit: number
          package_notifications_used: number
          plan: Database["public"]["Enums"]["plan_type"]
          trial_ends_at: string | null
          updated_at: string
          warnings_limit: number
          warnings_used: number
        }
        Insert: {
          active?: boolean
          condominium_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          fines_limit?: number
          fines_used?: number
          id?: string
          is_lifetime?: boolean
          is_trial?: boolean
          mercado_pago_subscription_id?: string | null
          mercadopago_preapproval_id?: string | null
          notifications_limit?: number
          notifications_used?: number
          package_notifications_extra?: number
          package_notifications_limit?: number
          package_notifications_used?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          trial_ends_at?: string | null
          updated_at?: string
          warnings_limit?: number
          warnings_used?: number
        }
        Update: {
          active?: boolean
          condominium_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          fines_limit?: number
          fines_used?: number
          id?: string
          is_lifetime?: boolean
          is_trial?: boolean
          mercado_pago_subscription_id?: string | null
          mercadopago_preapproval_id?: string | null
          notifications_limit?: number
          notifications_used?: number
          package_notifications_extra?: number
          package_notifications_limit?: number
          package_notifications_used?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          trial_ends_at?: string | null
          updated_at?: string
          warnings_limit?: number
          warnings_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: true
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_condominiums: {
        Row: {
          condominium_id: string
          created_at: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          condominium_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          condominium_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_condominiums_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_raw_logs: {
        Row: {
          bsuids_captured: number | null
          created_at: string
          id: string
          notifications_updated: number | null
          payload: Json
          source: string
          statuses_count: number | null
        }
        Insert: {
          bsuids_captured?: number | null
          created_at?: string
          id?: string
          notifications_updated?: number | null
          payload: Json
          source?: string
          statuses_count?: number | null
        }
        Update: {
          bsuids_captured?: number | null
          created_at?: string
          id?: string
          notifications_updated?: number | null
          payload?: Json
          source?: string
          statuses_count?: number | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          api_key: string
          api_url: string
          app_url: string | null
          created_at: string
          id: string
          instance_id: string
          is_active: boolean
          provider: string
          updated_at: string
          use_waba_templates: boolean | null
        }
        Insert: {
          api_key: string
          api_url: string
          app_url?: string | null
          created_at?: string
          id?: string
          instance_id: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          use_waba_templates?: boolean | null
        }
        Update: {
          api_key?: string
          api_url?: string
          app_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          use_waba_templates?: boolean | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          bsuid: string | null
          condominium_id: string | null
          content: string | null
          conversation_window_expires_at: string | null
          created_at: string
          direction: string
          error_message: string | null
          from_phone: string | null
          id: string
          media_id: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          meta_message_id: string | null
          resident_id: string | null
          resident_name: string | null
          status: string | null
          to_phone: string | null
        }
        Insert: {
          bsuid?: string | null
          condominium_id?: string | null
          content?: string | null
          conversation_window_expires_at?: string | null
          created_at?: string
          direction: string
          error_message?: string | null
          from_phone?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          resident_id?: string | null
          resident_name?: string | null
          status?: string | null
          to_phone?: string | null
        }
        Update: {
          bsuid?: string | null
          condominium_id?: string | null
          content?: string | null
          conversation_window_expires_at?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          from_phone?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          resident_id?: string | null
          resident_name?: string | null
          status?: string | null
          to_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_logs: {
        Row: {
          accepted_at: string | null
          condominium_id: string | null
          created_at: string
          debug_info: Json | null
          delivered_at: string | null
          error_message: string | null
          function_name: string
          id: string
          message_id: string | null
          package_id: string | null
          phone: string | null
          read_at: string | null
          recipient_role: string | null
          request_payload: Json | null
          resident_id: string | null
          response_body: string | null
          response_status: number | null
          sent_at: string | null
          status: string | null
          success: boolean
          template_language: string | null
          template_name: string | null
        }
        Insert: {
          accepted_at?: string | null
          condominium_id?: string | null
          created_at?: string
          debug_info?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          message_id?: string | null
          package_id?: string | null
          phone?: string | null
          read_at?: string | null
          recipient_role?: string | null
          request_payload?: Json | null
          resident_id?: string | null
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          status?: string | null
          success?: boolean
          template_language?: string | null
          template_name?: string | null
        }
        Update: {
          accepted_at?: string | null
          condominium_id?: string | null
          created_at?: string
          debug_info?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          message_id?: string | null
          package_id?: string | null
          phone?: string | null
          read_at?: string | null
          recipient_role?: string | null
          request_payload?: Json | null
          resident_id?: string | null
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          status?: string | null
          success?: boolean
          template_language?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_logs_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          button_config: Json | null
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          params_order: string[] | null
          slug: string
          updated_at: string
          variables: string[]
          waba_language: string | null
          waba_template_name: string | null
        }
        Insert: {
          button_config?: Json | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          params_order?: string[] | null
          slug: string
          updated_at?: string
          variables?: string[]
          waba_language?: string | null
          waba_template_name?: string | null
        }
        Update: {
          button_config?: Json | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          params_order?: string[] | null
          slug?: string
          updated_at?: string
          variables?: string[]
          waba_language?: string | null
          waba_template_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_package_deletion_request: {
        Args: { _request_id: string; _reviewer_name?: string }
        Returns: Json
      }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_password_recovery_attempts: {
        Args: never
        Returns: undefined
      }
      confirm_package_pickup: {
        Args: {
          p_package_id: string
          p_picked_up_by: string
          p_picked_up_by_name: string
        }
        Returns: undefined
      }
      get_apartment_condominium_id: {
        Args: { _apartment_id: string }
        Returns: string
      }
      get_banner_acknowledgments: {
        Args: { _banner_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_co_porters: {
        Args: { _condominium_id: string; _user_id: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_condominium_porteiros_count: {
        Args: { _condominium_id: string }
        Returns: number
      }
      get_cron_job_pause_status: {
        Args: never
        Returns: {
          function_name: string
          paused: boolean
          paused_at: string
        }[]
      }
      get_cron_job_runs: {
        Args: never
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_rls_status: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      get_signed_package: { Args: { _hash: string }; Returns: Json }
      get_signed_porter_occurrence: { Args: { _hash: string }; Returns: Json }
      get_user_condominium_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_of_apartment: {
        Args: { _apartment_id: string; _user_id: string }
        Returns: boolean
      }
      is_resident_of_apartment: {
        Args: { _apartment_id: string; _user_id: string }
        Returns: boolean
      }
      is_resident_of_condominium: {
        Args: { _condominium_id: string; _user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_cron_job: { Args: { p_jobid: number }; Returns: boolean }
      toggle_cron_job_pause: {
        Args: { p_function_name: string }
        Returns: boolean
      }
      user_belongs_to_condominium: {
        Args: { _condominium_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "sindico" | "morador" | "porteiro" | "zelador"
      fine_status: "em_aberto" | "pago" | "vencido"
      maintenance_execution_status: "concluida" | "parcial" | "nao_realizada"
      maintenance_periodicity:
        | "semanal"
        | "quinzenal"
        | "mensal"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
        | "personalizado"
        | "unica"
      occurrence_status:
        | "registrada"
        | "notificado"
        | "em_defesa"
        | "arquivada"
        | "advertido"
        | "multado"
      occurrence_type: "advertencia" | "notificacao" | "multa"
      package_status: "pendente" | "retirada"
      plan_type: "start" | "essencial" | "profissional" | "enterprise"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "sindico", "morador", "porteiro", "zelador"],
      fine_status: ["em_aberto", "pago", "vencido"],
      maintenance_execution_status: ["concluida", "parcial", "nao_realizada"],
      maintenance_periodicity: [
        "semanal",
        "quinzenal",
        "mensal",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
        "personalizado",
        "unica",
      ],
      occurrence_status: [
        "registrada",
        "notificado",
        "em_defesa",
        "arquivada",
        "advertido",
        "multado",
      ],
      occurrence_type: ["advertencia", "notificacao", "multa"],
      package_status: ["pendente", "retirada"],
      plan_type: ["start", "essencial", "profissional", "enterprise"],
    },
  },
} as const
