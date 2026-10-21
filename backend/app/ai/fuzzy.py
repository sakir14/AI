from itertools import product


AVAILABILITY_SETS = {
    "rendah": (0, 0, 35, 60),
    "sedang": (35, 60, 85),
    "tinggi": (60, 85, 100, 100),
}

DEMAND_SETS = {
    "rendah": (0, 0, 30, 55),
    "sedang": (30, 55, 80),
    "tinggi": (55, 80, 100, 100),
}

PRIORITY_SETS = {
    "rendah": (0, 0, 20, 40),
    "sedang": (20, 45, 70),
    "tinggi": (50, 70, 90),
    "sangat_tinggi": (75, 90, 100, 100),
}

RULE_TABLE = {
    "rendah": {"rendah": "sedang", "sedang": "tinggi", "tinggi": "sangat_tinggi"},
    "sedang": {"rendah": "rendah", "sedang": "sedang", "tinggi": "tinggi"},
    "tinggi": {"rendah": "rendah", "sedang": "rendah", "tinggi": "sedang"},
}


def _membership(value: float, points: tuple[int, ...]) -> float:
    if len(points) == 3:
        left, peak, right = points
        points = (left, peak, peak, right)

    left, left_top, right_top, right = points

    if value < left or value > right:
        return 0.0
    if left_top <= value <= right_top:
        return 1.0
    if left < value < left_top:
        return (value - left) / (left_top - left)
    if right_top < value < right:
        return (right - value) / (right - right_top)
    return 0.0


def _label_priority(score: float) -> str:
    if score <= 25:
        return "rendah"
    if score <= 50:
        return "sedang"
    if score <= 75:
        return "tinggi"
    return "sangat_tinggi"


def analyze_priority(water_availability: float, water_demand: float) -> dict:
    water_availability = max(0.0, min(100.0, float(water_availability)))
    water_demand = max(0.0, min(100.0, float(water_demand)))
    availability_membership = {
        label: _membership(water_availability, points)
        for label, points in AVAILABILITY_SETS.items()
    }
    demand_membership = {
        label: _membership(water_demand, points)
        for label, points in DEMAND_SETS.items()
    }

    rules = []
    output_strengths = {label: 0.0 for label in PRIORITY_SETS}
    for availability_label, demand_label in product(
        AVAILABILITY_SETS, DEMAND_SETS
    ):
        activation = min(
            availability_membership[availability_label],
            demand_membership[demand_label],
        )
        if activation == 0:
            continue

        priority_label = RULE_TABLE[availability_label][demand_label]
        output_strengths[priority_label] = max(
            output_strengths[priority_label], activation
        )
        rules.append(
            {
                "text": (
                    f"Jika ketersediaan {availability_label} dan kebutuhan "
                    f"{demand_label}, maka prioritas {priority_label.replace('_', ' ')}."
                ),
                "activation": round(activation, 4),
            }
        )

    weighted_total = 0.0
    membership_total = 0.0
    for output_value in range(101):
        aggregate = max(
            min(
                output_strengths[label],
                _membership(output_value, points),
            )
            for label, points in PRIORITY_SETS.items()
        )
        weighted_total += output_value * aggregate
        membership_total += aggregate

    score = weighted_total / membership_total if membership_total else 0.0
    return {
        "score": round(score, 2),
        "category": _label_priority(score),
        "input_membership": {
            "water_availability": {
                key: round(value, 4)
                for key, value in availability_membership.items()
            },
            "water_demand": {
                key: round(value, 4) for key, value in demand_membership.items()
            },
        },
        "active_rules": rules,
        "defuzzification": "centroid",
    }
