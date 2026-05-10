import { useState } from "react";
import { SSRItemSelector } from "../SSRItemSelector";
import { Button } from "@/components/ui/button";

export default function SSRItemSelectorExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open SSR Selector</Button>
      <SSRItemSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={(item) => console.log('Selected:', item)}
      />
    </div>
  );
}
