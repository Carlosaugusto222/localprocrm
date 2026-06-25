import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Badge } from "@/components/ui/badge";

const PLAN_LABEL = { basic: "Básico", pro: "Profissional", premium: "Premium" } as const;

export function OrgSwitcher() {
  const { org, orgs, setCurrent } = useCurrentOrg();
  if (!org) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 max-w-[260px]">
          <Building2 className="size-4 shrink-0" />
          <span className="truncate font-medium">{org.name}</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">{PLAN_LABEL[org.plan]}</Badge>
          <ChevronsUpDown className="size-3.5 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Suas empresas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map(o => (
          <DropdownMenuItem key={o.id} onClick={() => setCurrent(o.id)}>
            <Building2 className="size-4 mr-2" />
            <span className="flex-1 truncate">{o.name}</span>
            {o.id === org.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
