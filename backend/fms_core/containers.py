from typing import Dict, List, Tuple
from .coordinates import CoordinateSpec, alphas, ints, validate_and_normalize_coordinates


__all__ = [
    "ContainerSpec",

    "CONTAINER_SPEC_INFINIUM_GS_24_BEADCHIP",
    "CONTAINER_SPEC_DNBSEQ_G400_FLOWCELL",
    "CONTAINER_SPEC_DNBSEQ_T7_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_1_5B_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_10B_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_25B_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_SP_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_S1_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_S2_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_NOVASEQ_S4_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_MISEQ_V2_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_MISEQ_V3_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_MISEQ_MICRO_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_MISEQ_NANO_FLOWCELL",
    "CONTAINER_SPEC_ILLUMINA_ISEQ_100_FLOWCELL",
    "CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_PMRA",
    "CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_UKBB",
    "CONTAINER_SPEC_96_WELL_PLATE",
    "CONTAINER_SPEC_384_WELL_PLATE",
    "CONTAINER_SPEC_TUBE",
    "CONTAINER_SPEC_TUBE_STRIP_2X1",
    "CONTAINER_SPEC_TUBE_STRIP_3X1",
    "CONTAINER_SPEC_TUBE_STRIP_4X1",
    "CONTAINER_SPEC_TUBE_STRIP_5X1",
    "CONTAINER_SPEC_TUBE_STRIP_6X1",
    "CONTAINER_SPEC_TUBE_STRIP_7X1",
    "CONTAINER_SPEC_TUBE_STRIP_8X1",
    "CONTAINER_SPEC_TUBE_BOX_3X3",
    "CONTAINER_SPEC_TUBE_BOX_6X6",
    "CONTAINER_SPEC_TUBE_BOX_7X7",
    "CONTAINER_SPEC_TUBE_BOX_8X8",
    "CONTAINER_SPEC_TUBE_BOX_9X9",
    "CONTAINER_SPEC_TUBE_BOX_10X10",
    "CONTAINER_SPEC_TUBE_BOX_21X10",
    "CONTAINER_SPEC_TUBE_RACK_8X12",
    "CONTAINER_SPEC_DRAWER",
    "CONTAINER_SPEC_FREEZER_RACK_2X4",
    "CONTAINER_SPEC_FREEZER_RACK_3X4",
    "CONTAINER_SPEC_FREEZER_RACK_4X4",
    "CONTAINER_SPEC_FREEZER_RACK_4X6",
    "CONTAINER_SPEC_FREEZER_RACK_5X4",
    "CONTAINER_SPEC_FREEZER_RACK_6X4",
    "CONTAINER_SPEC_FREEZER_RACK_7X4",
    "CONTAINER_SPEC_FREEZER_RACK_10X5",
    "CONTAINER_SPEC_FREEZER_RACK_8X6",
    "CONTAINER_SPEC_FREEZER_RACK_11X6",
    "CONTAINER_SPEC_FREEZER_RACK_16X6",
    "CONTAINER_SPEC_FREEZER_RACK_11X7",
    "CONTAINER_SPEC_FREEZER_3_SHELVES",
    "CONTAINER_SPEC_FREEZER_4_SHELVES",
    "CONTAINER_SPEC_FREEZER_5_SHELVES",
    "CONTAINER_SPEC_ROOM",
    "CONTAINER_SPEC_BOX",

    "CONTAINER_KIND_SPECS",
    "CONTAINER_KIND_CHOICES",

    "RUN_CONTAINER_KINDS",
    "SAMPLE_CONTAINER_KINDS",
    "NON_SAMPLE_CONTAINER_KINDS",
    "SAMPLE_CONTAINER_KINDS_WITH_COORDS",
    "PARENT_CONTAINER_KINDS",
]


