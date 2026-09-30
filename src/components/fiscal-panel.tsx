import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { FileCheck2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { issueFiscalDocument, refreshFiscalDocument } from '@/lib/fiscal.functions';
import { toast } from 'sonner';

type Props = { organizationId: string; originId: string; kind: 'nfce' | 'nfse' };
export function FiscalPanel({ organizationId, originId, kind }: Props) {
  const issue = useServerFn(issueFiscalDocument);
  const refresh = useServerFn(refreshFiscalDocument);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const queryKey = ['fiscal-document', organizationId, kind, originId];
  const { data: document } = useQuery({ queryKey, queryFn: async () => {
    const column = kind === 'nfce' ? 'sale_id' : 'service_order_id';
    const { data, error } = await supabase.from('fiscal_documents').select('id,status,number,pdf_url,xml_url,error_message,environment')
      .eq('organization_id', organizationId).eq(column, originId).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const run = async (action: 'issue' | 'refresh') => {
    setBusy(true);
    try {
      const result = action === 'issue'
        ? await issue({ data: { organizationId, originId, kind } })
        : document ? await refresh({ data: { organizationId, documentId: document.id } }) : null;
      if (result?.document?.status === 'rejected') toast.error(result.message || 'Emissão rejeitada.');
      else if (result?.message) toast.success(result.message);
      await qc.invalidateQueries({ queryKey });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na emissão fiscal.'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <Button variant="outline" size="sm" disabled={busy || document?.status === 'authorized' || document?.status === 'processing' || document?.status === 'pending'} onClick={() => run('issue')}>
      <FileCheck2 className="size-4 mr-1" />Emitir {kind === 'nfce' ? 'NFC-e' : 'NFS-e'}
    </Button>
    {document && <>
      <span className="text-muted-foreground">{document.status === 'authorized' ? `Autorizada${document.number ? ` · Nº ${document.number}` : ''}` : document.status === 'processing' ? 'Em processamento' : document.status === 'pending' ? 'Envio não confirmado' : 'Rejeitada'}{document.environment === 'homologation' ? ' · Homologação' : ''}</span>
      <Button variant="ghost" size="icon" title="Consultar situação da nota" aria-label="Consultar situação da nota" disabled={busy} onClick={() => run('refresh')}><RefreshCw className="size-4" /></Button>
      {document.status === 'authorized' && document.pdf_url && <Button variant="link" size="sm" asChild><a href={document.pdf_url} target="_blank" rel="noopener noreferrer">Documento</a></Button>}
      {document.status === 'authorized' && document.xml_url && <Button variant="link" size="sm" asChild><a href={document.xml_url} target="_blank" rel="noopener noreferrer">XML</a></Button>}
      {document.error_message && <span className="w-full text-destructive text-xs">{document.error_message}</span>}
    </>}
  </div>;
}
