const BROWSERS = [
  ["Edg/", "Edge"],
  ["OPR/", "Opera"],
  ["Chrome/", "Chrome"],
  ["Firefox/", "Firefox"],
  ["Safari/", "Safari"],
];

const SYSTEMS = [
  ["iPhone", "iPhone"],
  ["iPad", "iPad"],
  ["Android", "Android"],
  ["Mac OS X", "macOS"],
  ["Windows", "Windows"],
  ["Linux", "Linux"],
];

const firstMatch = (agent, list) =>
  list.find(([needle]) => agent.includes(needle))?.[1];

export function deviceLabel(agent) {
  if (!agent) return "Unknown device";
  const browser = firstMatch(agent, BROWSERS) ?? "Browser";
  const system = firstMatch(agent, SYSTEMS);
  return system ? `${browser} on ${system}` : browser;
}
