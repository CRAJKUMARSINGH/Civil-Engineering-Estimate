import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calculator } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableRow {
  serial: number;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
  amount: string;
}

const mockData: TableRow[] = [
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
  {
    serial: 3,
    description: "Reinforced Cement Concrete M20",
    unit: "cum",
    quantity: "75.00",
    rate: "6,800.00",
    amount: "5,10,000.00",
  },
];

export function ExcelTable() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Cost Abstract - Part 1</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => console.log('Add row')}
              data-testid="button-add-row"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => console.log('Insert SSR Item')}
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
              {mockData.map((row) => (
                <TableRow key={row.serial}>
                  <TableCell className="text-center font-mono text-sm">
                    {row.serial}
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={row.description}
                      className="border-0 p-0 h-auto focus-visible:ring-0"
                      data-testid={`input-description-${row.serial}`}
                    />
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
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      defaultValue={row.rate}
                      className="border-0 p-0 h-auto focus-visible:ring-0 text-right font-mono"
                      data-testid={`input-rate-${row.serial}`}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.amount}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => console.log('Delete row:', row.serial)}
                      data-testid={`button-delete-${row.serial}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted">
                <TableCell colSpan={5} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right font-mono">
                  ₹7,50,000.00
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
