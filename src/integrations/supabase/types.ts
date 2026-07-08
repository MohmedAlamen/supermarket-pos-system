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
      branch_stock: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          product_id: string
          stock: number
          store_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          product_id: string
          stock?: number
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          product_id?: string
          stock?: number
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          common_name: string | null
          country_code: string
          created_at: string
          crn: string | null
          csid_certificate_pem: string | null
          csid_mode: string
          csid_private_key_pem: string | null
          csid_secret: string | null
          device_serial: string
          id: string
          invoice_counter: number
          invoice_prefix: string
          is_active: boolean
          last_invoice_hash: string
          name: string
          organization_name: string | null
          phone: string | null
          store_id: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          common_name?: string | null
          country_code?: string
          created_at?: string
          crn?: string | null
          csid_certificate_pem?: string | null
          csid_mode?: string
          csid_private_key_pem?: string | null
          csid_secret?: string | null
          device_serial?: string
          id?: string
          invoice_counter?: number
          invoice_prefix?: string
          is_active?: boolean
          last_invoice_hash?: string
          name: string
          organization_name?: string | null
          phone?: string | null
          store_id?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          common_name?: string | null
          country_code?: string
          created_at?: string
          crn?: string | null
          csid_certificate_pem?: string | null
          csid_mode?: string
          csid_private_key_pem?: string | null
          csid_secret?: string | null
          device_serial?: string
          id?: string
          invoice_counter?: number
          invoice_prefix?: string
          is_active?: boolean
          last_invoice_hash?: string
          name?: string
          organization_name?: string | null
          phone?: string | null
          store_id?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          customer_id: string | null
          discount_applied: number
          id: string
          is_reversed: boolean
          redeemed_at: string
          redeemed_by: string | null
          reversed_at: string | null
          sale_id: string | null
          store_id: string
        }
        Insert: {
          coupon_id: string
          customer_id?: string | null
          discount_applied?: number
          id?: string
          is_reversed?: boolean
          redeemed_at?: string
          redeemed_by?: string | null
          reversed_at?: string | null
          sale_id?: string | null
          store_id: string
        }
        Update: {
          coupon_id?: string
          customer_id?: string | null
          discount_applied?: number
          id?: string
          is_reversed?: boolean
          redeemed_at?: string
          redeemed_by?: string | null
          reversed_at?: string | null
          sale_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          per_customer_limit: number | null
          starts_at: string | null
          store_id: string
          total_uses_limit: number | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          uses_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          store_id: string
          total_uses_limit?: number | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          uses_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          store_id?: string
          total_uses_limit?: number | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          uses_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string | null
          store_id: string | null
          total_purchases: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          total_purchases?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          total_purchases?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string
          currency_per_point: number
          expire_after_months: number | null
          id: string
          is_active: boolean
          min_redeem_points: number
          points_per_currency: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_per_point?: number
          expire_after_months?: number | null
          id?: string
          is_active?: boolean
          min_redeem_points?: number
          points_per_currency?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_per_point?: number
          expire_after_months?: number | null
          id?: string
          is_active?: boolean
          min_redeem_points?: number
          points_per_currency?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          points: number
          reason: string | null
          sale_id: string | null
          store_id: string
          type: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          points: number
          reason?: string | null
          sale_id?: string | null
          store_id: string
          type: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          points?: number
          reason?: string | null
          sale_id?: string | null
          store_id?: string
          type?: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          gateway: string
          gateway_ref: string | null
          id: string
          method: string
          raw_response: Json | null
          reference: string
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          gateway?: string
          gateway_ref?: string | null
          id?: string
          method: string
          raw_response?: Json | null
          reference: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          gateway?: string
          gateway_ref?: string | null
          id?: string
          method?: string
          raw_response?: Json | null
          reference?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number
          created_at: string
          id: string
          name: string
          price: number
          stock: number
          store_id: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          price?: number
          stock?: number
          store_id?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          price?: number
          stock?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_store_id: string | null
          default_branch_id: string | null
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_store_id?: string | null
          default_branch_id?: string | null
          full_name?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_store_id?: string | null
          default_branch_id?: string | null
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_store_id_fkey"
            columns: ["current_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          items: Json
          notes: string | null
          paid: number
          payment_method: string
          store_id: string | null
          supplier_id: string | null
          total: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          paid?: number
          payment_method?: string
          store_id?: string | null
          supplier_id?: string | null
          total?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          paid?: number
          payment_method?: string
          store_id?: string | null
          supplier_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          cashier_id: string | null
          client_uid: string | null
          coupon_code: string | null
          coupon_discount: number
          coupon_id: string | null
          created_at: string
          customer_id: string | null
          discount: number
          icv: number | null
          id: string
          invoice_hash: string | null
          invoice_number: string | null
          invoice_type: string
          items: Json
          loyalty_discount: number
          loyalty_points_earned: number
          loyalty_points_redeemed: number
          payment_gateway: string
          payment_method: string
          payment_reference: string | null
          payment_status: string
          payments: Json
          previous_invoice_hash: string | null
          qr_code: string | null
          qr_code_signed: string | null
          signature_value: string | null
          signed_at: string | null
          signed_xml: string | null
          signing_error: string | null
          signing_status: string
          store_id: string | null
          subtotal: number
          tax_amount: number
          total: number
          uuid_zatca: string | null
          xml_content: string | null
          zatca_response: Json | null
          zatca_status: string
        }
        Insert: {
          branch_id?: string | null
          cashier_id?: string | null
          client_uid?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string | null
          invoice_type?: string
          items?: Json
          loyalty_discount?: number
          loyalty_points_earned?: number
          loyalty_points_redeemed?: number
          payment_gateway?: string
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          payments?: Json
          previous_invoice_hash?: string | null
          qr_code?: string | null
          qr_code_signed?: string | null
          signature_value?: string | null
          signed_at?: string | null
          signed_xml?: string | null
          signing_error?: string | null
          signing_status?: string
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number
          uuid_zatca?: string | null
          xml_content?: string | null
          zatca_response?: Json | null
          zatca_status?: string
        }
        Update: {
          branch_id?: string | null
          cashier_id?: string | null
          client_uid?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string | null
          invoice_type?: string
          items?: Json
          loyalty_discount?: number
          loyalty_points_earned?: number
          loyalty_points_redeemed?: number
          payment_gateway?: string
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          payments?: Json
          previous_invoice_hash?: string | null
          qr_code?: string | null
          qr_code_signed?: string | null
          signature_value?: string | null
          signed_at?: string | null
          signed_xml?: string | null
          signing_error?: string | null
          signing_status?: string
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number
          uuid_zatca?: string | null
          xml_content?: string | null
          zatca_response?: Json | null
          zatca_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          invoice_counter: number
          loyalty_points_per_unit: number
          phone: string | null
          store_id: string | null
          store_name: string
          tax_number: string | null
          tax_rate: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_counter?: number
          loyalty_points_per_unit?: number
          phone?: string | null
          store_id?: string | null
          store_name?: string
          tax_number?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_counter?: number
          loyalty_points_per_unit?: number
          phone?: string | null
          store_id?: string | null
          store_name?: string
          tax_number?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
      generate_branch_invoice_number: {
        Args: { _branch_id: string }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_customer_points: { Args: { _customer_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_role: {
        Args: {
          _roles: Database["public"]["Enums"]["store_role"][]
          _store_id: string
        }
        Returns: boolean
      }
      is_store_member: { Args: { _store_id: string }; Returns: boolean }
      is_store_owner: { Args: { _store_id: string }; Returns: boolean }
      validate_coupon: {
        Args: {
          _code: string
          _customer_id: string
          _store_id: string
          _subtotal: number
        }
        Returns: {
          coupon_id: string
          discount: number
          message: string
          valid: boolean
        }[]
      }
      zatca_advance_branch: {
        Args: { _branch_id: string; _new_hash: string }
        Returns: {
          icv: number
          invoice_number: string
          previous_hash: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "cashier"
      coupon_type: "percent" | "fixed" | "free_shipping"
      loyalty_txn_type: "earn" | "redeem" | "adjust" | "expire" | "refund"
      payment_status: "pending" | "approved" | "failed" | "refunded" | "voided"
      store_role: "owner" | "admin" | "manager" | "cashier"
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
      app_role: ["admin", "cashier"],
      coupon_type: ["percent", "fixed", "free_shipping"],
      loyalty_txn_type: ["earn", "redeem", "adjust", "expire", "refund"],
      payment_status: ["pending", "approved", "failed", "refunded", "voided"],
      store_role: ["owner", "admin", "manager", "cashier"],
    },
  },
} as const
