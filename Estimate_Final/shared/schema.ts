export interface SSRItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: string;
  category?: string;
}

export interface HierarchicalSSRItem extends SSRItem {
  level: number;
  parentCode?: string;
  fullDescription: string;
  hierarchy: string[];
  indentLevel: number;
}

export interface Estimate {
  id: string;
  projectName: string;
  location?: string;
  engineerName?: string;
  referenceNumber?: string;
  fileName?: string;
  status: string;
  excelData?: {
    sheetNames: string[];
    parts: Array<{ partNumber: number; costSheet: string; measurementSheet: string }>;
  };
}
