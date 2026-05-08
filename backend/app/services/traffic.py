from geopy.distance import geodesic

# Abstraction layer — swap get_travel_time() for real Maps API later
# without touching any scheduling logic

AVG_SPEED_KMH = 40  # urban average

def get_travel_time(origin: tuple, dest: tuple) -> float:
    """
    Returns estimated travel time in minutes.
    origin/dest: (lat, lng) tuples
    Uses Haversine distance × 1.3 road factor / avg speed
    """
    straight_km = geodesic(origin, dest).km
    road_km = straight_km * 1.3          # road-distance fudge factor
    time_min = (road_km / AVG_SPEED_KMH) * 60
    return round(time_min, 2)