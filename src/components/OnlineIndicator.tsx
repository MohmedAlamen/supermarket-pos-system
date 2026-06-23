import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { onPendingChange, syncPendingSales } from "@/lib/syncService";
import { Badge } from "@/components/ui/badge";

export default function OnlineIndicator() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => onPendingChange(setPending), []);

  return (
    <button
      onClick={() => { if (online && pending > 0) syncPendingSales(); }}
      className="flex items-center gap-1.5 text-xs"
      title={online ? "متصل" : "غير متصل - سيتم المزامنة عند عودة الاتصال"}
    >
      {online ? (
        <Wifi className="h-4 w-4 text-success" />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive" />
      )}
      {pending > 0 && (
        <Badge variant={online ? "secondary" : "destructive"} className="gap-1 px-1.5 py-0 text-[10px]">
          <CloudUpload className="h-3 w-3" />
          {pending}
        </Badge>
      )}
    </button>
  );
}