class ContainerSpec:
    container_specs: List["ContainerSpec"] = []

    def __init__(self, container_kind_id: str, coordinate_spec: CoordinateSpec, coordinate_overlap_allowed: bool,
                 children: Tuple["ContainerSpec", ...], is_run_container: bool):
        self._container_kind_id = container_kind_id
        self._coordinate_spec = coordinate_spec
        self._coordinate_overlap_allowed = coordinate_overlap_allowed
        self._is_run_container = is_run_container
        self._children = children
        for c in children:
            c.register_parent(self)

        self._is_child_of = []

        ContainerSpec.container_specs.append(self)

    def register_parent(self, parent: "ContainerSpec"):
        self._is_child_of.append(parent)

    def add_child(self, spec: "ContainerSpec"):
        self._children = (*self._children, spec)

    @property
    def is_source(self) -> bool:
        return not self._is_child_of

    @property
    def container_kind_id(self) -> str:
        return self._container_kind_id

    @property
    def coordinate_spec(self) -> CoordinateSpec:
        return self._coordinate_spec

    @property
    def requires_coordinates(self) -> bool:
        return bool(self._coordinate_spec)

    @property
    def coordinate_overlap_allowed(self) -> bool:
        return self._coordinate_overlap_allowed

    @property
    def children(self) -> Tuple["ContainerSpec", ...]:
        return self._children

    @property
    def is_run_container(self) -> bool:
        return self._is_run_container

    @property
    def sample_holding(self) -> bool:
        return len(self._children) == 0

    def can_hold_kind(self, kind_id: str):
        return next((c for c in self._children if c.container_kind_id == kind_id), None) is not None

    def validate_and_normalize_coordinates(self, coordinates: str) -> str:
        return validate_and_normalize_coordinates(coordinates, self._coordinate_spec)

    def serialize(self) -> dict:
        return {
            "id": self._container_kind_id,
            "coordinate_spec": self._coordinate_spec,
            "coordinate_overlap_allowed": self._coordinate_overlap_allowed,
            "children_ids": [c.container_kind_id for c in self._children],
            "is_source": self.is_source,
            "is_run_container": self._is_run_container,
        }

    def __eq__(self, other):
        return isinstance(other, ContainerSpec) and other.container_kind_id == self.container_kind_id

    def __str__(self):
        return self.container_kind_id


# Run Containers

CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_PMRA = ContainerSpec(
    container_kind_id="axiom 96-format array PMRA",
    coordinate_spec=(alphas(8), ints(12, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(), # Leaf node; sample-holding
    is_run_container=True,
)

CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_UKBB = ContainerSpec(
    container_kind_id="axiom 96-format array UKBB",
    coordinate_spec=(alphas(8), ints(12, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(), # Leaf node; sample-holding
    is_run_container=True,
)

CONTAINER_SPEC_INFINIUM_GS_24_BEADCHIP = ContainerSpec(
    container_kind_id="infinium gs 24 beadchip",
    coordinate_spec=(alphas(12), ints(2, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=True,
)

CONTAINER_SPEC_DNBSEQ_G400_FLOWCELL = ContainerSpec(
    container_kind_id="dnbseq-g400 flowcell",
    coordinate_spec=(alphas(1), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=True,
)

CONTAINER_SPEC_DNBSEQ_T7_FLOWCELL = ContainerSpec(
    container_kind_id="dnbseq-t7 flowcell",
    coordinate_spec=(alphas(1), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_1_5B_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-x-1.5b flowcell",
     coordinate_spec=(alphas(1), ints(2, pad_to=2)), #2 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_10B_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-x-10b flowcell",
     coordinate_spec=(alphas(1), ints(8, pad_to=2)), #8 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_25B_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-x-25b flowcell",
     coordinate_spec=(alphas(1), ints(8, pad_to=2)), #8 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_SP_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-sp flowcell",
     coordinate_spec=(alphas(1), ints(2, pad_to=2)), #2 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_S1_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-s1 flowcell",
     coordinate_spec=(alphas(1), ints(2, pad_to=2)), #2 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_S2_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-s2 flowcell",
     coordinate_spec=(alphas(1), ints(2, pad_to=2)), #2 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_NOVASEQ_S4_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-novaseq-s4 flowcell",
     coordinate_spec=(alphas(1), ints(4, pad_to=2)), #4 lanes
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_MISEQ_V2_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-miseq-v2 flowcell",
     coordinate_spec=(alphas(1), ints(1, pad_to=2)), #1 lane
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_MISEQ_V3_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-miseq-v3 flowcell",
     coordinate_spec=(alphas(1), ints(1, pad_to=2)), #1 lane
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_MISEQ_MICRO_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-miseq-micro flowcell",
     coordinate_spec=(alphas(1), ints(1, pad_to=2)), #1 lane
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_MISEQ_NANO_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-miseq-nano flowcell",
     coordinate_spec=(alphas(1), ints(1, pad_to=2)), #1 lane
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

CONTAINER_SPEC_ILLUMINA_ISEQ_100_FLOWCELL = ContainerSpec(
     container_kind_id="illumina-iseq-100 flowcell",
     coordinate_spec=(alphas(1), ints(1, pad_to=2)), #1 lane
     coordinate_overlap_allowed=False,
     children=(),  # Leaf node; sample-holding
     is_run_container=True,
)

RUN_CONTAINER_SPECS = (
    CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_PMRA,
    CONTAINER_SPEC_AXIOM_96_FORMAT_ARRAY_UKBB,
    CONTAINER_SPEC_INFINIUM_GS_24_BEADCHIP,
    CONTAINER_SPEC_DNBSEQ_T7_FLOWCELL,
    CONTAINER_SPEC_DNBSEQ_G400_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_1_5B_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_10B_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_X_25B_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_SP_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_S1_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_S2_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_NOVASEQ_S4_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_MISEQ_V2_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_MISEQ_V3_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_MISEQ_MICRO_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_MISEQ_NANO_FLOWCELL,
    CONTAINER_SPEC_ILLUMINA_ISEQ_100_FLOWCELL,
)

# Containers
CONTAINER_SPEC_TUBE = ContainerSpec(
    container_kind_id="tube",
    coordinate_spec=(),
    coordinate_overlap_allowed=False,  # Only one sample can be in the tube at a time
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_2X1 = ContainerSpec(
    container_kind_id="tube strip 2x1",
    coordinate_spec=(alphas(2), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_3X1 = ContainerSpec(
    container_kind_id="tube strip 3x1",
    coordinate_spec=(alphas(3), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_4X1 = ContainerSpec(
    container_kind_id="tube strip 4x1",
    coordinate_spec=(alphas(4), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_5X1 = ContainerSpec(
    container_kind_id="tube strip 5x1",
    coordinate_spec=(alphas(5), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_6X1 = ContainerSpec(
    container_kind_id="tube strip 6x1",
    coordinate_spec=(alphas(6), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_7X1 = ContainerSpec(
    container_kind_id="tube strip 7x1",
    coordinate_spec=(alphas(7), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_STRIP_8X1 = ContainerSpec(
    container_kind_id="tube strip 8x1",
    coordinate_spec=(alphas(8), ints(1, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

TUBE_STRIP_SPECS = (
    CONTAINER_SPEC_TUBE_STRIP_2X1,
    CONTAINER_SPEC_TUBE_STRIP_3X1,
    CONTAINER_SPEC_TUBE_STRIP_4X1,
    CONTAINER_SPEC_TUBE_STRIP_5X1,
    CONTAINER_SPEC_TUBE_STRIP_6X1,
    CONTAINER_SPEC_TUBE_STRIP_7X1,
    CONTAINER_SPEC_TUBE_STRIP_8X1,
)

CONTAINER_SPEC_96_WELL_PLATE = ContainerSpec(
    container_kind_id="96-well plate",
    coordinate_spec=(alphas(8), ints(12, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_384_WELL_PLATE = ContainerSpec(
    container_kind_id="384-well plate",
    coordinate_spec=(alphas(16), ints(24, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(),  # Leaf node; sample-holding
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_3X3 = ContainerSpec(
    container_kind_id="tube box 3x3",
    coordinate_spec=(alphas(3), ints(3, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_6X6 = ContainerSpec(
    container_kind_id="tube box 6x6",
    coordinate_spec=(alphas(6), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_7X7 = ContainerSpec(
    container_kind_id="tube box 7x7",
    coordinate_spec=(alphas(7), ints(7, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_8X8 = ContainerSpec(
    container_kind_id="tube box 8x8",
    coordinate_spec=(alphas(8), ints(8, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_9X9 = ContainerSpec(
    container_kind_id="tube box 9x9",
    coordinate_spec=(alphas(9), ints(9, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_10X10 = ContainerSpec(
    container_kind_id="tube box 10x10",
    coordinate_spec=(alphas(10), ints(10, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_BOX_21X10 = ContainerSpec(
    container_kind_id="tube box 21x10",
    coordinate_spec=(alphas(21), ints(10, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_RACK_4X6 = ContainerSpec(
    container_kind_id="tube rack 4x6",
    coordinate_spec=(alphas(4), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

CONTAINER_SPEC_TUBE_RACK_8X12 = ContainerSpec(
    container_kind_id="tube rack 8x12",
    coordinate_spec=(alphas(8), ints(12, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(CONTAINER_SPEC_TUBE,),
    is_run_container=False,
)

COMMON_CHILDREN = (
    CONTAINER_SPEC_96_WELL_PLATE,
    CONTAINER_SPEC_384_WELL_PLATE,
    CONTAINER_SPEC_TUBE_BOX_3X3,
    CONTAINER_SPEC_TUBE_BOX_6X6,
    CONTAINER_SPEC_TUBE_BOX_7X7,
    CONTAINER_SPEC_TUBE_BOX_8X8,
    CONTAINER_SPEC_TUBE_BOX_9X9,
    CONTAINER_SPEC_TUBE_BOX_10X10,
    CONTAINER_SPEC_TUBE_BOX_21X10,
    CONTAINER_SPEC_TUBE_RACK_4X6,
    CONTAINER_SPEC_TUBE_RACK_8X12,
)

CONTAINER_SPEC_BOX = ContainerSpec(
    container_kind_id="box",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,
    children=(*COMMON_CHILDREN, *TUBE_STRIP_SPECS, *RUN_CONTAINER_SPECS, CONTAINER_SPEC_TUBE),
    is_run_container=False,
)

CONTAINER_SPEC_DRAWER = ContainerSpec(
    container_kind_id="drawer",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_2X4 = ContainerSpec(
    container_kind_id="freezer rack 2x4",
    coordinate_spec=(alphas(2), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_3X4 = ContainerSpec(
    container_kind_id="freezer rack 3x4",
    coordinate_spec=(alphas(3), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_4X4 = ContainerSpec(
    container_kind_id="freezer rack 4x4",
    coordinate_spec=(alphas(4), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_4X6 = ContainerSpec(
    container_kind_id="freezer rack 4x6",
    coordinate_spec=(alphas(4), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_5X4 = ContainerSpec(
    container_kind_id="freezer rack 5x4",
    coordinate_spec=(alphas(5), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_6X4 = ContainerSpec(
    container_kind_id="freezer rack 6x4",
    coordinate_spec=(alphas(6), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_7X4 = ContainerSpec(
    container_kind_id="freezer rack 7x4",
    coordinate_spec=(alphas(7), ints(4, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_10X5 = ContainerSpec(
    container_kind_id="freezer rack 10x5",
    coordinate_spec=(alphas(10), ints(5, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_8X6 = ContainerSpec(
    container_kind_id="freezer rack 8x6",
    coordinate_spec=(alphas(8), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_BOX, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_11X6 = ContainerSpec(
    container_kind_id="freezer rack 11x6",
    coordinate_spec=(alphas(11), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_16X6 = ContainerSpec(
    container_kind_id="freezer rack 16x6",
    coordinate_spec=(alphas(16), ints(6, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_RACK_11X7 = ContainerSpec(
    container_kind_id="freezer rack 11x7",
    coordinate_spec=(alphas(11), ints(7, pad_to=2)),
    coordinate_overlap_allowed=False,
    children=(*COMMON_CHILDREN, CONTAINER_SPEC_DRAWER),
    is_run_container=False,
)

FREEZER_RACK_SPECS = (
    CONTAINER_SPEC_FREEZER_RACK_2X4,
    CONTAINER_SPEC_FREEZER_RACK_3X4,
    CONTAINER_SPEC_FREEZER_RACK_4X4,
    CONTAINER_SPEC_FREEZER_RACK_4X6,
    CONTAINER_SPEC_FREEZER_RACK_5X4,
    CONTAINER_SPEC_FREEZER_RACK_6X4,
    CONTAINER_SPEC_FREEZER_RACK_7X4,
    CONTAINER_SPEC_FREEZER_RACK_10X5,
    CONTAINER_SPEC_FREEZER_RACK_8X6,
    CONTAINER_SPEC_FREEZER_RACK_11X6,
    CONTAINER_SPEC_FREEZER_RACK_16X6,
    CONTAINER_SPEC_FREEZER_RACK_11X7,
)

FREEZER_CHILDREN = (
    *COMMON_CHILDREN,
    *FREEZER_RACK_SPECS,
)

CONTAINER_SPEC_FREEZER_3_SHELVES = ContainerSpec(
    container_kind_id="freezer 3 shelves",
    coordinate_spec=(alphas(3), ints(1, pad_to=2)),  # TODO: I'd prefer if these were 1D
    coordinate_overlap_allowed=True,
    children=FREEZER_CHILDREN,
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_4_SHELVES = ContainerSpec(
    container_kind_id="freezer 4 shelves",
    coordinate_spec=(alphas(4), ints(1, pad_to=2)),  # TODO: I'd prefer if these were 1D
    coordinate_overlap_allowed=True,
    children=FREEZER_CHILDREN,
    is_run_container=False,
)

CONTAINER_SPEC_FREEZER_5_SHELVES = ContainerSpec(
    container_kind_id="freezer 5 shelves",
    coordinate_spec=(alphas(5), ints(1, pad_to=2)),  # TODO: I'd prefer if these were 1D
    coordinate_overlap_allowed=True,
    children=FREEZER_CHILDREN,
    is_run_container=False,
)

CONTAINER_SPEC_ROOM = ContainerSpec(
    container_kind_id="room",
    coordinate_spec=(),
    coordinate_overlap_allowed=True,
    children=(
        *RUN_CONTAINER_SPECS,
        *COMMON_CHILDREN,
        CONTAINER_SPEC_TUBE,
        *TUBE_STRIP_SPECS,
        CONTAINER_SPEC_FREEZER_3_SHELVES,
        CONTAINER_SPEC_FREEZER_4_SHELVES,
        CONTAINER_SPEC_FREEZER_5_SHELVES,
        *FREEZER_RACK_SPECS,
        CONTAINER_SPEC_BOX,
    ),
    is_run_container=False,
)

# Allow rooms to be nested
CONTAINER_SPEC_ROOM.add_child(CONTAINER_SPEC_ROOM)

CONTAINER_KIND_SPECS: Dict[str, ContainerSpec] = {c.container_kind_id: c for c in ContainerSpec.container_specs}

CONTAINER_KIND_CHOICES: Tuple[Tuple[str, str], ...] = tuple(
    (c.container_kind_id, c.container_kind_id)
    for c in ContainerSpec.container_specs
)

RUN_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                if c.is_run_container)

SAMPLE_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                if c.sample_holding)

SAMPLE_NON_RUN_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                if c.sample_holding and not c.is_run_container)

NON_SAMPLE_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                    if not c.sample_holding)

SAMPLE_CONTAINER_KINDS_WITH_COORDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                            if c.sample_holding and len(c.coordinate_spec) > 0)

PARENT_CONTAINER_KINDS: Tuple[str, ...] = tuple(c.container_kind_id for c in ContainerSpec.container_specs
                                                if c.children)