declare namespace google.maps {
  interface MapMouseEvent extends google.maps.MouseEvent {
    latLng?: google.maps.LatLng | null;
  }

  // Ensure any other necessary Google Maps types are declared here
}
