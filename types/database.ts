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

export interface Database {
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
