from typing import Dict, List, Tuple
from .coordinates import CoordinateSpec, alphas, ints, validate_and_normalize_coordinates


# TODO: Python 3.7: dataclass
class ContainerSpec:
    container_specs: List["ContainerSpec"] = []

    def __init__(self, container_kind_id: str, coordinate_spec: CoordinateSpec, coordinate_overlap_allowed: bool,
                 children: Tuple["ContainerSpec", ...]):
        self._container_kind_id = container_kind_id
        self._coordinate_spec = coordinate_spec
        self._coordinate_overlap_allowed = coordinate_overlap_allowed
        self._children = children

        ContainerSpec.container_specs.append(self)

    @property
    def container_kind_id(self) -> str:
        return self._container_kind_id

    @property
    def coordinate_spec(self) -> CoordinateSpec:
        return self._coordinate_spec

    @property
    def coordinate_overlap_allowed(self) -> bool:
        return self._coordinate_overlap_allowed

    @property
    def children(self) -> Tuple["ContainerSpec", ...]:
        return self._children

    @property
    def sample_holding(self) -> bool:
        return len(self._children) == 0

    def can_hold_kind(self, kind_id: str):
        return next((c for c in self._children if c.container_kind_id == kind_id), None) is not None

    def validate_and_normalize_coordinates(self, coordinates: str) -> str:
        return validate_and_normalize_coordinates(coordinates, self._coordinate_spec)


CONTAINER_SPEC_96_WELL_PLATE = ContainerSpec(
    container_kind_id="96-well plate",
    coordinate_spec=(alphas(8), ints(12)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
)

CONTAINER_SPEC_384_WELL_PLATE = ContainerSpec(
    container_kind_id="384-well plate",
    coordinate_spec=(alphas(16), ints(24)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
)

CONTAINER_SPEC_TUBE = ContainerSpec(
    container_kind_id="tube",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,  # No coordinate system - everything is in the same tube
    children=(),  # Leaf node; sample-holding
)

CONTAINER_SPEC_TUBE_BOX_9X9 = ContainerSpec(
    container_kind_id="tube box 9x9",
    coordinate_spec=(alphas(9), ints(9)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
)

CONTAINER_SPEC_TUBE_BOX_10X10 = ContainerSpec(
    container_kind_id="tube box 10x10",
    coordinate_spec=(alphas(10), ints(10)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
)

CONTAINER_SPEC_TUBE_RACK_8X12 = ContainerSpec(
    container_kind_id="tube rack 8x12",
    coordinate_spec=(alphas(8), ints(12)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
)

COMMON_CHILDREN = (
    CONTAINER_SPEC_96_WELL_PLATE,
    CONTAINER_SPEC_384_WELL_PLATE,
    CONTAINER_SPEC_TUBE_BOX_9X9,
    CONTAINER_SPEC_TUBE_BOX_10X10,
    CONTAINER_SPEC_TUBE_RACK_8X12,
)

CONTAINER_SPEC_DRAWER = ContainerSpec(
    container_kind_id="drawer",
    children=COMMON_CHILDREN,
)  # TODO

CONTAINER_SPEC_FREEZER_RACK = ContainerSpec(
    container_kind_id="freezer rack",
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_DRAWER),
)

CONTAINER_SPEC_FREEZER = ContainerSpec(
    container_kind_id="freezer",
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_FREEZER_RACK),
)

CONTAINER_SPEC_ROOM = ContainerSpec(
    container_kind_id="room",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_FREEZER, CONTAINER_SPEC_FREEZER_RACK),
)

CONTAINER_SPEC_BOX = ContainerSpec(
    container_kind_id="box",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_TUBE),
)

CONTAINER_KIND_SPECS: Dict[str, ContainerSpec] = {c.container_kind_id: c for c in ContainerSpec.container_specs}

CONTAINER_KIND_CHOICES: Tuple[Tuple[str, str], ...] = tuple(
    (c.container_kind_id, c.container_kind_id)
    for c in ContainerSpec.container_specs
)

SAMPLE_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                if c.sample_holding)
