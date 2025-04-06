
// This declaration file makes the Google Maps JavaScript API available to TypeScript
declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
  }
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: HTMLElement, options?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    getCenter(): LatLng;
    setZoom(zoom: number): void;
    getZoom(): number;
    addListener(eventName: string, handler: Function): MapsEventListener;
    panTo(latLng: LatLng | LatLngLiteral): void;
    panBy(x: number, y: number): void;
    setOptions(options: MapOptions): void;
    easeTo(options: { center: LatLng | LatLngLiteral; duration: number; easing: (n: number) => number }): void;
    getContainer(): HTMLElement;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latLng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng | null;
    setMap(map: Map | null): void;
    getMap(): Map | null;
    addListener(eventName: string, handler: Function): MapsEventListener;
    setAnimation(animation: Animation): void;
    setDraggable(draggable: boolean): void;
    setVisible(visible: boolean): void;
    setZIndex(zIndex: number): void;
    setTitle(title: string): void;
    setLabel(label: string | MarkerLabel): void;
    setIcon(icon: string | Icon | Symbol): void;
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: MapTypeId;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    styles?: MapTypeStyle[];
    gestureHandling?: string;
    clickableIcons?: boolean;
    disableDefaultUI?: boolean;
    draggable?: boolean;
    heading?: number;
    tilt?: number;
    mapId?: string;
    minZoom?: number;
    maxZoom?: number;
    restriction?: MapRestriction;
  }

  interface MapTypeStyle {
    elementType?: string;
    featureType?: string;
    stylers: object[];
  }
  
  interface MarkerOptions {
    position: LatLng | LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string | Icon | Symbol;
    label?: string | MarkerLabel;
    draggable?: boolean;
    clickable?: boolean;
    animation?: Animation;
    zIndex?: number;
    opacity?: number;
    visible?: boolean;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
  }

  interface Icon {
    url: string;
    size?: Size;
    scaledSize?: Size;
    origin?: Point;
    anchor?: Point;
    labelOrigin?: Point;
  }

  class LatLng {
    constructor(lat: number, lng: number, noWrap?: boolean);
    lat(): number;
    lng(): number;
    toString(): string;
    toJSON(): LatLngLiteral;
    equals(other: LatLng): boolean;
    toUrlValue(precision?: number): string;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class Size {
    constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
    equals(other: Size): boolean;
    width: number;
    height: number;
    toString(): string;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
    equals(other: Point): boolean;
    toString(): string;
  }

  enum MapTypeId {
    HYBRID = 'hybrid',
    ROADMAP = 'roadmap',
    SATELLITE = 'satellite',
    TERRAIN = 'terrain'
  }

  class Geocoder {
    constructor();
    geocode(
      request: GeocoderRequest,
      callback: (results?: GeocoderResult[], status?: GeocoderStatus) => void
    ): void;
  }

  interface GeocoderRequest {
    address?: string;
    location?: LatLng | LatLngLiteral;
    bounds?: LatLngBounds | LatLngBoundsLiteral;
    componentRestrictions?: GeocoderComponentRestrictions;
    region?: string;
  }

  interface GeocoderComponentRestrictions {
    country: string | string[];
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
  }

  interface GeocoderResult {
    address_components: GeocoderAddressComponent[];
    formatted_address: string;
    geometry: GeocoderGeometry;
    partial_match?: boolean;
    place_id: string;
    postcode_localities?: string[];
    types: string[];
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface GeocoderGeometry {
    bounds?: LatLngBounds;
    location: LatLng;
    location_type?: GeocoderLocationType;
    viewport: LatLngBounds;
  }

  enum GeocoderLocationType {
    APPROXIMATE = 'APPROXIMATE',
    GEOMETRIC_CENTER = 'GEOMETRIC_CENTER',
    RANGE_INTERPOLATED = 'RANGE_INTERPOLATED',
    ROOFTOP = 'ROOFTOP'
  }

  enum GeocoderStatus {
    ERROR = 'ERROR',
    INVALID_REQUEST = 'INVALID_REQUEST',
    OK = 'OK',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    ZERO_RESULTS = 'ZERO_RESULTS'
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
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
    toUrlValue(precision?: number): string;
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

  enum Animation {
    BOUNCE = 1,
    DROP = 2
  }

  class NavigationControl {
    constructor(options?: NavigationControlOptions);
  }

  interface NavigationControlOptions {
    position?: ControlPosition;
    visualizePitch?: boolean;
  }

  enum ControlPosition {
    BOTTOM_CENTER = 11,
    BOTTOM_LEFT = 10,
    BOTTOM_RIGHT = 12,
    LEFT_BOTTOM = 6,
    LEFT_CENTER = 4,
    LEFT_TOP = 5,
    RIGHT_BOTTOM = 9,
    RIGHT_CENTER = 8,
    RIGHT_TOP = 7,
    TOP_CENTER = 2,
    TOP_LEFT = 1,
    TOP_RIGHT = 3
  }

  interface Symbol {
    path: string | SymbolPath;
    fillColor?: string;
    fillOpacity?: number;
    rotation?: number;
    scale?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }

  enum SymbolPath {
    BACKWARD_CLOSED_ARROW = 3,
    BACKWARD_OPEN_ARROW = 4,
    CIRCLE = 0,
    FORWARD_CLOSED_ARROW = 1,
    FORWARD_OPEN_ARROW = 2
  }

  interface MapMouseEvent extends MouseEvent {
    latLng?: LatLng | null;
  }

  interface MapRestriction {
    latLngBounds: LatLngBounds | LatLngBoundsLiteral;
    strictBounds?: boolean;
  }
}

export {};
