import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SSRItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: string;
  category: string;
}

interface HierarchicalSSRItem extends SSRItem {
  level: number;
  parentCode?: string;
  fullDescription: string;
  hierarchy: string[];
  indentLevel: number;
}

const mockSSRItems: SSRItem[] = [
  {
    id: "1",
    code: "SSR-001",
    description: "Excavation in all types of soil",
    unit: "cum",
    rate: "150.00",
    category: "Earthwork",
  },
  {
    id: "2",
    code: "SSR-002",
    description: "Plain Cement Concrete 1:4:8 (40mm nominal size)",
    unit: "cum",
    rate: "4,500.00",
    category: "Concrete",
  },
  {
    id: "3",
    code: "SSR-003",
    description: "Reinforced Cement Concrete M20",
    unit: "cum",
    rate: "6,800.00",
    category: "Concrete",
  },
  {
    id: "4",
    code: "SSR-004",
    description: "Brick work in cement mortar 1:6",
    unit: "sqm",
    rate: "580.00",
    category: "Masonry",
  },
];

interface SSRItemSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: SSRItem) => void;
}

export function SSRItemSelector({ open, onOpenChange, onSelect }: SSRItemSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SSRItem | null>(null);
  const [viewMode, setViewMode] = useState<"flat" | "hierarchical">("flat");

  const filteredItems = mockSSRItems.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onOpenChange(false);
      setSelectedItem(null);
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select SSR Item</DialogTitle>
          <DialogDescription>
            Choose an item from the Standard Schedule of Rates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-ssr"
              />
            </div>
            <div className="flex gap-1">
              <Button 
                variant={viewMode === "flat" ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode("flat")}
              >
                Flat
              </Button>
              <Button 
                variant={viewMode === "hierarchical" ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode("hierarchical")}
              >
                Hierarchical
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-32">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Unit</TableHead>
                  <TableHead className="w-32 text-right">Rate (₹)</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover-elevate ${
                      selectedItem?.id === item.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                    data-testid={`row-ssr-${item.id}`}
                  >
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell className="text-sm">
                      {viewMode === "hierarchical" ? (
                        <div className="flex items-center">
                          <div className="flex gap-1 mr-2">
                            {Array.from({ length: (item as HierarchicalSSRItem).level || 0 }).map((_, i) => (
                              <div key={i} className="w-4 h-4 border-r border-b border-gray-400"></div>
                            ))}
                          </div>
                          {item.description}
                        </div>
                      ) : (
                        item.description
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.rate}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              setSelectedItem(null);
              setSearchQuery("");
            }}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedItem}
            data-testid="button-select"
          >
            Select Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}