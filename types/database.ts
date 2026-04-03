export type SpaceType =
  | "drive_away"
  | "lockup_garage"
  | "unsheltered"
  | "sheltered"
  | "indoor_lot";

export type VehicleType =
  | "motorcycle"
  | "small_car"
  | "suv"
  | "van"
  | "small_truck"
  | "large_truck";

export type FeatureType =
  | "access_247"
  | "cctv"
  | "disabled_access"
  | "ev_charging"
  | "instant_booking"
  | "security";

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

export type PricingType = "daily" | "fortnightly" | "monthly";

export type NotificationType =
  | "booking_request"
  | "booking_accepted"
  | "booking_declined";

// Matches the format expected by @supabase/supabase-js v2 TypeScript inference.
// Each table requires a Relationships array; Views/Functions/Enums/CompositeTypes
// use the mapped-type form `{ [_ in never]: never }` (not Record<string, never>).
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          address: string;
          suburb: string;
          state: string;
          postcode: string;
          lat: number;
          lng: number;
          space_type: SpaceType;
          price_daily: number | null;
          price_fortnightly: number | null;
          price_monthly: number | null;
          access_instructions: string | null;
          is_sold_out: boolean;
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          address: string;
          suburb: string;
          state: string;
          postcode: string;
          lat: number;
          lng: number;
          space_type: SpaceType;
          price_daily?: number | null;
          price_fortnightly?: number | null;
          price_monthly?: number | null;
          access_instructions?: string | null;
          is_sold_out?: boolean;
          is_active?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          address?: string;
          suburb?: string;
          state?: string;
          postcode?: string;
          lat?: number;
          lng?: number;
          space_type?: SpaceType;
          price_daily?: number | null;
          price_fortnightly?: number | null;
          price_monthly?: number | null;
          access_instructions?: string | null;
          is_sold_out?: boolean;
          is_active?: boolean;
          is_featured?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_photos: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          storage_path?: string;
          url?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_vehicles: {
        Row: {
          id: string;
          listing_id: string;
          vehicle: VehicleType;
        };
        Insert: {
          id?: string;
          listing_id: string;
          vehicle: VehicleType;
        };
        Update: {
          id?: string;
          listing_id?: string;
          vehicle?: VehicleType;
        };
        Relationships: [
          {
            foreignKeyName: "listing_vehicles_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_features: {
        Row: {
          id: string;
          listing_id: string;
          feature: FeatureType;
        };
        Insert: {
          id?: string;
          listing_id: string;
          feature: FeatureType;
        };
        Update: {
          id?: string;
          listing_id?: string;
          feature?: FeatureType;
        };
        Relationships: [
          {
            foreignKeyName: "listing_features_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_requests: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status: BookingStatus;
          pricing_type: PricingType;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status?: BookingStatus;
          pricing_type: PricingType;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          status?: BookingStatus;
          pricing_type?: PricingType;
          message?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_requests_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          booking_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          booking_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          booking_id?: string | null;
          is_read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_listing_owner_public: {
        Args: { p_owner_id: string };
        Returns: {
          id: string;
          full_name: string;
          avatar_url: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
