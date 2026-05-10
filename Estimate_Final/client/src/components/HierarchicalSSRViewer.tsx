import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, ChevronDown, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { HierarchicalSSRItem } from "@shared/schema";

interface TreeNode {
  item: HierarchicalSSRItem;
  children: TreeNode[];
  isExpanded: boolean;
}

export function HierarchicalSSRViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: hierarchicalItems = [], isLoading } = useQuery<HierarchicalSSRItem[]>({
    queryKey: ['/api/hierarchical-ssr-items'],
    queryFn: () => api.getHierarchicalSSRItems(),
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Build tree structure from flat hierarchical items
  const buildTree = (items: HierarchicalSSRItem[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create all nodes
    items.forEach(item => {
      nodeMap.set(item.id, {
        item,
        children: [],
        isExpanded: expandedNodes.has(item.id),
      });
    });

    // Build parent-child relationships
    items.forEach(item => {
      const node = nodeMap.get(item.id)!;
      if (item.parentCode) {
        const parent = Array.from(nodeMap.values()).find(n => n.item.code === item.parentCode);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  const treeNodes = buildTree(hierarchicalItems);

  const filteredTreeNodes = treeNodes.filter(node => {
    const matchesSearch = node.item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.item.id);

    return (
      <div key={node.item.id} className="mb-1">
        <div 
          className={`flex items-center py-2 px-2 rounded hover:bg-accent cursor-pointer ${level > 0 ? 'ml-4' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.item.id)}
        >
          {hasChildren ? (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center mr-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm truncate">{node.item.code}</span>
              <Badge variant="secondary" className="text-xs">
                {node.item.level === 0 ? 'Main' : `Level ${node.item.level}`}
              </Badge>
            </div>
            <div className="text-sm truncate mt-1">{node.item.description}</div>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            <Badge variant="outline" className="text-xs">
              {node.item.unit}
            </Badge>
            <span className="font-mono text-sm w-20 text-right">
              ₹{parseFloat(node.item.rate).toFixed(2)}
            </span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-l ml-4 pl-2">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hierarchical SSR Items</CardTitle>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            Analyze BSR
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading hierarchical SSR items...
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            {filteredTreeNodes.length > 0 ? (
              filteredTreeNodes.map(node => renderTreeNode(node))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No hierarchical SSR items found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}