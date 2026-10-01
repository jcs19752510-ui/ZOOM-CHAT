import { useSyncExternalStore } from 'react';
import type { MeetingController, MeetingState } from './MeetingController';

export function useMeeting(controller: MeetingController): MeetingState {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
