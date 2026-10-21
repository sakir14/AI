import heapq
import math


SOURCE = "Sumber air (simulasi)"
BRANCHES = {
    "Cabang A (simulasi)": (2.0, 2.0),
    "Cabang B (simulasi)": (2.0, 0.0),
    "Cabang C (simulasi)": (2.0, -2.0),
}

VILLAGE_POINTS = {
    "Mundu": (3.0, 3.0),
    "Kaplonganlor": (4.0, 2.0),
    "Tanjungpura": (5.0, 3.0),
    "Tanjungsari": (3.0, 1.0),
    "Pringgacala": (4.0, 0.0),
    "Benda": (5.0, 1.0),
    "Sendang": (4.0, -1.0),
    "Karangampel Kidul": (3.0, -3.0),
    "Karangampel": (4.0, -2.0),
    "Dukuh Jeruk": (5.0, -3.0),
    "Dukuh Tengah": (6.0, -2.0),
}

VILLAGE_BRANCH = {
    "Mundu": "Cabang A (simulasi)",
    "Kaplonganlor": "Cabang A (simulasi)",
    "Tanjungpura": "Cabang A (simulasi)",
    "Tanjungsari": "Cabang B (simulasi)",
    "Pringgacala": "Cabang B (simulasi)",
    "Benda": "Cabang B (simulasi)",
    "Sendang": "Cabang B (simulasi)",
    "Karangampel Kidul": "Cabang C (simulasi)",
    "Karangampel": "Cabang C (simulasi)",
    "Dukuh Jeruk": "Cabang C (simulasi)",
    "Dukuh Tengah": "Cabang C (simulasi)",
}


def _distance(first: tuple[float, float], second: tuple[float, float]) -> float:
    return math.dist(first, second)


def _build_graph() -> tuple[dict[str, list[tuple[str, float]]], dict[str, tuple[float, float]]]:
    positions = {SOURCE: (0.0, 0.0), **BRANCHES, **VILLAGE_POINTS}
    graph = {node: [] for node in positions}

    def connect(first: str, second: str) -> None:
        cost = _distance(positions[first], positions[second])
        graph[first].append((second, cost))
        graph[second].append((first, cost))

    for branch in BRANCHES:
        connect(SOURCE, branch)
    connect("Cabang A (simulasi)", "Cabang B (simulasi)")
    connect("Cabang B (simulasi)", "Cabang C (simulasi)")
    for village, branch in VILLAGE_BRANCH.items():
        connect(branch, village)

    return graph, positions


def find_route(target_village: str) -> dict | None:
    graph, positions = _build_graph()
    if target_village not in VILLAGE_POINTS:
        return None

    initial_heuristic = _distance(positions[SOURCE], positions[target_village])
    frontier = [(initial_heuristic, SOURCE)]
    came_from: dict[str, str | None] = {SOURCE: None}
    cost_so_far = {SOURCE: 0.0}
    expanded_nodes = 0

    while frontier:
        _, current = heapq.heappop(frontier)
        expanded_nodes += 1
        if current == target_village:
            break

        for neighbor, edge_cost in graph[current]:
            new_cost = cost_so_far[current] + edge_cost
            if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                cost_so_far[neighbor] = new_cost
                heuristic = _distance(positions[neighbor], positions[target_village])
                heapq.heappush(frontier, (new_cost + heuristic, neighbor))
                came_from[neighbor] = current

    if target_village not in came_from:
        return None

    path = []
    node = target_village
    while node is not None:
        path.append(node)
        node = came_from[node]
    path.reverse()

    return {
        "algorithm": "A* Search",
        "path": path,
        "cost_units": round(cost_so_far[target_village], 2),
        "expanded_nodes": expanded_nodes,
        "is_simulation": True,
        "notice": "Graf dan koordinat adalah simulasi, bukan jaringan saluran terverifikasi.",
    }
