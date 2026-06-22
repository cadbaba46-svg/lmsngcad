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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_totp_secrets: {
        Row: {
          created_at: string
          id: string
          secret: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          secret: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          secret?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      challans: {
        Row: {
          amount: number
          challan_number: string
          course_id: string | null
          created_at: string
          currency: string
          customer_cnic: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          due_date: string | null
          enrollment_id: string | null
          id: string
          issue_date: string
          paid_at: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          challan_number: string
          course_id?: string | null
          created_at?: string
          currency?: string
          customer_cnic: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          enrollment_id?: string | null
          id?: string
          issue_date?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          challan_number?: string
          course_id?: string | null
          created_at?: string
          currency?: string
          customer_cnic?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          enrollment_id?: string | null
          id?: string
          issue_date?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_content: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          short_code: string | null
          total_weeks: number
          updated_at: string
        }
        Insert: {
          course_content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          short_code?: string | null
          total_weeks?: number
          updated_at?: string
        }
        Update: {
          course_content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          short_code?: string | null
          total_weeks?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          attendance: Json | null
          challan_generated_at: string | null
          challan_paid: boolean
          challan_paid_at: string | null
          course_id: string
          course_roll_number: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance?: Json | null
          challan_generated_at?: string | null
          challan_paid?: boolean
          challan_paid_at?: string | null
          course_id: string
          course_roll_number?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance?: Json | null
          challan_generated_at?: string | null
          challan_paid?: boolean
          challan_paid_at?: string | null
          course_id?: string
          course_roll_number?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_completions: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_score: number | null
          lecture_id: string
          passed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_score?: number | null
          lecture_id: string
          passed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_score?: number | null
          lecture_id?: string
          passed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_completions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "mandatory_lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_totp_secrets: {
        Row: {
          created_at: string
          id: string
          secret: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          secret: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          secret?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      lms_totp_sessions: {
        Row: {
          expires_at: string
          session_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at?: string
          session_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          session_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      mandatory_lectures: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          is_active: boolean
          pass_threshold: number
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          pass_threshold?: number
          title: string
          updated_at?: string
          video_type?: string
          video_url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          pass_threshold?: number
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          used: boolean
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          used?: boolean
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profile_credentials: {
        Row: {
          created_at: string
          generated_password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          cnic: string | null
          created_at: string
          department: string | null
          dob: string | null
          documents: Json
          email: string | null
          father_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          photo_url: string | null
          province: string | null
          qualification: string | null
          qualification_field: string | null
          qualification_type: string | null
          roll_number: string | null
          semester: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          cnic?: string | null
          created_at?: string
          department?: string | null
          dob?: string | null
          documents?: Json
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          photo_url?: string | null
          province?: string | null
          qualification?: string | null
          qualification_field?: string | null
          qualification_type?: string | null
          roll_number?: string | null
          semester?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          cnic?: string | null
          created_at?: string
          department?: string | null
          dob?: string | null
          documents?: Json
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          photo_url?: string | null
          province?: string | null
          qualification?: string | null
          qualification_field?: string | null
          qualification_type?: string | null
          roll_number?: string | null
          semester?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          lecture_id: string
          pass_threshold: number
          questions: Json
          user_id: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          lecture_id: string
          pass_threshold: number
          questions: Json
          user_id: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          lecture_id?: string
          pass_threshold?: number
          questions?: Json
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          id: string
          question_key: string
          rating: number
          submission_id: string
        }
        Insert: {
          id?: string
          question_key: string
          rating: number
          submission_id: string
        }
        Update: {
          id?: string
          question_key?: string
          rating?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "survey_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_submissions: {
        Row: {
          course_id: string
          id: string
          student_id: string
          submitted_at: string
          survey_id: string
        }
        Insert: {
          course_id: string
          id?: string
          student_id: string
          submitted_at?: string
          survey_id: string
        }
        Update: {
          course_id?: string
          id?: string
          student_id?: string
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_submissions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_user_id_by_login: { Args: { _identifier: string }; Returns: string }
      get_teacher_students: {
        Args: { _course_ids: string[] }
        Returns: {
          course_id: string
          department: string
          full_name: string
          roll_number: string
          semester: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_course_roll_number: { Args: { _course_id: string }; Returns: string }
      next_registration_number: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "student" | "teacher"
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
      app_role: ["admin", "user", "student", "teacher"],
    },
  },
} as const
