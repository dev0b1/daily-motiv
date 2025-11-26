import EventEmitter from 'events';

const emitter = new EventEmitter();

export function publishEvent(taskId: string, data: any) {
  try {
    console.debug('[sse] publishEvent', { taskId, dataType: typeof data, preview: JSON.stringify(data).slice(0, 200) });
    emitter.emit(taskId, data);
  } catch (e) {
    console.warn('publishEvent error', e);
  }
}

export function subscribe(taskId: string, handler: (data: any) => void) {
  console.debug('[sse] subscribe', { taskId });
  emitter.on(taskId, handler);
  return () => {
    console.debug('[sse] unsubscribe', { taskId });
    emitter.off(taskId, handler);
  };
}

export default emitter;
