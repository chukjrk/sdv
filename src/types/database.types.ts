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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      competitions: {
        Row: {
          competition_id: number
          competition_name: string
          created_at: string | null
          id: string
          season_name: string
        }
        Insert: {
          competition_id: number
          competition_name: string
          created_at?: string | null
          id?: string
          season_name: string
        }
        Update: {
          competition_id?: number
          competition_name?: string
          created_at?: string | null
          id?: string
          season_name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          end_location_x: number | null
          end_location_y: number | null
          event_data: Json
          event_id: string
          event_type: string
          event_type_id: number
          id: string
          location_x: number | null
          location_y: number | null
          match_id: number | null
          minute: number
          outcome_name: string | null
          period: number
          player_id: number | null
          player_name: string | null
          possession_team_id: number | null
          possession_team_name: string | null
          second: number
          team_id: number
          team_name: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          end_location_x?: number | null
          end_location_y?: number | null
          event_data: Json
          event_id: string
          event_type: string
          event_type_id: number
          id?: string
          location_x?: number | null
          location_y?: number | null
          match_id?: number | null
          minute: number
          outcome_name?: string | null
          period: number
          player_id?: number | null
          player_name?: string | null
          possession_team_id?: number | null
          possession_team_name?: string | null
          second: number
          team_id: number
          team_name: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          end_location_x?: number | null
          end_location_y?: number | null
          event_data?: Json
          event_id?: string
          event_type?: string
          event_type_id?: number
          id?: string
          location_x?: number | null
          location_y?: number | null
          match_id?: number | null
          minute?: number
          outcome_name?: string | null
          period?: number
          player_id?: number | null
          player_name?: string | null
          possession_team_id?: number | null
          possession_team_name?: string | null
          second?: number
          team_id?: number
          team_name?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      lineups: {
        Row: {
          created_at: string | null
          id: string
          jersey_number: number
          match_id: number | null
          player_id: number | null
          position_name: string | null
          team_id: number
          team_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          jersey_number: number
          match_id?: number | null
          player_id?: number | null
          position_name: string | null
          team_id: number
          team_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          jersey_number?: number
          match_id?: number | null
          player_id?: number | null
          position_name?: string | null
          team_id?: number
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_id: number
          away_team_name: string
          away_team_score: number
          competition_id: number
          created_at: string | null
          home_team_id: number
          home_team_name: string
          home_team_score: number
          id: string
          kickoff_time: string | null
          last_updated: string
          match_date: string
          match_id: number
          match_status: string | null
          referee_name: string | null
          season_name: string
          stadium_name: string | null
        }
        Insert: {
          away_team_id: number
          away_team_name: string
          away_team_score?: number
          competition_id: number
          created_at?: string | null
          home_team_id: number
          home_team_name: string
          home_team_score?: number
          id?: string
          kickoff_time?: string | null
          last_updated: string
          match_date: string
          match_id: number
          match_status?: string | null
          referee_name?: string | null
          season_name: string
          stadium_name?: string | null
        }
        Update: {
          away_team_id?: number
          away_team_name?: string
          away_team_score?: number
          competition_id?: number
          created_at?: string | null
          home_team_id?: number
          home_team_name?: string
          home_team_score?: number
          id?: string
          kickoff_time?: string | null
          last_updated?: string
          match_date?: string
          match_id?: number
          match_status?: string | null
          referee_name?: string | null
          season_name?: string
          stadium_name?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          jersey_number: number
          player_age: number | null
          player_id: number
          player_name: string
          player_nickname: string | null
          player_position: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          jersey_number: number
          player_age: number | null
          player_id: number
          player_name: string
          player_nickname: string | null
          player_position: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          jersey_number?: number
          player_age?: number | null
          player_id?: number
          player_name?: string
          player_nickname?: string | null
          player_position?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      passes: {
        Row: {
          away_team_name: string | null
          end_location_x: number | null
          end_location_y: number | null
          home_team_name: string | null
          id: string | null
          location_x: number | null
          location_y: number | null
          match_date: string | null
          match_id: number | null
          minute: number | null
          outcome_name: string | null
          pass_height: string | null
          pass_length: string | null
          period: number | null
          player_id: number | null
          player_name: string | null
          recipient_name: string | null
          second: number | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      shots: {
        Row: {
          body_part: string | null
          end_location_x: number | null
          end_location_y: number | null
          id: string | null
          location_x: number | null
          location_y: number | null
          match_date: string | null
          match_id: number | null
          minute: number | null
          outcome_name: string | null
          player_id: number | null
          player_name: string | null
          team_name: string | null
          xg: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
    }
    Functions: {
      get_events_in_zone: {
        Args: { p_match_id: number; p_zone: string }
        Returns: {
          event_id: string
          event_type: string
          location_x: number
          location_y: number
          player_name: string
        }[]
      }
      get_pass_completion_rate: {
        Args: { p_match_id?: number; p_player_name: string }
        Returns: {
          completed_passes: number
          completion_rate: number
          player_name: string
          total_passes: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
