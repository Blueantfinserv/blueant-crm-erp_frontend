import type { ClientProfileResponse } from '../types/crm';
import type { CrmClientPage } from '../api/crmAssignment';

export const CRM_ASSIGNED_CLIENT_PAGE_SIZE = 100;
export const assignedClientPageRows = <T,>(rows: readonly T[], page: number) => rows.slice(page * 100, (page + 1) * 100);

// Owned by one screen/account. Normal browsing reads only enough 100-record
// pages for the requested screen page. Global search scans the remaining pages
// on demand because this endpoint has no name/PAN search parameter.
export class CrmAssignedClientPages {
  private pages = new Map<number, CrmClientPage>();
  private totalPages = 1;
  private totalElements: number | undefined;
  constructor(private fetchPage: (page: number) => Promise<CrmClientPage>) {}

  getSnapshot() {
    const seen = new Set<string>();
    const clients = [...this.pages.entries()].sort(([left], [right]) => left - right)
      .flatMap(([, page]) => page.content)
      .filter(client => Boolean((client.salesPersonCode ?? client.assignedSalesPersonCode)?.trim()))
      .filter(client => {
        const key = client.clientCode || (client.id !== undefined ? `id:${client.id}` : '');
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    return { clients, totalElements: this.totalElements, complete: this.pages.size >= this.totalPages };
  }

  async load(count: number, valid: () => boolean, onPage: (snapshot: ReturnType<CrmAssignedClientPages['getSnapshot']>) => void) {
    if (!valid()) return;
    const existing = this.getSnapshot();
    if (existing.complete || existing.clients.length >= count) { onPage(existing); return; }
    for (let pageNumber = 0; pageNumber < this.totalPages && valid(); pageNumber++) {
      if (this.pages.has(pageNumber)) continue;
      const page = await this.fetchPage(pageNumber);
      if (!valid()) return;
      this.totalPages = Math.max(1, page.totalPages);
      this.totalElements = page.totalElements ?? this.totalElements;
      this.pages.set(pageNumber, page);
      const snapshot = this.getSnapshot();
      onPage(snapshot);
      if (snapshot.clients.length >= count) break;
    }
  }
}
