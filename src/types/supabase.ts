export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      instructors: {
        Row: {
          id: string
          bio: string | null
          social_links: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          bio?: string | null
          social_links?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bio?: string | null
          social_links?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      spaces: {
        Row: {
          id: string
          instructor_id: string
          title: string
          description: string
          slug: string
          max_students: number | null
          is_active: boolean
          landing_page_content: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          instructor_id: string
          title: string
          description: string
          slug: string
          max_students?: number | null
          is_active?: boolean
          landing_page_content?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          instructor_id?: string
          title?: string
          description?: string
          slug?: string
          max_students?: number | null
          is_active?: boolean
          landing_page_content?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          space_id: string
          title: string
          description: string | null
          price: number
          currency: string
          is_free: boolean
          is_published: boolean
          sort_order: number
          estimated_duration_hours: number | null
          stripe_payment_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          space_id: string
          title: string
          description?: string | null
          price?: number
          currency?: string
          is_free?: boolean
          is_published?: boolean
          sort_order?: number
          estimated_duration_hours?: number | null
          stripe_payment_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          space_id?: string
          title?: string
          description?: string | null
          price?: number
          currency?: string
          is_free?: boolean
          is_published?: boolean
          sort_order?: number
          estimated_duration_hours?: number | null
          stripe_payment_link?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          content: string | null
          video_url: string | null
          video_duration_seconds: number | null
          is_preview: boolean
          is_published: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          content?: string | null
          video_url?: string | null
          video_duration_seconds?: number | null
          is_preview?: boolean
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          content?: string | null
          video_url?: string | null
          video_duration_seconds?: number | null
          is_preview?: boolean
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      space_students: {
        Row: {
          id: string
          user_id: string
          space_id: string
          status: string
          enrolled_at: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          space_id: string
          status?: string
          enrolled_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          space_id?: string
          status?: string
          enrolled_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      course_purchases: {
        Row: {
          id: string
          user_id: string
          course_id: string
          amount: number
          currency: string
          status: string
          stripe_payment_intent_id: string | null
          purchased_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          amount: number
          currency: string
          status?: string
          stripe_payment_intent_id?: string | null
          purchased_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          amount?: number
          currency?: string
          status?: string
          stripe_payment_intent_id?: string | null
          purchased_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lesson_progress: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          watch_time_seconds: number
          last_position_seconds: number
          completion_percentage: number
          is_completed: boolean
          last_watched_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          lesson_id: string
          watch_time_seconds?: number
          last_position_seconds?: number
          completion_percentage?: number
          is_completed?: boolean
          last_watched_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          lesson_id?: string
          watch_time_seconds?: number
          last_position_seconds?: number
          completion_percentage?: number
          is_completed?: boolean
          last_watched_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      auth: {
        users: {
          Row: {
            id: string
            email?: string
          }
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}