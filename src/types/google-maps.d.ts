
// Type definitions for Google Maps JavaScript API 3.51
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element | null, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      setOptions(options: MapOptions): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
      panBy(x: number, y: number): void;
      getCenter(): LatLng;
      getZoom(): number;
      addListener(eventName: string, handler: Function): MapsEventListener;
      setFog(options: FogOptions): void;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setPosition(latLng: LatLng | LatLngLiteral): void;
      getPosition(): LatLng | null;
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
      setAnimation(animation: Animation): void;
    }

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (
          results: GeocoderResult[],
          status: GeocoderStatus
        ) => void
      ): void;
    }

    class DirectionsService {
      route(
        request: DirectionsRequest,
        callback: (
          result: DirectionsResult | null,
          status: DirectionsStatus
        ) => void
      ): void;
    }

    interface DirectionsRequest {
      origin: LatLng | LatLngLiteral | string;
      destination: LatLng | LatLngLiteral | string;
      travelMode: TravelMode;
      waypoints?: DirectionsWaypoint[];
      optimizeWaypoints?: boolean;
      provideRouteAlternatives?: boolean;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
      avoidFerries?: boolean;
      drivingOptions?: DrivingOptions;
      unitSystem?: UnitSystem;
      region?: string;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
      geocoded_waypoints?: DirectionsGeocodedWaypoint[];
    }

    interface DirectionsRoute {
      bounds: LatLngBounds;
      copyrights: string;
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      overview_polyline: string;
      summary: string;
      warnings: string[];
      waypoint_order: number[];
    }

    interface DirectionsLeg {
      distance?: Distance;
      duration?: Duration;
      duration_in_traffic?: Duration;
      end_address: string;
      end_location: LatLng;
      start_address: string;
      start_location: LatLng;
      steps: DirectionsStep[];
      via_waypoints: LatLng[];
    }

    interface DirectionsStep {
      distance: Distance;
      duration: Duration;
      end_location: LatLng;
      instructions: string;
      path: LatLng[];
      start_location: LatLng;
      travel_mode: TravelMode;
    }

    interface DirectionsWaypoint {
      location: LatLng | LatLngLiteral | string;
      stopover?: boolean;
    }

    interface DirectionsGeocodedWaypoint {
      geocoder_status: GeocoderStatus;
      place_id: string;
      types: string[];
    }

    interface DrivingOptions {
      departureTime: Date;
      trafficModel?: TrafficModel;
    }

    interface Distance {
      text: string;
      value: number;
    }

    interface Duration {
      text: string;
      value: number;
    }

    // Add MapMouseEvent interface
    interface MapMouseEvent {
      latLng?: LatLng;
      stop(): void;
    }

    interface MapOptions {
      center: LatLng | LatLngLiteral;
      zoom: number;
      mapTypeId?: MapTypeId;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      draggable?: boolean;
      animation?: Animation;
    }

    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
      bounds?: LatLngBounds;
      componentRestrictions?: GeocoderComponentRestrictions;
      region?: string;
    }

    interface GeocoderComponentRestrictions {
      administrativeArea?: string;
      country?: string | string[];
      locality?: string;
      postalCode?: string;
      route?: string;
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      place_id: string;
      types: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
      toJSON(): LatLngLiteral;
      equals(other: LatLng): boolean;
      toString(): string;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBounds {
      contains(latLng: LatLng | LatLngLiteral): boolean;
      equals(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      intersects(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toSpan(): LatLng;
      toString(): string;
      union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    interface MapsEventListener {
      remove(): void;
    }

    interface FogOptions {
      color?: string;
      'high-color'?: string;
      'horizon-blend'?: number;
    }

    enum GeocoderLocationType {
      APPROXIMATE = 'APPROXIMATE',
      GEOMETRIC_CENTER = 'GEOMETRIC_CENTER',
      RANGE_INTERPOLATED = 'RANGE_INTERPOLATED',
      ROOFTOP = 'ROOFTOP',
    }

    enum GeocoderStatus {
      ERROR = 'ERROR',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OK = 'OK',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
      ZERO_RESULTS = 'ZERO_RESULTS',
    }

    enum MapTypeId {
      HYBRID = 'hybrid',
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      TERRAIN = 'terrain',
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2,
      uu = 3,
      vv = 4,
    }

    enum TravelMode {
      BICYCLING = 'BICYCLING',
      DRIVING = 'DRIVING',
      TRANSIT = 'TRANSIT',
      WALKING = 'WALKING',
    }

    enum TrafficModel {
      BEST_GUESS = 'bestguess',
      OPTIMISTIC = 'optimistic',
      PESSIMISTIC = 'pessimistic',
    }

    enum DirectionsStatus {
      INVALID_REQUEST = 'INVALID_REQUEST',
      MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
      NOT_FOUND = 'NOT_FOUND',
      OK = 'OK',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
      ZERO_RESULTS = 'ZERO_RESULTS',
    }

    enum UnitSystem {
      IMPERIAL = 1,
      METRIC = 0,
    }

    class NavigationControl {
      constructor(options?: NavigationControlOptions);
    }

    interface NavigationControlOptions {
      visualizePitch?: boolean;
    }
  }
}

// Add Google Maps to the window global scope
interface Window {
  google: typeof google;
  googleMapsLoaded: boolean;
}
