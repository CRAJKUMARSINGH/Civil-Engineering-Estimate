import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { api } from "@/lib/api";
import { SSRItem, HierarchicalSSRItem } from "@shared/schema";

interface SSRItemSelectorConnectedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: SSRItem) => void;
}

export function SSRItemSelectorConnected({ open, onOpenChange, onSelect }: SSRItemSelectorConnectedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SSRItem | null>(null);
  const [viewMode, setViewMode] = useState<"flat" | "hierarchical">("flat");

  const { data: ssrItems = [], isLoading } = useQuery<SSRItem[]>({
    queryKey: ['/api/ssr-items'],
    queryFn: () => api.getSSRItems(),
  });

  const { data: hierarchicalSSRItems = [], isLoading: isHierarchicalLoading } = useQuery<HierarchicalSSRItem[]>({
    queryKey: ['/api/hierarchical-ssr-items'],
    queryFn: () => api.getHierarchicalSSRItems(),
    enabled: viewMode === "hierarchical",
  });

  const itemsToDisplay = viewMode === "hierarchical" ? hierarchicalSSRItems : ssrItems;
  const isLoadingItems = viewMode === "hierarchical" ? isHierarchicalLoading : isLoading;

  const filteredItems = itemsToDisplay.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
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
            {isLoadingItems ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading SSR items...
              </div>
            ) : (
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
                        {viewMode === "hierarchical" && 'level' in item ? (
                          <div className="flex items-start">
                            <div className="flex gap-1 mr-2 mt-1">
                              {Array.from({ length: (item as HierarchicalSSRItem).indentLevel }).map((_, i) => (
                                <div key={i} className="w-3 h-3 border-r border-b border-gray-400"></div>
                              ))}
                            </div>
                            <div>
                              <div>{item.description}</div>
                              {(item as HierarchicalSSRItem).level > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Parent: {(item as HierarchicalSSRItem).hierarchy.slice(0, -1).join(' > ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          item.description
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {parseFloat(item.rate).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
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
            Insert SSR Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}