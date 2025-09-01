// Single shared WebSocket client with simple auto-retry

type Status = "disconnected" | "connecting" | "connected";

let socket: WebSocket | null = null;
let status: Status = "disconnected";
let listeners: ((s: Status) => void)[] = [];
let url = "";

export function onWsStatus(fn: (s: Status)=>void) {
  listeners.push(fn);
  fn(status);
  return () => { listeners = listeners.filter(x => x !== fn); };
}
function setStatus(s: Status) { status = s; listeners.forEach(fn => fn(status)); }

export function connectWs(u: string) {
  url = u;
  if (socket && (status === "connected" || status === "connecting")) return;
  try {
    setStatus("connecting");
    socket = new WebSocket(url);
    socket.onopen = () => setStatus("connected");
    socket.onclose = () => retry();
    socket.onerror = () => retry();
  } catch {
    retry();
  }
}

function retry() {
  setStatus("disconnected");
  if (socket) { try { socket.close(); } catch {} }
  setTimeout(() => { if (url) connectWs(url); }, 1500);
}

export function isConnected() { return status === "connected"; }
export function getStatus(): Status { return status; }