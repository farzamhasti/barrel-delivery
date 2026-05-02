// Common addresses in Fort Erie/Ontario area for autocomplete suggestions
export const addressDatabase = [
  { address: "255 Emerick Avenue, Fort Erie, ON", lat: 42.9819, lng: -79.0459 },
  { address: "1 Municipal Centre Drive, Fort Erie, ON", lat: 42.9856, lng: -79.0381 },
  { address: "26 Emerick Avenue, Fort Erie, ON", lat: 42.9815, lng: -79.0461 },
  { address: "42 Dodds Court, Fort Erie, ON", lat: 42.9789, lng: -79.0512 },
  { address: "439 Viking Street, Fort Erie, ON", lat: 42.9901, lng: -79.0298 },
  { address: "1 Hospitality Drive, Fort Erie, ON", lat: 42.9745, lng: -79.0389 },
  { address: "100 Bridge Street, Fort Erie, ON", lat: 42.9872, lng: -79.0401 },
  { address: "200 Central Avenue, Fort Erie, ON", lat: 42.9834, lng: -79.0445 },
  { address: "300 Niagara Parkway, Fort Erie, ON", lat: 42.9901, lng: -79.0234 },
  { address: "400 Gilmore Road, Fort Erie, ON", lat: 42.9756, lng: -79.0567 },
  { address: "500 Ridge Road, Fort Erie, ON", lat: 42.9678, lng: -79.0612 },
  { address: "600 Niagara Street, Fort Erie, ON", lat: 42.9923, lng: -79.0289 },
  { address: "700 Waterfront Drive, Fort Erie, ON", lat: 42.9945, lng: -79.0156 },
  { address: "800 Pettit Road, Fort Erie, ON", lat: 42.9634, lng: -79.0745 },
  { address: "900 Netherby Road, Fort Erie, ON", lat: 42.9712, lng: -79.0834 },
];

export interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
}

/**
 * Get address suggestions based on user input
 * Filters the address database for matches
 */
export function getAddressSuggestions(input: string): AddressSuggestion[] {
  if (!input || input.length < 2) {
    return [];
  }

  const searchTerm = input.toLowerCase();
  return addressDatabase.filter(item =>
    item.address.toLowerCase().includes(searchTerm)
  );
}

/**
 * Find exact address match and return coordinates
 */
export function findAddressCoordinates(address: string): { lat: number; lng: number } | null {
  const match = addressDatabase.find(
    item => item.address.toLowerCase() === address.toLowerCase()
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}
