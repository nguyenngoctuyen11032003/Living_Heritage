
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"created_by": string | null,"error": string | null,"family_id": string | null,"id": string,"kind": string,"narrator_id": string | null,"recording_id": string,"status": Database["public"]['Enums']["job_status"],"story_ids": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"family_id"?: string | null,"id"?: string,"kind"?: string,"narrator_id"?: string | null,"recording_id": string,"status"?: Database["public"]['Enums']["job_status"],"story_ids"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"family_id"?: string | null,"id"?: string,"kind"?: string,"narrator_id"?: string | null,"recording_id"?: string,"status"?: Database["public"]['Enums']["job_status"],"story_ids"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_jobs_recording_id_fkey"
      columns: ["recording_id"]
isOneToOne: false
      referencedRelation: "recordings"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_quota": {
                  Row: {
                    "day": string,"kind": string,"updated_at": string,"used": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"kind"?: string,"updated_at"?: string,"used"?: number,"user_id": string
                  }
                  Update: {
                    "day"?: string,"kind"?: string,"updated_at"?: string,"used"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_usage": {
                  Row: {
                    "action": string,"created_at": string,"id": string,"input_bytes": number,"job_id": string | null,"latency_ms": number,"model": string | null,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: string,"input_bytes"?: number,"job_id"?: string | null,"latency_ms"?: number,"model"?: string | null,"status": string,"user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: string,"input_bytes"?: number,"job_id"?: string | null,"latency_ms"?: number,"model"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "ai_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"details": NonNullable<Json>,"family_id": string | null,"id": number,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"details"?: NonNullable<Json>,"family_id"?: string | null,"id"?: never,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"details"?: NonNullable<Json>,"family_id"?: string | null,"id"?: never,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"book_chapters": {
                  Row: {
                    "book_id": string,"family_id": string,"position": number,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"family_id": string,"position"?: number,"story_id": string
                  }
                  Update: {
                    "book_id"?: string,"family_id"?: string,"position"?: number,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "book_chapters_book_id_family_id_fkey"
      columns: ["book_id","family_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "book_chapters_story_id_family_id_fkey"
      columns: ["story_id","family_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"books": {
                  Row: {
                    "cover_style": string,"created_at": string,"created_by": string | null,"family_id": string,"id": string,"subtitle": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cover_style"?: string,"created_at"?: string,"created_by"?: string | null,"family_id": string,"id"?: string,"subtitle"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cover_style"?: string,"created_at"?: string,"created_by"?: string | null,"family_id"?: string,"id"?: string,"subtitle"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "books_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"collection_items": {
                  Row: {
                    "added_at": string,"collection_id": string,"family_id": string,"position": number,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"collection_id": string,"family_id": string,"position"?: number,"story_id": string
                  }
                  Update: {
                    "added_at"?: string,"collection_id"?: string,"family_id"?: string,"position"?: number,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_items_collection_id_family_id_fkey"
      columns: ["collection_id","family_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "collection_items_story_id_family_id_fkey"
      columns: ["story_id","family_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"family_id": string,"id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"family_id": string,"id"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"family_id"?: string,"id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collections_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"connect_requests": {
                  Row: {
                    "contact": string,"created_at": string,"id": string,"message": string,"name": string,"public_item_id": string,"requester": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact": string,"created_at"?: string,"id"?: string,"message": string,"name": string,"public_item_id": string,"requester"?: string | null,"status"?: string
                  }
                  Update: {
                    "contact"?: string,"created_at"?: string,"id"?: string,"message"?: string,"name"?: string,"public_item_id"?: string,"requester"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connect_requests_public_item_id_fkey"
      columns: ["public_item_id"]
isOneToOne: false
      referencedRelation: "public_items"
      referencedColumns: ["id"]
    }
                  ]
                },"deletion_requests": {
                  Row: {
                    "admin_note": string | null,"created_at": string,"family_id": string,"id": string,"reason": string | null,"requested_by": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"story_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"created_at"?: string,"family_id": string,"id"?: string,"reason"?: string | null,"requested_by"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"story_id"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"created_at"?: string,"family_id"?: string,"id"?: string,"reason"?: string | null,"requested_by"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"story_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deletion_requests_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"owner_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"owner_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"family_id": string,"id": string,"invited_by": string | null,"relation": string | null,"role": Database["public"]['Enums']["member_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"family_id": string,"id"?: string,"invited_by"?: string | null,"relation"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"family_id"?: string,"id"?: string,"invited_by"?: string | null,"relation"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_invites_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"family_members": {
                  Row: {
                    "created_at": string,"family_id": string,"relation": string | null,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"family_id": string,"relation"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"relation"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"interest_requests": {
                  Row: {
                    "consent": boolean,"contact": string,"created_at": string,"format": string | null,"id": string,"message": string | null,"name": string,"plan": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"topic": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent": boolean,"contact": string,"created_at"?: string,"format"?: string | null,"id"?: string,"message"?: string | null,"name": string,"plan"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"topic"?: string | null
                  }
                  Update: {
                    "consent"?: boolean,"contact"?: string,"created_at"?: string,"format"?: string | null,"id"?: string,"message"?: string | null,"name"?: string,"plan"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"topic"?: string | null
                  }
                  Relationships: []
                },"narrator_links": {
                  Row: {
                    "claimed_at": string | null,"claimed_by": string | null,"created_at": string,"created_by": string | null,"expires_at": string,"id": string,"narrator_id": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string | null,"claimed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at": string,"id"?: string,"narrator_id": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "claimed_at"?: string | null,"claimed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"narrator_id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "narrator_links_narrator_id_fkey"
      columns: ["narrator_id"]
isOneToOne: false
      referencedRelation: "narrators"
      referencedColumns: ["id"]
    }
                  ]
                },"narrators": {
                  Row: {
                    "assisted_by": string | null,"avatar_path": string | null,"birth_year": number | null,"consent_method": string | null,"created_at": string,"created_by": string | null,"display_name": string,"family_id": string,"generation": number | null,"id": string,"lang": string,"pen_name": string | null,"region": string | null,"relation": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assisted_by"?: string | null,"avatar_path"?: string | null,"birth_year"?: number | null,"consent_method"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name": string,"family_id": string,"generation"?: number | null,"id"?: string,"lang"?: string,"pen_name"?: string | null,"region"?: string | null,"relation"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "assisted_by"?: string | null,"avatar_path"?: string | null,"birth_year"?: number | null,"consent_method"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name"?: string,"family_id"?: string,"generation"?: number | null,"id"?: string,"lang"?: string,"pen_name"?: string | null,"region"?: string | null,"relation"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "narrators_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"is_admin": boolean,"locale": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"is_admin"?: boolean,"locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"is_admin"?: boolean,"locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"public_items": {
                  Row: {
                    "audio_allowed": boolean,"audio_path": string | null,"body": string,"decade": number | null,"embedded_at": string | null,"embedding": string | null,"fields": NonNullable<Json>,"id": string,"kind": Database["public"]['Enums']["story_kind"],"lang": string,"narrator_label": string,"published_at": string,"region": string | null,"search_tsv": unknown,"story_id": string,"summary": string | null,"title": string,"topic_id": string | null,"topic_slug": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_allowed"?: boolean,"audio_path"?: string | null,"body": string,"decade"?: number | null,"embedded_at"?: string | null,"embedding"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"kind": Database["public"]['Enums']["story_kind"],"lang"?: string,"narrator_label": string,"published_at"?: string,"region"?: string | null,"search_tsv"?: never,"story_id": string,"summary"?: string | null,"title": string,"topic_id"?: string | null,"topic_slug"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "audio_allowed"?: boolean,"audio_path"?: string | null,"body"?: string,"decade"?: number | null,"embedded_at"?: string | null,"embedding"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"lang"?: string,"narrator_label"?: string,"published_at"?: string,"region"?: string | null,"search_tsv"?: never,"story_id"?: string,"summary"?: string | null,"title"?: string,"topic_id"?: string | null,"topic_slug"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "public_items_story_id_fkey"
      columns: ["story_id"]
isOneToOne: true
      referencedRelation: "stories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_items_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"publish_requests": {
                  Row: {
                    "family_id": string,"id": string,"note": string | null,"requested_at": string,"requested_by": string | null,"reviewed_at": string | null,"reviewer": string | null,"status": Database["public"]['Enums']["publish_status"],"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"id"?: string,"note"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"reviewed_at"?: string | null,"reviewer"?: string | null,"status"?: Database["public"]['Enums']["publish_status"],"story_id": string
                  }
                  Update: {
                    "family_id"?: string,"id"?: string,"note"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"reviewed_at"?: string | null,"reviewer"?: string | null,"status"?: Database["public"]['Enums']["publish_status"],"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "publish_requests_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "publish_requests_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "id": string,"kind_hint": Database["public"]['Enums']["story_kind"] | null,"prompt_en": string,"prompt_vi": string,"sort": number,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind_hint"?: Database["public"]['Enums']["story_kind"] | null,"prompt_en": string,"prompt_vi": string,"sort"?: number,"topic_id": string
                  }
                  Update: {
                    "id"?: string,"kind_hint"?: Database["public"]['Enums']["story_kind"] | null,"prompt_en"?: string,"prompt_vi"?: string,"sort"?: number,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"recordings": {
                  Row: {
                    "created_at": string,"created_by": string | null,"duration_s": number | null,"family_id": string,"id": string,"mime": string,"narrator_id": string,"question_id": string | null,"question_text": string | null,"session_id": string,"size_bytes": number | null,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"duration_s"?: number | null,"family_id": string,"id"?: string,"mime"?: string,"narrator_id": string,"question_id"?: string | null,"question_text"?: string | null,"session_id": string,"size_bytes"?: number | null,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"duration_s"?: number | null,"family_id"?: string,"id"?: string,"mime"?: string,"narrator_id"?: string,"question_id"?: string | null,"question_text"?: string | null,"session_id"?: string,"size_bytes"?: number | null,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recordings_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recordings_session_id_narrator_id_family_id_fkey"
      columns: ["session_id","narrator_id","family_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id","narrator_id","family_id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"public_item_id": string | null,"reason": string,"reporter": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"public_item_id"?: string | null,"reason": string,"reporter"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"public_item_id"?: string | null,"reason"?: string,"reporter"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_public_item_id_fkey"
      columns: ["public_item_id"]
isOneToOne: false
      referencedRelation: "public_items"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"family_id": string,"id": string,"narrator_id": string,"started_by": string | null,"topic_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"family_id": string,"id"?: string,"narrator_id": string,"started_by"?: string | null,"topic_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"family_id"?: string,"id"?: string,"narrator_id"?: string,"started_by"?: string | null,"topic_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_narrator_id_family_id_fkey"
      columns: ["narrator_id","family_id"]
isOneToOne: false
      referencedRelation: "narrators"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "sessions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"stories": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"body": string,"created_at": string,"created_by": string | null,"current_version": number,"edit_status": Database["public"]['Enums']["edit_status"],"family_id": string,"fields": NonNullable<Json>,"id": string,"kind": Database["public"]['Enums']["story_kind"],"lang": string,"narrator_id": string,"recording_id": string | null,"summary": string | null,"title": string,"topic_id": string | null,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"edit_status"?: Database["public"]['Enums']["edit_status"],"family_id": string,"fields"?: NonNullable<Json>,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"lang"?: string,"narrator_id": string,"recording_id"?: string | null,"summary"?: string | null,"title"?: string,"topic_id"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"edit_status"?: Database["public"]['Enums']["edit_status"],"family_id"?: string,"fields"?: NonNullable<Json>,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"lang"?: string,"narrator_id"?: string,"recording_id"?: string | null,"summary"?: string | null,"title"?: string,"topic_id"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "stories_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_narrator_id_family_id_fkey"
      columns: ["narrator_id","family_id"]
isOneToOne: false
      referencedRelation: "narrators"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "stories_recording_id_fkey"
      columns: ["recording_id"]
isOneToOne: false
      referencedRelation: "recordings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"story_photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"created_by": string | null,"family_id": string,"id": string,"position": number,"storage_path": string,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"family_id": string,"id"?: string,"position"?: number,"storage_path": string,"story_id": string
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"family_id"?: string,"id"?: string,"position"?: number,"storage_path"?: string,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_photos_story_id_family_id_fkey"
      columns: ["story_id","family_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"story_share_settings": {
                  Row: {
                    "show_audio": boolean,"show_photos": boolean,"show_real_name": boolean,"show_region": boolean,"story_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "show_audio"?: boolean,"show_photos"?: boolean,"show_real_name"?: boolean,"show_region"?: boolean,"story_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "show_audio"?: boolean,"show_photos"?: boolean,"show_real_name"?: boolean,"show_region"?: boolean,"story_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_share_settings_story_id_fkey"
      columns: ["story_id"]
isOneToOne: true
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"story_versions": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"edit_status": Database["public"]['Enums']["edit_status"],"fields": NonNullable<Json>,"id": string,"note": string | null,"story_id": string,"summary": string | null,"title": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"edit_status": Database["public"]['Enums']["edit_status"],"fields": NonNullable<Json>,"id"?: string,"note"?: string | null,"story_id": string,"summary"?: string | null,"title": string,"version": number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"edit_status"?: Database["public"]['Enums']["edit_status"],"fields"?: NonNullable<Json>,"id"?: string,"note"?: string | null,"story_id"?: string,"summary"?: string | null,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_versions_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "icon": string | null,"id": string,"slug": string,"sort": number,"title_en": string,"title_vi": string
                  }
                  ComputedFields: never
                  Insert: {
                    "icon"?: string | null,"id"?: string,"slug": string,"sort"?: number,"title_en": string,"title_vi": string
                  }
                  Update: {
                    "icon"?: string | null,"id"?: string,"slug"?: string,"sort"?: number,"title_en"?: string,"title_vi"?: string
                  }
                  Relationships: [
                    
                  ]
                },"transcripts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"recording_id": string,"text": string,"uncertain_spans": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"recording_id": string,"text": string,"uncertain_spans"?: NonNullable<Json>,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"recording_id"?: string,"text"?: string,"uncertain_spans"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "transcripts_recording_id_fkey"
      columns: ["recording_id"]
isOneToOne: false
      referencedRelation: "recordings"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "p_token": string }; Returns: string
                           },
"admin_withdraw_public":
{ Args: { "p_reason"?: string,"p_story": string }; Returns: string
                           },
"ai_quota_consume":
{ Args: { "p_limit": number,"p_user": string }; Returns: boolean
                           },
"ai_quota_consume_kind":
{ Args: { "p_kind": string,"p_limit": number,"p_user": string }; Returns: boolean
                           },
"ai_quota_refund":
{ Args: { "p_user": string }; Returns: undefined
                           },
"ai_quota_refund_kind":
{ Args: { "p_kind": string,"p_user": string }; Returns: undefined
                           },
"approve_story":
{ Args: { "p_assisted_consent"?: boolean,"p_story": string }; Returns: number
                           },
"can_read_media_object":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_read_recording":
{ Args: { "rid": string }; Returns: boolean
                           },
"can_read_recording_object":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_read_story":
{ Args: { "sid": string }; Returns: boolean
                           },
"can_upload_recording_object":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_write_story":
{ Args: { "sid": string }; Returns: boolean
                           },
"claim_narrator_link":
{ Args: { "p_token": string }; Returns: string
                           },
"create_family":
{ Args: { "name": string }; Returns: string
                           },
"create_family_invite":
{ Args: { "p_email": string,"p_family": string,"p_relation"?: string,"p_role"?: Database["public"]['Enums']["member_role"],"p_ttl_days"?: number }; Returns: string
                           },
"create_narrator_link":
{ Args: { "p_narrator": string,"p_ttl_days"?: number }; Returns: string
                           },
"family_role":
{ Args: { "fid": string }; Returns: Database["public"]['Enums']["member_role"]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_anonymous_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_family_editor":
{ Args: { "fid": string }; Returns: boolean
                           },
"is_family_member":
{ Args: { "fid": string }; Returns: boolean
                           },
"is_family_narrator_user":
{ Args: { "fid": string }; Returns: boolean
                           },
"is_narrator_user":
{ Args: { "nid": string }; Returns: boolean
                           },
"lh_audit":
{ Args: { "p_action": string,"p_details"?: Json,"p_family": string,"p_target": string,"p_target_type": string }; Returns: undefined
                           },
"lh_new_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"lh_path_uuid":
{ Args: { "p_idx": number,"p_name": string }; Returns: string
                           },
"lh_public_snapshot":
{ Args: { "p_story": string }; Returns: Json
                           },
"lh_token_hash":
{ Args: { "p_token": string }; Returns: string
                           },
"lh_unaccent":
{ Args: { "p_text": string }; Returns: string
                           },
"match_public_items":
{ Args: { "p_embedding": string,"p_limit"?: number,"p_min_similarity"?: number }; Returns: {
              "body": string,"decade": number,"fields": Json,"id": string,"kind": Database["public"]['Enums']["story_kind"],"narrator_label": string,"region": string,"similarity": number,"summary": string,"title": string,"topic_slug": string
            }[]
                           },
"media_object_unreferenced":
{ Args: { "p_name": string }; Returns: boolean
                           },
"preview_public_item":
{ Args: { "p_story": string }; Returns: Json
                           },
"request_publish":
{ Args: { "p_story": string }; Returns: string
                           },
"review_publish":
{ Args: { "p_approve": boolean,"p_note"?: string,"p_request": string }; Returns: string
                           },
"revoke_narrator_link":
{ Args: { "p_link": string }; Returns: undefined
                           },
"save_story_draft":
{ Args: { "p_body": string,"p_fields": Json,"p_story": string,"p_summary": string,"p_title": string }; Returns: number
                           },
"search_public":
{ Args: { "lim"?: number,"off"?: number,"p_decade"?: number,"p_kind"?: Database["public"]['Enums']["story_kind"],"p_region"?: string,"p_topic"?: string,"q"?: string }; Returns: {
              "audio_allowed": boolean,
"audio_path": string | null,
"body": string,
"decade": number | null,
"embedded_at": string | null,
"embedding": string | null,
"fields": NonNullable<Json>,
"id": string,
"kind": Database["public"]['Enums']["story_kind"],
"lang": string,
"narrator_label": string,
"published_at": string,
"region": string | null,
"search_tsv": unknown,
"story_id": string,
"summary": string | null,
"title": string,
"topic_id": string | null,
"topic_slug": string | null,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"shares_family_with":
{ Args: { "p_user": string }; Returns: boolean
                           },
"withdraw_public":
{ Args: { "p_story": string }; Returns: undefined
                           }
          }
          Enums: {
            "edit_status": "draft"|"pending_review"|"approved","job_status": "queued"|"transcribing"|"drafting"|"done"|"error","member_role": "owner"|"manager"|"editor"|"viewer","publish_status": "pending"|"approved"|"rejected"|"withdrawn","story_kind": "story"|"experience","visibility": "private"|"family"|"public"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "edit_status": ["draft", "pending_review", "approved"],"job_status": ["queued", "transcribing", "drafting", "done", "error"],"member_role": ["owner", "manager", "editor", "viewer"],"publish_status": ["pending", "approved", "rejected", "withdrawn"],"story_kind": ["story", "experience"],"visibility": ["private", "family", "public"]
          }
        }
} as const
