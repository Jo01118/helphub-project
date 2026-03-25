export const getIssueSuggestions = (categoryInput: string): string[] => {
  const cat = categoryInput.toLowerCase().trim();
  
  if (!cat) return [];

  if (cat.includes('animal') || cat.includes('dog') || cat.includes('cat') || cat.includes('cow') || cat.includes('bird')) {
    return ['Injured Animal', 'Stray Dog Problem', 'Animal Abuse', 'Dead Animal on Road', 'Animal Rescue Needed'];
  }
  
  if (cat.includes('road') || cat.includes('infrastructure') || cat.includes('pothole') || cat.includes('street')) {
    return ['Pothole', 'Broken Streetlight', 'Damaged Road Sign', 'Blocked Drain', 'Fallen Tree'];
  }
  
  if (cat.includes('waste') || cat.includes('garbage') || cat.includes('trash') || cat.includes('clean')) {
    return ['Garbage Dumping', 'Overflowing Bin', 'Dead Animal Smell', 'Hazardous Waste', 'Street Sweeping Need'];
  }

  if (cat.includes('water') || cat.includes('pipe') || cat.includes('leak') || cat.includes('flood')) {
    return ['Water Pipe Burst', 'No Water Supply', 'Contaminated Water', 'Street Flooding', 'Open Manhole'];
  }

  if (cat.includes('accident') || cat.includes('crash') || cat.includes('medical') || cat.includes('emergency')) {
    return ['Vehicle Collision', 'Pedestrian Injured', 'Medical Emergency', 'Fire Incident', 'Ambulance Request'];
  }

  if (cat.includes('electricity') || cat.includes('power') || cat.includes('wire') || cat.includes('pole')) {
    return ['Power Outage', 'Fallen Power Line', 'Sparking Transformer', 'Broken Pole'];
  }

  // Generic suggestions if no clear keyword is matched
  return ['General Maintenance', 'Safety Hazard', 'Public Disturbance', 'Other Issue'];
};
