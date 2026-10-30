import { clientWorkFollowApi } from '../../../api/clientWorkFollow';
import { clientMeetingApi } from '../../../api/clientMeeting';
import { mapClientToSalesTask } from './taskMappers';
import { formatDate, formatTimestamp } from './taskDateUtils';
import { getTaskSchedule } from './taskMeetingSelectors';

// Called only for roles with the client workspace; the backend scopes the queue to the session.
export async function loadClientTaskQueue() {
  const first = await clientWorkFollowApi.getQueue({ page: 0, size: 100 });
  const rest = await Promise.all(Array.from({ length: Math.max(0, (first.totalPages ?? 1) - 1) }, (_, index) => clientWorkFollowApi.getQueue({ page: index + 1, size: 100 })));
  const clients = [...(first.content ?? []), ...rest.flatMap(page => page.content ?? [])];
  return Promise.all(clients.map(async (client, index) => {
    const task = mapClientToSalesTask(client, index);
    const meetings = client.clientCode ? await clientMeetingApi.getByClientCode(client.clientCode) : [];
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
}
