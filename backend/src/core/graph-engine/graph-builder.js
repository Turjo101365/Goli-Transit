import { Graph } from './graph.js';

let graphInstance;

function addBidirectionalEdge(graph, { from, to, mode, weight, vehicles }) {
  const forward = graph.addEdge(from, to, mode, weight);
  for (const vehicle of vehicles) {
    forward.allowedVehicles.add(vehicle);
  }

  const reverse = graph.addEdge(to, from, mode, weight);
  for (const vehicle of vehicles) {
    reverse.allowedVehicles.add(vehicle);
  }
}

function seedGraph(graph) {
  const stableHubs = [
    { id: 'GULSHAN', label: 'Gulshan', latitude: 23.7925, longitude: 90.4078 },
    { id: 'BANANI', label: 'Banani', latitude: 23.7937, longitude: 90.4066 },
    { id: 'BARIDHARA', label: 'Baridhara', latitude: 23.8105, longitude: 90.4215 },
    { id: 'UTTARA', label: 'Uttara', latitude: 23.8759, longitude: 90.3795 },
    { id: 'AIRPORT', label: 'Airport', latitude: 23.8516, longitude: 90.4030 },
    { id: 'BASHUNDHARA', label: 'Bashundhara', latitude: 23.8167, longitude: 90.4266 },
    { id: 'MIRPUR', label: 'Mirpur', latitude: 23.8223, longitude: 90.3654 },
    { id: 'PALLABI', label: 'Pallabi', latitude: 23.8483, longitude: 90.3554 },
    { id: 'MOHAMMADPUR', label: 'Mohammadpur', latitude: 23.7639, longitude: 90.3589 },
    { id: 'ADABOR', label: 'Adabor', latitude: 23.7743, longitude: 90.3542 },
    { id: 'DHANMONDI', label: 'Dhanmondi', latitude: 23.7465, longitude: 90.3760 },
    { id: 'KALABAGAN', label: 'Kalabagan', latitude: 23.7420, longitude: 90.3851 },
    { id: 'FARMGATE', label: 'Farmgate', latitude: 23.7580, longitude: 90.3890 },
    { id: 'KARWAN_BAZAR', label: 'Karwan Bazar', latitude: 23.7511, longitude: 90.3922 },
    { id: 'SHAHBAGH', label: 'Shahbagh', latitude: 23.7396, longitude: 90.3953 },
    { id: 'RAMPURA', label: 'Rampura', latitude: 23.7630, longitude: 90.4246 },
    { id: 'BADDA', label: 'Badda', latitude: 23.7802, longitude: 90.4255 },
    { id: 'MALIBAGH', label: 'Malibagh', latitude: 23.7464, longitude: 90.4177 },
    { id: 'MOTIJHEEL', label: 'Motijheel', latitude: 23.7321, longitude: 90.4178 },
    { id: 'KAMALAPUR', label: 'Kamalapur', latitude: 23.7318, longitude: 90.4276 },
    { id: 'JATRABARI', label: 'Jatrabari', latitude: 23.7113, longitude: 90.4313 },
    { id: 'SAYEDABAD', label: 'Sayedabad', latitude: 23.7198, longitude: 90.4319 }
  ];

  for (const hub of stableHubs) {
    graph.addNode(hub.id, {
      label: hub.label,
      latitude: hub.latitude,
      longitude: hub.longitude
    });
  }

  const links = [
    { from: 'UTTARA', to: 'AIRPORT', mode: 'metro', weight: 8, vehicles: ['metro', 'car'] },
    { from: 'AIRPORT', to: 'BANANI', mode: 'metro', weight: 9, vehicles: ['metro', 'car'] },
    { from: 'BANANI', to: 'FARMGATE', mode: 'metro', weight: 10, vehicles: ['metro', 'car'] },
    { from: 'FARMGATE', to: 'SHAHBAGH', mode: 'metro', weight: 6, vehicles: ['metro', 'car'] },
    { from: 'SHAHBAGH', to: 'MOTIJHEEL', mode: 'metro', weight: 9, vehicles: ['metro', 'car'] },
    { from: 'MOTIJHEEL', to: 'KAMALAPUR', mode: 'metro', weight: 5, vehicles: ['metro', 'car'] },

    { from: 'PALLABI', to: 'MIRPUR', mode: 'bus', weight: 7, vehicles: ['bus', 'car'] },
    { from: 'MIRPUR', to: 'FARMGATE', mode: 'bus', weight: 10, vehicles: ['bus', 'car'] },
    { from: 'FARMGATE', to: 'KARWAN_BAZAR', mode: 'bus', weight: 4, vehicles: ['bus', 'car'] },
    { from: 'KARWAN_BAZAR', to: 'SHAHBAGH', mode: 'bus', weight: 5, vehicles: ['bus', 'car'] },
    { from: 'SHAHBAGH', to: 'MALIBAGH', mode: 'bus', weight: 8, vehicles: ['bus', 'car'] },
    { from: 'MALIBAGH', to: 'MOTIJHEEL', mode: 'bus', weight: 7, vehicles: ['bus', 'car'] },
    { from: 'MOTIJHEEL', to: 'SAYEDABAD', mode: 'bus', weight: 7, vehicles: ['bus', 'car'] },
    { from: 'SAYEDABAD', to: 'JATRABARI', mode: 'bus', weight: 4, vehicles: ['bus', 'car'] },

    { from: 'GULSHAN', to: 'BANANI', mode: 'bike', weight: 4, vehicles: ['bicycle', 'pedestrian'] },
    { from: 'GULSHAN', to: 'BADDA', mode: 'bike', weight: 6, vehicles: ['bicycle', 'pedestrian'] },
    { from: 'BADDA', to: 'RAMPURA', mode: 'bike', weight: 5, vehicles: ['bicycle', 'pedestrian'] },
    { from: 'RAMPURA', to: 'MALIBAGH', mode: 'bike', weight: 4, vehicles: ['bicycle', 'pedestrian'] },
    { from: 'BARIDHARA', to: 'BASHUNDHARA', mode: 'bike', weight: 5, vehicles: ['bicycle', 'pedestrian'] },
    { from: 'BASHUNDHARA', to: 'BADDA', mode: 'bike', weight: 6, vehicles: ['bicycle', 'pedestrian'] },

    { from: 'MOHAMMADPUR', to: 'ADABOR', mode: 'walk', weight: 4, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'ADABOR', to: 'MIRPUR', mode: 'walk', weight: 6, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'MOHAMMADPUR', to: 'DHANMONDI', mode: 'walk', weight: 5, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'DHANMONDI', to: 'KALABAGAN', mode: 'walk', weight: 3, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'KALABAGAN', to: 'FARMGATE', mode: 'walk', weight: 4, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'KALABAGAN', to: 'SHAHBAGH', mode: 'walk', weight: 4, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'MOTIJHEEL', to: 'KAMALAPUR', mode: 'walk', weight: 3, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'KAMALAPUR', to: 'SAYEDABAD', mode: 'walk', weight: 4, vehicles: ['pedestrian', 'bicycle'] },

    { from: 'GULSHAN', to: 'KARWAN_BAZAR', mode: 'bus', weight: 8, vehicles: ['bus', 'car'] },
    { from: 'BANANI', to: 'GULSHAN', mode: 'walk', weight: 2, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'BANANI', to: 'BARIDHARA', mode: 'walk', weight: 3, vehicles: ['pedestrian', 'bicycle'] },
    { from: 'GULSHAN', to: 'DHANMONDI', mode: 'bus', weight: 11, vehicles: ['bus', 'car'] },
    { from: 'MIRPUR', to: 'DHANMONDI', mode: 'bus', weight: 9, vehicles: ['bus', 'car'] },
    { from: 'DHANMONDI', to: 'SHAHBAGH', mode: 'bus', weight: 6, vehicles: ['bus', 'car'] },
    { from: 'RAMPURA', to: 'MOTIJHEEL', mode: 'bus', weight: 8, vehicles: ['bus', 'car'] }
  ];

  for (const link of links) {
    addBidirectionalEdge(graph, link);
  }
}

export function graphBuilder() {
  if (!graphInstance) {
    graphInstance = new Graph();
    seedGraph(graphInstance);
  }

  return graphInstance;
}