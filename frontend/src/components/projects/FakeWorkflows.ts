/*
    Temporary mock workflow objects for development.
*/

export interface FakeWorkflowStep {
    name: string
    protocol?: string
}

export interface FakeWorkflow {
    id: number
    name: string
    structure: string
    steps: FakeWorkflowStep[]
}

export const fakeWorkflows: FakeWorkflow[] = [
	{
		id: 1,
		name: "PCR-free Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (DNA)", protocol: "Extraction" },
			{ name: "Sample QC", protocol: "Quality Control"},
			{ name: "Normalization (Sample)", protocol: "Normalization"},
			{ name: "Library Preparation (PCR-free, Illumina)",protocol: "Library Preparation"},
			{ name: "Library QC", protocol: "Quality Control"},
			{ name: "Normalization (Library)", protocol: "Normalization" },
			{ name: "Pooling", protocol: "Pooling"},
			{ name: "Experiment Run Illumina", protocol: "Sequencing"}
		]
	},
	{
		id: 2,
		name: "PCR-enriched Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (DNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (PCR-enriched, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 3,
		name: "WGBS Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (DNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (WGBS, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 4,
		name: "RNASeq Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (RNASeq, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 5,
		name: "miRNA Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (miRNA, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 6,
		name: "16S Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (16S, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 7,
		name: "18S Illumina",
		structure: "Basic Illumina",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (18S, Illumina)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 8,
		name: "PCR-free DNBSEQ",
		structure: "Basic DNBSEQ",
		steps: [
			{ name: "Extraction (DNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (PCR-free, DNBSEQ)" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 9,
		name: "PCR-enriched Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (DNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (PCR-enriched, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 10,
		name: "WGBS Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (DNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (WGBS, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 11,
		name: "RNASeq Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (RNASeq, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 12,
		name: "miRNA Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (miRNA, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 13,
		name: "16S Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (16S, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 14,
		name: "18S Conversion DNBSEQ",
		structure: "Conversion to DNBSEQ",
		steps: [
			{ name: "Extraction (RNA)" },
			{ name: "Sample QC" },
			{ name: "Normalization (Sample)" },
			{ name: "Library Preparation (18S, Illumina)" },
			{ name: "Library QC" },
			{ name: "Library Conversion" },
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	},
	{
		id: 15,
		name: "Ready-to-Sequence Illumina",
		structure: "Ready-to-Sequence",
		steps: [
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run Illumina" }
		]
	},
	{
		id: 16,
		name: "Ready-to-Sequence DNBSEQ",
		structure: "Ready-to-Sequence",
		steps: [
			{ name: "Library QC" },
			{ name: "Normalization (Library)" },
			{ name: "Pooling" },
			{ name: "Experiment Run DNBSEQ" }
		]
	}
]










