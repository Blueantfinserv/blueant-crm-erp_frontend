import { clientWorkFollowApi } from '../../../api/clientWorkFollow';
import { clientHistoryService } from '../../../services/ClientHistoryService';
import type { ClientMeetingResponse } from '../../../types/crm';
import { mapClientToSalesTask } from './taskMappers';
import { formatDate, formatTimestamp } from './taskDateUtils';
import { getTaskSchedule } from './taskMeetingSelectors';

// Called only for roles with the client workspace; the backend scopes the queue to the session.
export async function loadClientTaskQueue() {
  const scope = clientHistoryService.captureScope();
  const histories = new Map<string, Promise<ClientMeetingResponse[]>>();
  const first = await clientWorkFollowApi.getQueue({ page: 0, size: 100 });
  const rest = await Promise.all(Array.from({ length: Math.max(0, (first.totalPages ?? 1) - 1) }, (_, index) => clientWorkFollowApi.getQueue({ page: index + 1, size: 100 })));
  const clients = [...(first.content ?? []), ...rest.flatMap(page => page.content ?? [])];
  if (!clientHistoryService.isCurrentScope(scope)) throw new Error('Client history account changed.');
  const tasks = await Promise.all(clients.map(async (client, index) => {
    const task = mapClientToSalesTask(client, index);
    const code = client.clientCode;
    if (code && !histories.has(code)) histories.set(code, clientHistoryService.refresh(code, true));
    const meetings = code ? await histories.get(code)! : [];
    const latest = [...meetings].sort((a, b) => String(b.meetingDate ?? '').localeCompare(String(a.meetingDate ?? '')))[0];
    const nextPlanDate = latest?.nextPlanDate ?? task.nextPlanDate;
    const scheduledAt = nextPlanDate ?? task.scheduledAt;
    return { ...task, meetingNumber: latest?.meetingNumber ?? task.meetingNumber,
      remarks: latest?.remarks?.trim() || task.remarks,
      lastUpdated: formatTimestamp(latest?.meetingDate ?? task.assignedAt),
      nextPlanDate, nextFollowUpDate: formatDate(nextPlanDate), scheduledAt,
      schedule: getTaskSchedule(scheduledAt),
      verificationPending: meetings.some(meeting => meeting.verificationStatus === 'PENDING' || meeting.verifiedByPc === false),
    };
  }));
  if (!clientHistoryService.isCurrentScope(scope)) throw new Error('Client history account changed.');
  return tasks;
}
