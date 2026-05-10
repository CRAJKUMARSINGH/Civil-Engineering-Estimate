import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calculator, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SSRItemSelectorConnected } from "./SSRItemSelectorConnected";
import { SSRItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ExcelSheetViewerProps {
  estimateId: string;
  sheetName: string;
  sheetType: "cost" | "measurement" | "other";
}

interface SheetRow {
  [key: string]: any;
}

export function ExcelSheetViewer({ estimateId, sheetName, sheetType }: ExcelSheetViewerProps) {
  const { toast } = useToast();
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSSRSelector, setShowSSRSelector] = useState(false);

  useEffect(() => {
    fetchSheetData();
  }, [estimateId, sheetName]);

  const fetchSheetData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch actual sheet data from the server
      try {
        const response = await fetch(`/api/estimates/${estimateId}/sheets/${encodeURIComponent(sheetName)}`);
        if (response.ok) {
          const data = await response.json();
          setSheetData(data.data);
          setHeaders(data.headers);
          return;
        }
      } catch (apiError) {
        console.log("API fetch failed, using mock data:", apiError);
      }
      
      // Fallback to mock data
      const mockData = generateMockSheetData(sheetType, sheetName);
      setSheetData(mockData.data);
      setHeaders(mockData.headers);
      
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast({
        title: "Error",
        description: "Failed to load sheet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockSheetData = (type: string, name: string) => {
    if (type === "cost") {
      return {
        headers: ["S.No", "Description", "Unit", "Quantity", "Rate", "Amount"],
        data: [
          {
            "S.No": 1,
            "Description": "Excavation in foundation",
            "Unit": "cum",
            "Quantity": "100.00",
            "Rate": "150.00",
            "Amount": "15,000.00"
          },
          {
            "S.No": 2,
            "Description": "Plain Cement Concrete 1:4:8",
            "Unit": "cum",
            "Quantity": "50.00",
            "Rate": "4,500.00",
            "Amount": "2,25,000.00"
          },
          {
            "S.No": 3,
            "Description": "Reinforced Cement Concrete M20",
            "Unit": "cum",
            "Quantity": "25.00",
            "Rate": "6,800.00",
            "Amount": "1,70,000.00"
          }
        ]
      };
    } else if (type === "measurement") {
      return {
        headers: ["S.No", "Description", "Length", "Breadth", "Height", "Quantity", "Unit"],
        data: [
          {
            "S.No": 1,
            "Description": "Foundation excavation",
            "Length": "20.00",
            "Breadth": "1.50",
            "Height": "3.00",
            "Quantity": "90.00",
            "Unit": "cum"
          },
          {
            "S.No": 2,
            "Description": "Footing concrete",
            "Length": "18.00",
            "Breadth": "1.20",
            "Height": "0.30",
            "Quantity": "6.48",
            "Unit": "cum"
          }
        ]
      };
    } else {
      return {
        headers: ["Item", "Value"],
        data: [
          { "Item": "Sheet Name", "Value": name },
          { "Item": "Type", "Value": type },
          { "Item": "Status", "Value": "Draft" }
        ]
      };
    }
  };

  const handleSSRItemSelected = (item: SSRItem) => {
    if (sheetType !== "cost") {
      toast({
        title: "Invalid Operation",
        description: "SSR items can only be added to cost sheets",
        variant: "destructive",
      });
      return;
    }

    // Get next serial number
    const nextSerial = Math.max(...sheetData.map(row => parseInt(row["S.No"]) || 0), 0) + 1;
    
    // Add the SSR item to the sheet
    const newRow: SheetRow = {
      "S.No": nextSerial,
      "Description": item.description,
      "Unit": item.unit,
      "Quantity": "",
      "Rate": parseFloat(item.rate).toFixed(2),
      "Amount": "",
      isSSRItem: true,
    };
    
    setSheetData([...sheetData, newRow]);
    
    toast({
      title: "SSR Item Added",
      description: `${item.code} - ${item.description} has been added to ${sheetName}.`,
    });
  };

  const handleDeleteRow = (index: number) => {
    const newData = sheetData.filter((_, i) => i !== index);
    setSheetData(newData);
    toast({
      title: "Row Deleted",
      description: "The item has been removed from the sheet.",
    });
  };

  const handleAddBlankRow = () => {
    if (sheetType === "cost") {
      const nextSerial = Math.max(...sheetData.map(row => parseInt(row["S.No"]) || 0), 0) + 1;
      const newRow: SheetRow = {
        "S.No": nextSerial,
        "Description": "",
        "Unit": "",
        "Quantity": "",
        "Rate": "",
        "Amount": "",
      };
      setSheetData([...sheetData, newRow]);
    } else if (sheetType === "measurement") {
      const nextSerial = Math.max(...sheetData.map(row => parseInt(row["S.No"]) || 0), 0) + 1;
      const newRow: SheetRow = {
        "S.No": nextSerial,
        "Description": "",
        "Length": "",
        "Breadth": "",
        "Height": "",
        "Quantity": "",
        "Unit": "",
      };
      setSheetData([...sheetData, newRow]);
    }
  };

  const calculateTotal = () => {
    if (sheetType !== "cost") return "0.00";
    
    return sheetData.reduce((total, row) => {
      const amount = parseFloat(String(row["Amount"]).replace(/,/g, '')) || 0;
      return total + amount;
    }, 0).toFixed(2);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading sheet data...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-medium">{sheetName}</h3>
            <p className="text-sm text-muted-foreground">
              {sheetType === "cost" ? "Cost Abstract" : 
               sheetType === "measurement" ? "Measurements" : "Sheet Data"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddBlankRow}
              data-testid="button-add-row"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
            {sheetType === "cost" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSSRSelector(true)}
                data-testid="button-insert-ssr"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Insert SSR Item
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              data-testid="button-download-sheet"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead 
                    key={index}
                    className={
                      header === "S.No" ? "w-16" :
                      header === "Description" ? "min-w-[300px]" :
                      header === "Unit" ? "w-20" :
                      header.includes("Amount") || header.includes("Rate") || header.includes("Quantity") ? "w-24 text-right" :
                      "w-24"
                    }
                  >
                    {header}
                  </TableHead>
                ))}
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheetData.map((row, index) => (
                <TableRow key={index} className={row.isSSRItem ? 'bg-accent/20' : ''}>
                  {headers.map((header, colIndex) => (
                    <TableCell key={colIndex} className={
                      header === "S.No" ? "text-center font-mono text-sm" :
                      header.includes("Amount") || header.includes("Rate") || header.includes("Quantity") ? "text-right" :
                      ""
                    }>
                      {header === "S.No" ? (
                        <span>{row[header]}</span>
                      ) : (
                        <Input
                          defaultValue={String(row[header] || "")}
                          className="border-0 p-0 h-auto focus-visible:ring-0"
                          style={{ 
                            textAlign: header.includes("Amount") || header.includes("Rate") || header.includes("Quantity") ? "right" : "left"
                          }}
                          data-testid={`input-${header.toLowerCase().replace(/\s+/g, '-')}-${index}`}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(index)}
                      data-testid={`button-delete-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sheetType === "cost" && (
                <TableRow className="font-semibold bg-muted">
                  <TableCell colSpan={headers.length - 1} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{calculateTotal()}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {sheetType === "cost" && (
        <SSRItemSelectorConnected
          open={showSSRSelector}
          onOpenChange={setShowSSRSelector}
          onSelect={handleSSRItemSelected}
        />
      )}
    </>
  );
}