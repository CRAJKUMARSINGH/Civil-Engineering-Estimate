import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calculator, ChevronRight, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SSRItemSelectorConnected } from "./SSRItemSelectorConnected";
import { SSRItem, HierarchicalSSRItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "wouter";

interface TableRowData {
  serial: number;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
  amount: string;
  isSSRItem?: boolean;
  hierarchy?: string[]; // For hierarchical items
  level?: number; // For hierarchical items
}

export function ExcelTableWithSSR() {
  const { toast } = useToast();
  const [showSSRSelector, setShowSSRSelector] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const params = useParams();
  const estimateId = params.id as string;

  const { data: estimate, isLoading, isError } = useQuery({
    queryKey: [`/api/estimates/${estimateId}`],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  });

  const [tableData, setTableData] = useState<TableRowData[]>([
    {
      serial: 1,
      description: "Excavation in foundation",
      unit: "cum",
      quantity: "100.00",
      rate: "150.00",
      amount: "15,000.00",
    },
    {
      serial: 2,
      description: "Plain Cement Concrete 1:4:8",
      unit: "cum",
      quantity: "50.00",
      rate: "4,500.00",
      amount: "2,25,000.00",
    },
  ]);

  if (isLoading) {
    return <div>Loading estimate data...</div>;
  }

  if (isError) {
    return <div>Error loading estimate data</div>;
  }

  const toggleRowExpansion = (serial: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serial)) {
        newSet.delete(serial);
      } else {
        newSet.add(serial);
      }
      return newSet;
    });
  };

  const handleSSRItemSelected = (item: SSRItem) => {
    console.log('SSR item selected:', item);
    
    // Get next serial number
    const nextSerial = Math.max(...tableData.map(r => r.serial), 0) + 1;
    
    // Check if this is a hierarchical item
    if ('level' in item && 'hierarchy' in item) {
      const hierarchicalItem = item as HierarchicalSSRItem;
      
      // Add the SSR item to the table with hierarchical information
      const newRow: TableRowData = {
        serial: nextSerial,
        description: hierarchicalItem.fullDescription,
        unit: hierarchicalItem.unit,
        quantity: "",
        rate: parseFloat(hierarchicalItem.rate).toFixed(2),
        amount: "",
        isSSRItem: true,
        hierarchy: hierarchicalItem.hierarchy,
        level: hierarchicalItem.level,
      };
      
      setTableData([...tableData, newRow]);
    } else {
      // Add regular SSR item
      const newRow: TableRowData = {
        serial: nextSerial,
        description: item.description,
        unit: item.unit,
        quantity: "",
        rate: parseFloat(item.rate).toFixed(2),
        amount: "",
        isSSRItem: true,
      };
      
      setTableData([...tableData, newRow]);
    }
    
    toast({
      title: "SSR Item Added",
      description: `${item.code} - ${item.description} has been added to the cost abstract.`,
    });
  };

  const handleDeleteRow = (serial: number) => {
    setTableData(tableData.filter(row => row.serial !== serial));
    toast({
      title: "Row Deleted",
      description: "The item has been removed from the estimate.",
    });
  };

  const handleAddBlankRow = () => {
    const nextSerial = Math.max(...tableData.map(r => r.serial), 0) + 1;
    const newRow: TableRowData = {
      serial: nextSerial,
      description: "",
      unit: "",
      quantity: "",
      rate: "",
      amount: "",
    };
    setTableData([...tableData, newRow]);
  };

  const calculateTotal = () => {
    return tableData.reduce((total, row) => {
      const amount = parseFloat(row.amount.replace(/,/g, '')) || 0;
      return total + amount;
    }, 0).toFixed(2);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Cost Abstract - Part 1</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddBlankRow}
                data-testid="button-add-row"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSSRSelector(true)}
                data-testid="button-insert-ssr"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Insert SSR Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">S.No</TableHead>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24 text-right">Quantity</TableHead>
                  <TableHead className="w-24 text-right">Rate</TableHead>
                  <TableHead className="w-32 text-right">Amount</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.serial} className={row.isSSRItem ? 'bg-accent/20' : ''}>
                    <TableCell>
                      {row.hierarchy && row.hierarchy.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(row.serial)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(row.serial) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {row.serial}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start">
                        {row.level !== undefined && row.level > 0 && (
                          <div className="flex gap-1 mr-2 mt-1">
                            {Array.from({ length: row.level }).map((_, i) => (
                              <div key={i} className="w-3 h-3 border-r border-b border-gray-400"></div>
                            ))}
                          </div>
                        )}
                        <Input
                          defaultValue={row.description}
                          className="border-0 p-0 h-auto focus-visible:ring-0"
                          data-testid={`input-description-${row.serial}`}
                        />
                      </div>
                      {expandedRows.has(row.serial) && row.hierarchy && row.hierarchy.length > 1 && (
                        <div className="text-xs text-muted-foreground mt-1 ml-4">
                          <div className="font-medium">Hierarchy:</div>
                          <div className="ml-2">
                            {row.hierarchy.map((desc, index) => (
                              <div key={index} className="flex items-center">
                                <div className="w-3 h-3 border-r border-b border-gray-400 mr-1"></div>
                                {desc}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={row.unit}
                        className="border-0 p-0 h-auto focus-visible:ring-0"
                        data-testid={`input-unit-${row.serial}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        defaultValue={row.quantity}
                        className="border-0 p-0 h-auto focus-visible:ring-0 text-right font-mono"
                        data-testid={`input-quantity-${row.serial}`}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        defaultValue={row.rate}
                        className="border-0 p-0 h-auto focus-visible:ring-0 text-right font-mono"
                        data-testid={`input-rate-${row.serial}`}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.amount || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(row.serial)}
                        data-testid={`button-delete-${row.serial}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted">
                  <TableCell colSpan={6} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{calculateTotal()}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SSRItemSelectorConnected
        open={showSSRSelector}
        onOpenChange={setShowSSRSelector}
        onSelect={handleSSRItemSelected}
      />
    </>
  );
}