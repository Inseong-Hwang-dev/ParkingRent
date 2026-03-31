export type {
  Database,
  SpaceType,
  VehicleType,
  FeatureType,
  BookingStatus,
  PricingType,
  NotificationType,
} from "./database";

import type { Database } from "./database";

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingPhoto =
  Database["public"]["Tables"]["listing_photos"]["Row"];
export type ListingVehicle =
  Database["public"]["Tables"]["listing_vehicles"]["Row"];
export type ListingFeature =
  Database["public"]["Tables"]["listing_features"]["Row"];
export type BookingRequest =
  Database["public"]["Tables"]["booking_requests"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export interface ListingWithDetails extends Listing {
  photos: ListingPhoto[];
  vehicles: ListingVehicle[];
  features: ListingFeature[];
  owner: Pick<User, "id" | "full_name" | "avatar_url">;
}
