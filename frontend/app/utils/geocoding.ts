export const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
      headers: {
        'Accept-Language': 'en-US'
      }
    });
    
    if (!response.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    const data = await response.json();
    
    if (data && data.address) {
      // Prioritize city, then town, then village, then county
      const locality = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district;
      const state = data.address.state;
      
      if (locality && state) return `${locality}, ${state}`;
      if (locality) return locality;
      if (data.display_name) {
         // Return a shortened version of the full display name
         return data.display_name.split(',').slice(0, 2).join(', ');
      }
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Geocoding failed", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export const searchLocationCoords = async (query: string): Promise<{lat: number, lng: number, name: string} | null> => {
  try {
    let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    if (!response.ok) return null;
    let data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name.split(',').slice(0, 2).join(', ')
      };
    }
    
    // Fallback 1: First and last parts (City, State)
    const parts = query.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length > 2) {
      const fallbackQuery = `${parts[0]}, ${parts[parts.length - 1]}`;
      response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`);
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: data[0].display_name.split(',').slice(0, 2).join(', ')
          };
        }
      }
    }
    
    // Fallback 2: First part only (City only)
    if (parts.length > 1) {
      const fallbackQuery2 = parts[0];
      response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery2)}&format=json&limit=1`);
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: data[0].display_name.split(',').slice(0, 2).join(', ')
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Search failed", err);
    return null;
  }
};
