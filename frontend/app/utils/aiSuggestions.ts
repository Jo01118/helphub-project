export const getIssueSuggestions = (categoryInput: string): string[] => {
  const cat = categoryInput.toLowerCase().trim();
  
  if (!cat) return [];

  if (cat.includes('animal') || cat.includes('dog') || cat.includes('cat') || cat.includes('cow') || cat.includes('bird') || cat.includes('wildlife')) {
    return ['Injured Animal', 'Stray Dog Problem', 'Animal Abuse', 'Dead Animal on Road', 'Animal Rescue Needed', 'Aggressive Animal', 'Trapped Animal'];
  }
  
  if (cat.includes('road') || cat.includes('infrastructure') || cat.includes('pothole') || cat.includes('street') || cat.includes('bridge') || cat.includes('path')) {
    return ['Pothole', 'Broken Streetlight', 'Damaged Road Sign', 'Blocked Drain', 'Fallen Tree', 'Damaged Footpath', 'Open Pothole Hazard', 'Traffic Light Broken'];
  }
  
  if (cat.includes('waste') || cat.includes('garbage') || cat.includes('trash') || cat.includes('clean') || cat.includes('dump') || cat.includes('pollution')) {
    return ['Garbage Dumping', 'Overflowing Bin', 'Dead Animal Smell', 'Hazardous Waste', 'Street Sweeping Need', 'Illegal Dumping', 'River/Lake Pollution'];
  }

  if (cat.includes('water') || cat.includes('pipe') || cat.includes('leak') || cat.includes('flood') || cat.includes('sewage') || cat.includes('drain')) {
    return ['Water Pipe Burst', 'No Water Supply', 'Contaminated Water', 'Street Flooding', 'Open Manhole', 'Sewage Leak', 'Blocked Drainage'];
  }

  if (cat.includes('accident') || cat.includes('crash') || cat.includes('medical') || cat.includes('emergency') || cat.includes('fire') || cat.includes('injury')) {
    return ['Vehicle Collision', 'Pedestrian Injured', 'Medical Emergency', 'Fire Incident', 'Ambulance Request', 'Gas Leak Hazard', 'Building Collapse'];
  }

  if (cat.includes('electricity') || cat.includes('power') || cat.includes('wire') || cat.includes('pole') || cat.includes('shock')) {
    return ['Power Outage', 'Fallen Power Line', 'Sparking Transformer', 'Broken Pole', 'Open Electrical Box', 'Street Light Outage'];
  }

  if (cat.includes('noise') || cat.includes('sound') || cat.includes('disturbance') || cat.includes('loud')) {
    return ['Loud Music/Party', 'Construction Noise', 'Industrial Noise', 'Vehicle Horn Nuisance'];
  }

  if (cat.includes('crime') || cat.includes('theft') || cat.includes('robbery') || cat.includes('police') || cat.includes('assault')) {
    return ['Theft/Robbery', 'Vandalism', 'Suspicious Activity', 'Assault/Violence', 'Harassment'];
  }

  // Generic suggestions if no clear keyword is matched
  return ['General Maintenance', 'Safety Hazard', 'Public Disturbance', 'Other Application Issue', 'Need Volunteer Assistance', 'Report Infrastructure Damage'];
};
